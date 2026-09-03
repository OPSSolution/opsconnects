// Derives all the dashboard's live-data views (stat tiles, per-channel
// metrics, weekly chart, monthly report, recent activity) from the partner's
// actual messages + channel_configs rows. Replaces what used to be hardcoded
// sample data in src/mocks/dashboard.ts.

export interface MessageRow {
  channel: string;
  direction: "inbound" | "outbound";
  sender_id: string;
  sender_name: string | null;
  status: string;
  created_at: string;
}

export interface ChannelConfigRow {
  channel_id: string;
  created_at: string;
}

export interface DashboardStat { value: string; label: string; icon: string; trend: string }
export interface ChannelMetric { connectedSince: string; messagesToday: number; totalMessages: number; avgResponseTime: string }
export interface TrendPoint { day: string; value: number }
export interface MonthlyReportEntry { totalMessages: number; delivered: number; avgResponseMin: number; peakHours: string; topCustomer: string }
export interface ActivityItem { channel: string; event: string; customer: string; time: string }

export interface DashboardAnalytics {
  stats: DashboardStat[];
  channelMetrics: Record<string, ChannelMetric>;
  analyticsTrends: Record<string, TrendPoint[]>;
  monthlyReportData: Record<string, MonthlyReportEntry>;
  recentActivity: ActivityItem[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

function fmtHour12(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${period}`;
}

// Average time from an inbound message to the next outbound message from the
// same sender ("first response time"), in minutes. Rows should already be
// scoped to one channel (and usually one time window) before calling this.
function avgFirstResponseMinutes(rows: MessageRow[]): number | null {
  const bySender = new Map<string, MessageRow[]>();
  for (const r of rows) {
    const list = bySender.get(r.sender_id);
    if (list) list.push(r); else bySender.set(r.sender_id, [r]);
  }

  const deltas: number[] = [];
  for (const msgs of bySender.values()) {
    const sorted = [...msgs].sort((a, b) => a.created_at.localeCompare(b.created_at));
    let pendingInboundAt: number | null = null;
    for (const m of sorted) {
      const t = new Date(m.created_at).getTime();
      if (m.direction === "inbound") {
        if (pendingInboundAt === null) pendingInboundAt = t;
      } else if (pendingInboundAt !== null) {
        deltas.push((t - pendingInboundAt) / 60000);
        pendingInboundAt = null;
      }
    }
  }
  if (deltas.length === 0) return null;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes < 10 ? minutes.toFixed(1) : Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(1)} hr`;
}

export function computeDashboardAnalytics(
  allMessages: MessageRow[],
  channelConfigs: ChannelConfigRow[],
  connectedChannelIds: string[],
): DashboardAnalytics {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - DAY_MS;
  const weekAgoStart = todayStart - 6 * DAY_MS; // rolling 7-day window including today
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const configByChannel = new Map(channelConfigs.map((c) => [c.channel_id, c]));

  // ── top stat tiles ──
  const messagesToday = allMessages.filter((m) => new Date(m.created_at).getTime() >= todayStart).length;
  const messagesYesterday = allMessages.filter((m) => {
    const t = new Date(m.created_at).getTime();
    return t >= yesterdayStart && t < todayStart;
  }).length;
  const messagesTodayTrend = messagesYesterday > 0
    ? `${messagesToday >= messagesYesterday ? "+" : ""}${Math.round(((messagesToday - messagesYesterday) / messagesYesterday) * 100)}% vs yesterday`
    : messagesToday > 0 ? "First activity today" : "No messages yet today";

  const newChannelsThisWeek = connectedChannelIds.filter((id) => {
    const cfg = configByChannel.get(id);
    return cfg && new Date(cfg.created_at).getTime() >= weekAgoStart;
  }).length;

  const recentBySender = new Map<string, MessageRow[]>();
  for (const m of allMessages) {
    if (new Date(m.created_at).getTime() < weekAgoStart) continue;
    const list = recentBySender.get(m.sender_id);
    if (list) list.push(m); else recentBySender.set(m.sender_id, [m]);
  }
  let awaitingReply = 0;
  for (const msgs of recentBySender.values()) {
    const last = [...msgs].sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
    if (last?.direction === "inbound") awaitingReply++;
  }
  const activeConversations = recentBySender.size;

  const bySenderAll = new Map<string, { hasInbound: boolean; hasOutbound: boolean }>();
  for (const m of allMessages) {
    const e = bySenderAll.get(m.sender_id) ?? { hasInbound: false, hasOutbound: false };
    if (m.direction === "inbound") e.hasInbound = true; else e.hasOutbound = true;
    bySenderAll.set(m.sender_id, e);
  }
  const withInbound = [...bySenderAll.values()].filter((e) => e.hasInbound);
  const responseRate = withInbound.length > 0
    ? (withInbound.filter((e) => e.hasOutbound).length / withInbound.length) * 100
    : 0;

  const stats: DashboardStat[] = [
    {
      value: String(connectedChannelIds.length), label: "Connected Channels", icon: "ri-link",
      trend: newChannelsThisWeek > 0 ? `+${newChannelsThisWeek} this week` : "No change this week",
    },
    { value: messagesToday.toLocaleString(), label: "Messages Today", icon: "ri-message-3-line", trend: messagesTodayTrend },
    {
      value: activeConversations.toLocaleString(), label: "Active Conversations", icon: "ri-chat-3-line",
      trend: `${awaitingReply} awaiting reply`,
    },
    { value: `${responseRate.toFixed(1)}%`, label: "Response Rate", icon: "ri-thumb-up-line", trend: "All time" },
  ];

  // ── per-channel metrics / weekly trend / monthly report ──
  const channelMetrics: Record<string, ChannelMetric> = {};
  const analyticsTrends: Record<string, TrendPoint[]> = {};
  const monthlyReportData: Record<string, MonthlyReportEntry> = {};

  const jsDay = now.getDay(); // 0=Sun..6=Sat
  const daysSinceMonday = (jsDay + 6) % 7;
  const mondayStart = todayStart - daysSinceMonday * DAY_MS;

  for (const channelId of connectedChannelIds) {
    const rows = allMessages.filter((m) => m.channel === channelId);
    const cfg = configByChannel.get(channelId);

    channelMetrics[channelId] = {
      connectedSince: cfg ? fmtDate(cfg.created_at) : "recently",
      messagesToday: rows.filter((m) => new Date(m.created_at).getTime() >= todayStart).length,
      totalMessages: rows.length,
      avgResponseTime: (() => {
        const avg = avgFirstResponseMinutes(rows);
        return avg !== null ? formatDuration(avg) : "No data yet";
      })(),
    };

    analyticsTrends[channelId] = WEEK_LABELS.map((label, i) => {
      const dayStart = mondayStart + i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const value = rows.filter((m) => {
        const t = new Date(m.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      return { day: label, value };
    });

    const monthRows = rows.filter((m) => new Date(m.created_at).getTime() >= monthStart);
    const outboundMonth = monthRows.filter((m) => m.direction === "outbound");
    const deliveredCount = outboundMonth.filter((m) => m.status === "delivered" || m.status === "read").length;
    const monthAvgResp = avgFirstResponseMinutes(monthRows);

    const hourCounts = new Array(24).fill(0) as number[];
    for (const m of monthRows) hourCounts[new Date(m.created_at).getHours()]++;
    let peakHour = 0, peakSum = -1;
    for (let h = 0; h < 24; h++) {
      const sum = hourCounts[h] + hourCounts[(h + 1) % 24];
      if (sum > peakSum) { peakSum = sum; peakHour = h; }
    }
    const peakHours = monthRows.length > 0
      ? `${fmtHour12(peakHour)} - ${fmtHour12((peakHour + 2) % 24)} local`
      : "No data yet";

    const countBySender = new Map<string, { name: string; count: number }>();
    for (const m of monthRows) {
      const e = countBySender.get(m.sender_id) ?? { name: m.sender_name || m.sender_id, count: 0 };
      e.count++;
      countBySender.set(m.sender_id, e);
    }
    const top = [...countBySender.values()].sort((a, b) => b.count - a.count)[0];

    monthlyReportData[channelId] = {
      totalMessages: monthRows.length,
      delivered: deliveredCount,
      avgResponseMin: monthAvgResp !== null ? Math.round(monthAvgResp * 10) / 10 : 0,
      peakHours,
      topCustomer: top?.name || "N/A",
    };
  }

  // ── recent activity feed ──
  const recentActivity: ActivityItem[] = [...allMessages]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
    .map((m) => ({
      channel: m.channel,
      event: m.direction === "inbound" ? "New message received" : "Reply sent",
      customer: m.sender_name || m.sender_id,
      time: relativeTime(m.created_at),
    }));

  return { stats, channelMetrics, analyticsTrends, monthlyReportData, recentActivity };
}
