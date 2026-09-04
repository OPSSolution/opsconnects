import { useState, useEffect, useCallback, useRef } from "react";
import { getLiveChats, getLiveChatMessages, replyToLiveChat, closeLiveChat, LiveChatRow, LiveChatMessageRow } from "@/utils/admin";
import { downloadCSV, fmtDateTime } from "@/utils/csv";

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function LiveChatsTab() {
  const [chats, setChats] = useState<LiveChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [activeChat, setActiveChat] = useState<LiveChatRow | null>(null);
  const [messages, setMessages] = useState<LiveChatMessageRow[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { setChats(await getLiveChats()); }
    catch (e) { console.error("Failed to load live chats:", e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const loadMessages = useCallback(async (chatId: string) => {
    try { setMessages(await getLiveChatMessages(chatId)); }
    catch (e) { console.error("Failed to load messages:", e); }
  }, []);

  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    loadMessages(activeChat.id);
    const t = setInterval(() => loadMessages(activeChat.id), 3000);
    return () => clearInterval(t);
  }, [activeChat, loadMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendReply = async () => {
    if (!replyText.trim() || !activeChat || sending) return;
    setSending(true);
    const content = replyText.trim();
    setReplyText("");
    try {
      await replyToLiveChat(activeChat.id, content, "Admin");
      await loadMessages(activeChat.id);
    } catch (e) { console.error("Failed to send reply:", e); }
    setSending(false);
  };

  const handleClose = async (chatId: string) => {
    try {
      await closeLiveChat(chatId);
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, status: "closed" } : c));
      setActiveChat(null);
    } catch (e) { console.error("Failed to close chat:", e); }
  };

  const visible = chats.filter((c) => showClosed || c.status !== "closed");
  const waitingCount = chats.filter((c) => c.status === "waiting").length;

  const exportChats = () => downloadCSV(
    `live-chats-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Date/Time", "Business", "Visitor Name", "Contact", "Status", "Initial Message", "Rating", "Rated At"],
    visible.map((c) => [fmtDateTime(c.created_at), c.partner_name, c.visitor_name, c.visitor_contact, c.status, c.initial_message, c.rating, fmtDateTime(c.rated_at)])
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {waitingCount > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
              {waitingCount} waiting
            </span>
          )}
          <span className="text-xs text-foreground-400">{loading ? "Loading…" : `${visible.length} sessions`}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-foreground-500 cursor-pointer">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Show closed
          </label>
          <button onClick={exportChats} disabled={!visible.length}
            className="text-xs font-medium bg-background-100 border border-background-200/70 text-foreground-600 hover:text-foreground-900 hover:bg-background-200/50 transition-colors whitespace-nowrap cursor-pointer px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
            <i className="ri-download-2-line" /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="w-6 h-6 border-2 border-primary-400 border-t-primary-600 rounded-full animate-spin inline-block" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-foreground-400">
          <i className="ri-customer-service-2-line text-4xl mb-2 block"></i>
          No live chat sessions.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className="w-full text-left p-3 rounded-lg border border-background-200/70 bg-background-100 hover:border-primary-200 transition-colors cursor-pointer flex items-center gap-3"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                chat.status === "waiting" ? "bg-red-400 animate-pulse" : chat.status === "active" ? "bg-accent-400" : "bg-foreground-300"
              }`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground-800 truncate">{chat.visitor_name}</p>
                  {chat.partner_name && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 flex-shrink-0">{chat.partner_name}</span>
                  )}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    chat.status === "waiting" ? "bg-red-100 text-red-600" : chat.status === "active" ? "bg-accent-100 text-accent-600" : "bg-background-200 text-foreground-500"
                  }`}>{chat.status}</span>
                </div>
                <p className="text-[11px] text-foreground-400 truncate">{chat.initial_message || chat.visitor_contact}</p>
              </div>
              <span className="text-[10px] text-foreground-300 flex-shrink-0">{timeAgo(chat.created_at)}</span>
            </button>
          ))}
        </div>
      )}

      {activeChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-0 sm:pb-4">
          <div className="bg-background-50 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl h-[90vh] sm:h-[600px] flex flex-col shadow-2xl border border-background-200/70">
            <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70 flex-shrink-0">
              <div>
                <p className="text-sm font-semibold text-foreground-900">
                  {activeChat.visitor_name}
                  {activeChat.partner_name && <span className="text-foreground-400 font-normal"> · {activeChat.partner_name}</span>}
                </p>
                <p className="text-[11px] text-foreground-400">{activeChat.visitor_contact}</p>
              </div>
              <div className="flex items-center gap-2">
                {activeChat.status !== "closed" && (
                  <button onClick={() => handleClose(activeChat.id)}
                    className="text-xs font-medium text-foreground-400 hover:text-red-500 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-red-50">
                    Close Chat
                  </button>
                )}
                <button onClick={() => setActiveChat(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer">
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 && <p className="text-xs text-foreground-400 text-center mt-4">No messages yet</p>}
              {messages.map((msg) => {
                const isAgent = msg.role === "agent";
                const isAi = msg.role === "ai";
                return (
                  <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"} mb-2`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      isAgent ? "bg-primary-500 text-white rounded-br-sm" :
                      isAi    ? "bg-purple-50 border border-purple-100 text-foreground-600 rounded-bl-sm" :
                                "bg-background-100 text-foreground-800 rounded-bl-sm"
                    }`}>
                      <p className={`text-[10px] font-semibold mb-0.5 ${isAgent ? "text-primary-100" : isAi ? "text-purple-400" : "text-foreground-400"}`}>
                        {isAgent ? (msg.sender_name || "Admin") : isAi ? "AI Assistant" : (msg.sender_name || "Visitor")}
                      </p>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {activeChat.status !== "closed" && (
              <div className="px-4 py-3 border-t border-background-200/70 flex-shrink-0 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Reply as Admin…"
                  className="flex-1 bg-background-100 border border-background-200/70 rounded-xl px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 placeholder:text-foreground-300"
                />
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  className={`text-xs font-semibold whitespace-nowrap cursor-pointer px-4 py-2 rounded-xl transition-colors ${
                    replyText.trim() && !sending ? "bg-primary-500 text-white hover:bg-primary-600" : "bg-background-200 text-foreground-300 cursor-not-allowed"
                  }`}
                >
                  {sending ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
