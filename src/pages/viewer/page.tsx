import { Fragment, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "@/utils/auth";
import { supabase } from "@/utils/supabase/client";

type Chat = {
  id: string;
  visitor_name: string;
  visitor_contact: string;
  initial_message: string | null;
  status: string;
  assigned_agent: string | null;
  created_at: string;
};

type MsgRow = {
  id: string;
  chat_id: string;
  role: "visitor" | "agent" | "ai";
  sender_name: string | null;
  content: string;
  created_at: string;
};

type AgentStat = { name: string; messages: number; chats: number };
type ChatSupportMeta = {
  agentNames: string[];
  messageCount: number;
  supportedAt: string | null;
};

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function escapeCsv(val: string | null | undefined) {
  const s = String(val ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ViewerDashboard() {
  const navigate = useNavigate();
  const [partnerName, setPartnerName] = useState("");
  const [viewerName, setViewerName]   = useState("");
  const [partnerId, setPartnerId]     = useState("");

  const [chats, setChats]       = useState<Chat[]>([]);
  const [msgs, setMsgs]         = useState<MsgRow[]>([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [supportedFrom, setSupportedFrom] = useState("");
  const [supportedTo, setSupportedTo]     = useState("");
  const [agentFilter, setAgentFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]     = useState("");
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [tab, setTab]           = useState<"overview" | "history" | "agents">("overview");

  useEffect(() => {
    getSession().then((s) => {
      if (!s) { navigate("/login", { replace: true }); return; }
      if (s.role !== "viewer") { navigate(s.role === "admin" ? "/admin" : s.role === "agent" ? "/agent" : "/dashboard", { replace: true }); return; }
      setPartnerName(s.partnerName);
      setViewerName(s.agentName ?? s.email);
      setPartnerId(s.partnerId);
    });
  }, []);

  const load = useCallback(async (pid: string) => {
    setLoading(true);
    const { data: chatData } = await supabase
      .from("live_chats")
      .select("id, visitor_name, visitor_contact, initial_message, status, assigned_agent, created_at")
      .eq("partner_id", pid)
      .order("created_at", { ascending: false });

    const allChats = (chatData ?? []) as Chat[];
    setChats(allChats);

    if (allChats.length > 0) {
      const ids = allChats.map((c) => c.id);
      const { data: msgData } = await supabase
        .from("live_chat_messages")
        .select("id, chat_id, role, sender_name, content, created_at")
        .in("chat_id", ids)
        .order("created_at", { ascending: true });
      setMsgs((msgData ?? []) as MsgRow[]);
    } else {
      setMsgs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (partnerId) load(partnerId);
  }, [partnerId, load]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const total   = chats.length;
  const waiting = chats.filter((c) => c.status === "waiting").length;
  const active  = chats.filter((c) => c.status === "active").length;
  const closed  = chats.filter((c) => c.status === "closed").length;

  const aiMsgCount     = msgs.filter((m) => m.role === "ai").length;
  const agentMsgCount  = msgs.filter((m) => m.role === "agent").length;
  const visitorMsgCount = msgs.filter((m) => m.role === "visitor").length;

  // Chats that had at least one agent reply
  const liveHandled = new Set(msgs.filter((m) => m.role === "agent").map((m) => m.chat_id)).size;
  const aiOnlyChats = total - liveHandled;

  // Agent performance
  const agentMap = new Map<string, AgentStat>();
  msgs.filter((m) => m.role === "agent").forEach((m) => {
    const key = m.sender_name || "Agent";
    const existing = agentMap.get(key) ?? { name: key, messages: 0, chats: 0 };
    existing.messages += 1;
    agentMap.set(key, existing);
  });
  // Count distinct chats per agent
  const agentChatMap = new Map<string, Set<string>>();
  msgs.filter((m) => m.role === "agent").forEach((m) => {
    const name = m.sender_name || "Agent";
    if (!agentChatMap.has(name)) agentChatMap.set(name, new Set());
    agentChatMap.get(name)!.add(m.chat_id);
  });
  const agentStats: AgentStat[] = Array.from(agentMap.values()).map((a) => ({
    ...a,
    chats: agentChatMap.get(a.name)?.size ?? 0,
  })).sort((a, b) => b.messages - a.messages);

  // Chats per day (last 14 days)
  const now = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const chatsByDay = days.map((day) => ({
    day,
    count: chats.filter((c) => c.created_at.slice(0, 10) === day).length,
  }));
  const maxDay = Math.max(...chatsByDay.map((d) => d.count), 1);

  const messagesByChat = msgs.reduce((acc, msg) => {
    const list = acc.get(msg.chat_id) ?? [];
    list.push(msg);
    acc.set(msg.chat_id, list);
    return acc;
  }, new Map<string, MsgRow[]>());

  const chatSupport = chats.reduce((acc, chat) => {
    const chatMsgs = messagesByChat.get(chat.id) ?? [];
    const agentMsgs = chatMsgs.filter((m) => m.role === "agent");
    const agentNames = Array.from(new Set([
      ...(chat.assigned_agent ? [chat.assigned_agent] : []),
      ...agentMsgs.map((m) => m.sender_name || "Agent"),
    ])).filter(Boolean);

    acc.set(chat.id, {
      agentNames,
      messageCount: chatMsgs.length,
      supportedAt: agentMsgs[0]?.created_at ?? null,
    });
    return acc;
  }, new Map<string, ChatSupportMeta>());

  const agentOptions = Array.from(new Set(
    chats.flatMap((chat) => chatSupport.get(chat.id)?.agentNames ?? [])
  )).sort((a, b) => a.localeCompare(b));

  // ── Filtered chat history ───────────────────────────────────────────────────
  const filtered = chats.filter((c) => {
    const supportMeta = chatSupport.get(c.id);
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (agentFilter !== "all" && !supportMeta?.agentNames.includes(agentFilter)) return false;
    if (dateFrom && c.created_at < dateFrom) return false;
    if (dateTo   && c.created_at > dateTo + "T23:59:59") return false;
    if (supportedFrom && (!supportMeta?.supportedAt || supportMeta.supportedAt < supportedFrom)) return false;
    if (supportedTo && (!supportMeta?.supportedAt || supportMeta.supportedAt > supportedTo)) return false;
    if (search) {
      const q = search.toLowerCase();
      const chatMsgs = messagesByChat.get(c.id) ?? [];
      const matchesThread = chatMsgs.some((m) => m.content.toLowerCase().includes(q) || (m.sender_name ?? "").toLowerCase().includes(q));
      if (!c.visitor_name.toLowerCase().includes(q) && !c.visitor_contact.toLowerCase().includes(q) && !matchesThread) return false;
    }
    return true;
  });

  // ── Exports ──────────────────────────────────────────────────────────────────
  const exportChatsCSV = () => {
    const headers = ["Date", "Visitor Name", "Contact", "Status", "Support Agent", "Date/Time Supported", "Initial Message", "Messages Count"];
    const rows = filtered.map((c) => {
      const supportMeta = chatSupport.get(c.id);
      return [
        fmtDate(c.created_at),
        c.visitor_name,
        c.visitor_contact,
        c.status,
        supportMeta?.agentNames.join(" / ") || "",
        supportMeta?.supportedAt ? fmtDateTime(supportMeta.supportedAt) : "",
        c.initial_message ?? "",
        String(supportMeta?.messageCount ?? 0),
      ].map(escapeCsv).join(",");
    });
    downloadFile([headers.map(escapeCsv).join(","), ...rows].join("\n"), `chat-history-${partnerId}.csv`, "text/csv;charset=utf-8;");
  };

  const exportAgentsCSV = () => {
    const headers = ["Agent Name", "Chats Handled", "Messages Sent"];
    const rows = agentStats.map((a) => [a.name, String(a.chats), String(a.messages)].map(escapeCsv).join(","));
    downloadFile([headers.map(escapeCsv).join(","), ...rows].join("\n"), `agent-report-${partnerId}.csv`, "text/csv;charset=utf-8;");
  };

  const handleSignOut = async () => {
    await clearSession();
    navigate("/login", { replace: true });
  };

  // ── Stat card ────────────────────────────────────────────────────────────────
  const StatCard = ({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) => (
    <div className="bg-background-100 rounded-xl border border-background-200/70 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-foreground-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-background-200/70 bg-background-100/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-heading text-base md:text-lg font-bold text-foreground-950 flex-shrink-0">
            OPS<span className="text-primary-500">Connect</span>
          </span>
          <span className="text-foreground-300 hidden sm:inline">|</span>
          <span className="text-xs sm:text-sm text-foreground-500 truncate hidden sm:inline">Analytics — {partnerName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0" />
            <span className="text-xs text-foreground-600 font-medium hidden sm:inline">{viewerName}</span>
          </span>
          <button onClick={handleSignOut} className="text-xs text-foreground-400 hover:text-foreground-700 transition-colors cursor-pointer px-2.5 py-1.5 rounded-md border border-background-200/70">
            Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6">
        {/* Page title + refresh */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground-950">Reports & Analytics</h1>
            <p className="text-sm text-foreground-400 mt-0.5">{partnerName} · Read-only view</p>
          </div>
          <button
            onClick={() => partnerId && load(partnerId)}
            className="text-xs font-medium text-foreground-500 hover:text-foreground-700 border border-background-200/70 px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <i className="ri-refresh-line"></i> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-background-100 p-1 rounded-xl border border-background-200/70 w-fit">
          {(["overview", "history", "agents"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${tab === t ? "bg-background-50 text-foreground-950 shadow-sm" : "text-foreground-500 hover:text-foreground-700"}`}
            >
              {t === "overview" ? "Overview" : t === "history" ? "Chat History" : "Agent Report"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-6 h-6 border-2 border-primary-400 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ────────────────────────────────────────────────── */}
            {tab === "overview" && (
              <div className="space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Chats"   value={total}   sub="all time"         color="text-foreground-950" />
                  <StatCard label="Waiting"        value={waiting} sub="need attention"   color="text-yellow-600" />
                  <StatCard label="Active"         value={active}  sub="in progress"      color="text-green-600" />
                  <StatCard label="Resolved"       value={closed}  sub="closed sessions"  color="text-primary-600" />
                </div>

                {/* AI vs Live Agent */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background-100 rounded-xl border border-background-200/70 p-5">
                    <h3 className="text-sm font-semibold text-foreground-800 mb-4">Conversation Type</h3>
                    <div className="space-y-3">
                      {[
                        { label: "AI Chatbot only", count: aiOnlyChats, color: "bg-accent-500", total },
                        { label: "Live Agent handled", count: liveHandled, color: "bg-primary-500", total },
                      ].map(({ label, count, color, total: t }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-foreground-600">{label}</span>
                            <span className="font-semibold text-foreground-800">{count} <span className="text-foreground-400 font-normal">({t > 0 ? Math.round(count / t * 100) : 0}%)</span></span>
                          </div>
                          <div className="h-2 bg-background-200 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${t > 0 ? (count / t) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-background-100 rounded-xl border border-background-200/70 p-5">
                    <h3 className="text-sm font-semibold text-foreground-800 mb-4">Message Breakdown</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Visitor messages",    count: visitorMsgCount, color: "bg-background-400" },
                        { label: "AI responses",        count: aiMsgCount,      color: "bg-accent-500" },
                        { label: "Agent replies",       count: agentMsgCount,   color: "bg-primary-500" },
                      ].map(({ label, count, color }) => {
                        const t = visitorMsgCount + aiMsgCount + agentMsgCount;
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-foreground-600">{label}</span>
                              <span className="font-semibold text-foreground-800">{count}</span>
                            </div>
                            <div className="h-2 bg-background-200 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${t > 0 ? (count / t) * 100 : 0}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 14-day chart */}
                <div className="bg-background-100 rounded-xl border border-background-200/70 p-5">
                  <h3 className="text-sm font-semibold text-foreground-800 mb-4">Chats — Last 14 Days</h3>
                  <div className="flex items-end gap-1 h-28">
                    {chatsByDay.map(({ day, count }) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-primary-500 rounded-t-sm transition-all hover:bg-primary-600"
                          style={{ height: `${(count / maxDay) * 100}%`, minHeight: count > 0 ? "4px" : "0" }}
                        />
                        {count > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] bg-foreground-900 text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {count}
                          </span>
                        )}
                        <span className="text-[8px] text-foreground-400 rotate-45 origin-left mt-1 hidden md:block">
                          {new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── CHAT HISTORY ─────────────────────────────────────────────── */}
            {tab === "history" && (
              <div>
                {/* Filters */}
                <div className="bg-background-100 rounded-xl border border-background-200/70 p-4 mb-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">From</label>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">To</label>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                        className="bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Support Agent</label>
                      <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
                        className="bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 cursor-pointer appearance-none">
                        <option value="all">All agents</option>
                        {agentOptions.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Status</label>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 cursor-pointer appearance-none">
                        <option value="all">All</option>
                        <option value="waiting">Waiting</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Supported From</label>
                      <input type="datetime-local" value={supportedFrom} onChange={(e) => setSupportedFrom(e.target.value)}
                        className="bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Supported To</label>
                      <input type="datetime-local" value={supportedTo} onChange={(e) => setSupportedTo(e.target.value)}
                        className="bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 cursor-pointer" />
                    </div>
                    <div className="flex-1 min-w-40">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Search</label>
                      <input type="text" placeholder="Name, contact, agent, or message..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 placeholder:text-foreground-300" />
                    </div>
                    <button onClick={exportChatsCSV}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer px-4 py-2 rounded-lg whitespace-nowrap">
                      <i className="ri-file-excel-2-line"></i> Export CSV
                    </button>
                  </div>
                  <p className="text-xs text-foreground-400 mt-3">{filtered.length} conversation{filtered.length !== 1 ? "s" : ""} found</p>
                </div>

                {/* Table */}
                <div className="bg-background-100 rounded-xl border border-background-200/70 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-background-200/70 bg-background-50">
                          <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Date</th>
                          <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Visitor</th>
                          <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400 hidden md:table-cell">Contact</th>
                          <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400 hidden lg:table-cell">Support Agent</th>
                          <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400 hidden xl:table-cell">Supported</th>
                          <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Status</th>
                          <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400 hidden lg:table-cell">Initial Message</th>
                          <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Msgs</th>
                          <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">History</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={9} className="text-center py-12 text-sm text-foreground-400">No conversations match your filters</td></tr>
                        ) : (
                          filtered.map((c) => {
                            const supportMeta = chatSupport.get(c.id);
                            const thread = messagesByChat.get(c.id) ?? [];
                            const hasAgent = (supportMeta?.agentNames.length ?? 0) > 0;
                            const isExpanded = expandedChatId === c.id;
                            return (
                              <Fragment key={c.id}>
                                <tr className="border-b border-background-200/50 hover:bg-background-50 transition-colors">
                                  <td className="px-4 py-3 text-xs text-foreground-500 whitespace-nowrap">{fmtDateTime(c.created_at)}</td>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-foreground-900 text-sm">{c.visitor_name}</p>
                                    <p className="text-xs text-foreground-400 md:hidden">{c.visitor_contact}</p>
                                    <p className="text-xs text-foreground-400 lg:hidden">{supportMeta?.agentNames.join(", ") || "No agent yet"}</p>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-foreground-500 hidden md:table-cell">{c.visitor_contact}</td>
                                  <td className="px-4 py-3 text-xs text-foreground-600 hidden lg:table-cell">{supportMeta?.agentNames.join(", ") || "—"}</td>
                                  <td className="px-4 py-3 text-xs text-foreground-500 hidden xl:table-cell whitespace-nowrap">{supportMeta?.supportedAt ? fmtDateTime(supportMeta.supportedAt) : "—"}</td>
                                  <td className="px-4 py-3">
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                      c.status === "waiting" ? "bg-yellow-100 text-yellow-700" :
                                      c.status === "active"  ? "bg-green-100 text-green-700" :
                                      "bg-background-200 text-foreground-600"
                                    }`}>
                                      {c.status}
                                    </span>
                                    {hasAgent && <span className="ml-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">Live</span>}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-foreground-500 hidden lg:table-cell max-w-xs truncate">{c.initial_message ?? "—"}</td>
                                  <td className="px-4 py-3 text-xs text-foreground-500 text-right font-medium">{supportMeta?.messageCount ?? 0}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setExpandedChatId(isExpanded ? null : c.id)}
                                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      {isExpanded ? "Hide" : "View"}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="border-b border-background-200/70 bg-background-50/70">
                                    <td colSpan={9} className="px-4 py-4">
                                      {thread.length === 0 ? (
                                        <p className="text-xs text-foreground-400 text-center py-6">No message history for this conversation</p>
                                      ) : (
                                        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                                          {thread.map((msg) => {
                                            const isAgent = msg.role === "agent";
                                            const isAi = msg.role === "ai";
                                            return (
                                              <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                                  isAgent ? "bg-primary-500 text-white rounded-br-sm" :
                                                  isAi ? "bg-purple-50 border border-purple-100 text-foreground-700 rounded-bl-sm" :
                                                  "bg-background-100 border border-background-200/70 text-foreground-800 rounded-bl-sm"
                                                }`}>
                                                  <p className={`text-[10px] font-semibold mb-0.5 ${isAgent ? "text-primary-100" : isAi ? "text-purple-400" : "text-foreground-400"}`}>
                                                    {isAgent ? (msg.sender_name || "Agent") : isAi ? "AI Assistant" : (msg.sender_name || c.visitor_name)}
                                                    <span className={`font-normal ml-2 ${isAgent ? "text-primary-200" : "text-foreground-300"}`}>{fmtTime(msg.created_at)}</span>
                                                  </p>
                                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── AGENT REPORT ─────────────────────────────────────────────── */}
            {tab === "agents" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={exportAgentsCSV}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer px-4 py-2 rounded-lg">
                    <i className="ri-file-excel-2-line"></i> Export CSV
                  </button>
                </div>

                {agentStats.length === 0 ? (
                  <div className="bg-background-100 rounded-xl border border-background-200/70 p-12 text-center">
                    <i className="ri-user-voice-line text-4xl text-foreground-300 block mb-3"></i>
                    <p className="text-sm text-foreground-500">No agent activity yet</p>
                  </div>
                ) : (
                  <div className="bg-background-100 rounded-xl border border-background-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-background-200/70 bg-background-50">
                            <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Agent</th>
                            <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Chats Handled</th>
                            <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Messages Sent</th>
                            <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Avg Msgs/Chat</th>
                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">Activity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentStats.map((a, i) => {
                            const maxMsgs = agentStats[0].messages;
                            return (
                              <tr key={a.name} className="border-b border-background-200/50 hover:bg-background-50 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                                      {a.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground-900">{a.name}</p>
                                      {i === 0 && <span className="text-[10px] text-yellow-600 font-medium">Top performer</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right font-semibold text-foreground-800">{a.chats}</td>
                                <td className="px-5 py-4 text-right font-semibold text-foreground-800">{a.messages}</td>
                                <td className="px-5 py-4 text-right text-foreground-600">{a.chats > 0 ? (a.messages / a.chats).toFixed(1) : "—"}</td>
                                <td className="px-5 py-4">
                                  <div className="w-full h-2 bg-background-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(a.messages / maxMsgs) * 100}%` }} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* AI summary card */}
                <div className="bg-background-100 rounded-xl border border-background-200/70 p-5">
                  <h3 className="text-sm font-semibold text-foreground-800 mb-4">AI Chatbot Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: "AI-only sessions",    value: aiOnlyChats,  note: "no agent needed" },
                      { label: "AI responses sent",   value: aiMsgCount,   note: "total messages" },
                      { label: "Escalation rate",     value: total > 0 ? `${Math.round(liveHandled / total * 100)}%` : "—", note: "chats reaching agent" },
                    ].map(({ label, value, note }) => (
                      <div key={label} className="bg-background-50 rounded-lg border border-background-200/60 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">{label}</p>
                        <p className="text-xl font-bold text-foreground-950">{value}</p>
                        <p className="text-[10px] text-foreground-400 mt-0.5">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
