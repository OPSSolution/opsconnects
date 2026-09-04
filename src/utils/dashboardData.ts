import { supabase } from "./supabase/client";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ChannelMetric {
  connectedSince: string | null;
  messagesToday: number;
  totalMessages: number;
}

export interface MonthlyChannelReport {
  totalMessages: number;
  vsLastMonthPct: number | null;
  peakHour: string;
  topContact: string;
}

export interface LiveChatPerf {
  totalChats: number;
  closedChats: number;
  avgResponseMin: number | null;
  avgRating: number | null;
  ratedCount: number;
}

export interface ActivityItem {
  channel: string;
  event: string;
  customer: string;
  created_at: string;
}

export interface DashboardMetrics {
  messagesToday: number;
  messagesYesterday: number;
  activeConversations: number;
  waitingConversations: number;
  resolvedRequests: number;
  totalRequests: number;
  channelMetrics: Record<string, ChannelMetric>;
  weeklyTrends: Record<string, { day: string; value: number }[]>;
  monthlyReport: Record<string, MonthlyChannelReport>;
  liveChatPerf: LiveChatPerf | null;
  recentActivity: ActivityItem[];
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function fmtHour(h: number) { return h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`; }

export async function getDashboardMetrics(
  partnerDbId: string,
  partnerId: string,
  channelIds: string[],
): Promise<DashboardMetrics> {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - DAY_MS);
  const sevenDaysAgo = new Date(today.getTime() - 7 * DAY_MS);
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const historyStart = new Date(Math.min(sevenDaysAgo.getTime(), lastMonthStart.getTime()));

  const [messagesRes, allTimeCounts, channelConfigsRes, liveChatsRes, supportRes] = await Promise.all([
    supabase.from("messages")
      .select("channel, sender_name, content, direction, created_at")
      .eq("partner_id", partnerDbId)
      .gte("created_at", historyStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
    Promise.all(channelIds.map((id) =>
      supabase.from("messages").select("*", { count: "exact", head: true })
        .eq("partner_id", partnerDbId).eq("channel", id)
        .then(({ count }) => [id, count ?? 0] as const)
    )),
    supabase.from("channel_configs").select("channel_id, created_at").eq("partner_id", partnerId),
    supabase.from("live_chats").select("id, status, rating, created_at").eq("partner_id", partnerId),
    supabase.from("support_requests").select("status").eq("partner_id", partnerId),
  ]);

  const messages = messagesRes.data ?? [];
  const totalByChannel = new Map(allTimeCounts);
  const connectedSinceByChannel = new Map((channelConfigsRes.data ?? []).map((c) => [c.channel_id as string, c.created_at as string]));

  // ── Today / yesterday totals ────────────────────────────────────────────
  let messagesToday = 0, messagesYesterday = 0;
  for (const m of messages) {
    const t = new Date(m.created_at as string);
    if (t >= today) messagesToday++;
    else if (t >= yesterday) messagesYesterday++;
  }

  // ── Per-channel today count + weekly trend buckets ─────────────────────
  const channelMetrics: Record<string, ChannelMetric> = {};
  const weeklyTrends: Record<string, { day: string; value: number }[]> = {};
  for (const id of channelIds) {
    channelMetrics[id] = {
      connectedSince: connectedSinceByChannel.get(id) ?? null,
      messagesToday: 0,
      totalMessages: totalByChannel.get(id) ?? 0,
    };
    weeklyTrends[id] = WEEKDAYS.slice(1).concat(WEEKDAYS[0]).map((day) => ({ day, value: 0 })); // Mon..Sun order
  }
  for (const m of messages) {
    const channel = m.channel as string;
    const t = new Date(m.created_at as string);
    if (!channelMetrics[channel]) continue;
    if (t >= today) channelMetrics[channel].messagesToday++;
    if (t >= sevenDaysAgo) {
      const dayName = WEEKDAYS[t.getDay()];
      const bucket = weeklyTrends[channel].find((d) => d.day === dayName);
      if (bucket) bucket.value++;
    }
  }

  // ── Monthly report per channel: this month total, vs last month, peak hour, top contact ──
  const monthlyReport: Record<string, MonthlyChannelReport> = {};
  for (const id of channelIds) {
    const thisMonthMsgs = messages.filter((m) => m.channel === id && new Date(m.created_at as string) >= thisMonthStart);
    const lastMonthMsgs = messages.filter((m) => {
      if (m.channel !== id) return false;
      const t = new Date(m.created_at as string);
      return t >= lastMonthStart && t < thisMonthStart;
    });
    const hourCounts = new Array(24).fill(0);
    const contactCounts = new Map<string, number>();
    thisMonthMsgs.forEach((m) => {
      hourCounts[new Date(m.created_at as string).getHours()]++;
      const name = (m.sender_name as string | null) || "Unknown";
      contactCounts.set(name, (contactCounts.get(name) ?? 0) + 1);
    });
    const peakHourIdx = hourCounts.indexOf(Math.max(...hourCounts));
    const topContact = [...contactCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    monthlyReport[id] = {
      totalMessages: thisMonthMsgs.length,
      vsLastMonthPct: lastMonthMsgs.length > 0 ? ((thisMonthMsgs.length - lastMonthMsgs.length) / lastMonthMsgs.length) * 100 : null,
      peakHour: thisMonthMsgs.length > 0 ? fmtHour(peakHourIdx) : "—",
      topContact,
    };
  }

  // ── Live chats: active/waiting counts + performance ─────────────────────
  const liveChats = liveChatsRes.data ?? [];
  const activeConversations = liveChats.filter((c) => c.status === "waiting" || c.status === "active").length;
  const waitingConversations = liveChats.filter((c) => c.status === "waiting").length;

  let liveChatPerf: LiveChatPerf | null = null;
  if (liveChats.length > 0) {
    const rated = liveChats.filter((c) => c.rating != null);
    const avgRating = rated.length > 0 ? rated.reduce((s, c) => s + (c.rating as number), 0) / rated.length : null;
    const closedChats = liveChats.filter((c) => c.status === "closed").length;

    const recentChatIds = liveChats
      .slice()
      .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
      .slice(0, 100)
      .map((c) => c.id as string);

    let avgResponseMin: number | null = null;
    if (recentChatIds.length > 0) {
      const { data: chatMsgs } = await supabase
        .from("live_chat_messages")
        .select("chat_id, role, created_at")
        .in("chat_id", recentChatIds)
        .order("created_at", { ascending: true });

      const byChat = new Map<string, { role: string; created_at: string }[]>();
      (chatMsgs ?? []).forEach((m) => {
        const arr = byChat.get(m.chat_id as string) ?? [];
        arr.push(m as { role: string; created_at: string });
        byChat.set(m.chat_id as string, arr);
      });

      const responseTimes: number[] = [];
      byChat.forEach((msgs) => {
        const firstVisitor = msgs.find((m) => m.role === "visitor");
        if (!firstVisitor) return;
        const firstAgentAfter = msgs.find((m) => m.role === "agent" && new Date(m.created_at) > new Date(firstVisitor.created_at));
        if (!firstAgentAfter) return;
        responseTimes.push((new Date(firstAgentAfter.created_at).getTime() - new Date(firstVisitor.created_at).getTime()) / 60000);
      });
      if (responseTimes.length > 0) avgResponseMin = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    liveChatPerf = { totalChats: liveChats.length, closedChats, avgResponseMin, avgRating, ratedCount: rated.length };
  }

  // ── Support requests ─────────────────────────────────────────────────
  const requests = supportRes.data ?? [];
  const resolvedRequests = requests.filter((r) => r.status === "resolved").length;

  // ── Recent activity feed ────────────────────────────────────────────
  const recentActivity: ActivityItem[] = messages.slice(0, 8).map((m) => ({
    channel: m.channel as string,
    event: m.direction === "outbound" ? "Reply sent" : "New message received",
    customer: (m.sender_name as string | null) || "Unknown contact",
    created_at: m.created_at as string,
  }));

  return {
    messagesToday,
    messagesYesterday,
    activeConversations,
    waitingConversations,
    resolvedRequests,
    totalRequests: requests.length,
    channelMetrics,
    weeklyTrends,
    monthlyReport,
    liveChatPerf,
    recentActivity,
  };
}
