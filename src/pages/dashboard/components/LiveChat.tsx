import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";

interface LiveChatSession {
  id: string;
  partner_id: string;
  visitor_name: string;
  visitor_contact: string;
  initial_message: string | null;
  status: "waiting" | "active" | "closed";
  assigned_agent: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  chat_id: string;
  role: "visitor" | "agent" | "ai";
  sender_name: string | null;
  content: string;
  created_at: string;
}

interface Props {
  partnerId: string | null; // text "PART-XXXX"
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function LiveChat({ partnerId }: Props) {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<LiveChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<LiveChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [agentName, setAgentName] = useState("Agent");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef  = useRef<HTMLInputElement>(null);

  const waitingCount = chats.filter((c) => c.status === "waiting").length;

  // Load open chats + subscribe to new ones
  useEffect(() => {
    if (!partnerId || !open) return;
    setLoading(true);

    supabase
      .from("live_chats")
      .select("*")
      .eq("partner_id", partnerId)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setChats(data as LiveChatSession[]); setLoading(false); });

    const ch = supabase
      .channel(`live_chats_${partnerId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chats", filter: `partner_id=eq.${partnerId}` },
        (payload) => setChats((prev) => [payload.new as LiveChatSession, ...prev])
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_chats", filter: `partner_id=eq.${partnerId}` },
        (payload) => {
          const updated = payload.new as LiveChatSession;
          setChats((prev) =>
            updated.status === "closed"
              ? prev.filter((c) => c.id !== updated.id)
              : prev.map((c) => c.id === updated.id ? updated : c)
          );
          setActiveChat((prev) => prev?.id === updated.id ? (updated.status === "closed" ? null : updated) : prev);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [partnerId, open]);

  // Load messages + subscribe when a chat is selected
  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }

    supabase
      .from("live_chat_messages")
      .select("*")
      .eq("chat_id", activeChat.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data as ChatMessage[]); });

    // Mark as active
    supabase.from("live_chats").update({ status: "active" }).eq("id", activeChat.id);

    const ch = supabase
      .channel(`msgs_${activeChat.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `chat_id=eq.${activeChat.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage])
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [activeChat?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = useCallback((chat: LiveChatSession) => {
    setActiveChat(chat);
    setTimeout(() => replyInputRef.current?.focus(), 100);
  }, []);

  const sendReply = async () => {
    if (!replyText.trim() || !activeChat || sending) return;
    setSending(true);
    const content = replyText.trim();
    setReplyText("");
    await supabase.from("live_chat_messages").insert({
      chat_id:     activeChat.id,
      role:        "agent",
      sender_name: agentName || "Agent",
      content,
    });
    setSending(false);
    replyInputRef.current?.focus();
  };

  const closeChat = async (chatId: string) => {
    await supabase.from("live_chats").update({ status: "closed" }).eq("id", chatId);
    if (activeChat?.id === chatId) setActiveChat(null);
  };

  const msgBubble = (msg: ChatMessage) => {
    const isAgent   = msg.role === "agent";
    const isAi      = msg.role === "ai";
    const isVisitor = msg.role === "visitor";
    return (
      <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"} mb-2`}>
        <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
          isAgent   ? "bg-primary-500 text-white rounded-br-sm" :
          isAi      ? "bg-purple-50 border border-purple-100 text-foreground-600 rounded-bl-sm" :
                      "bg-background-100 text-foreground-800 rounded-bl-sm"
        }`}>
          <p className={`text-[10px] font-semibold mb-0.5 ${
            isAgent ? "text-primary-100" : isAi ? "text-purple-400" : "text-foreground-400"
          }`}>
            {isAgent ? (msg.sender_name || "Agent") : isAi ? "AI Assistant" : msg.sender_name || "Visitor"}
          </p>
          <p>{msg.content}</p>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-bold text-foreground-950">Live Chat</h2>
          {waitingCount > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
              {waitingCount} waiting
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-medium text-foreground-600 hover:text-primary-500 transition-colors cursor-pointer flex items-center gap-1"
        >
          <i className="ri-customer-service-2-line"></i> {open ? "Hide" : "Open Live Chat"}
        </button>
      </div>

      {!open && (
        <div className="bg-background-100 rounded-xl border border-background-200/70 p-5 flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary-100 flex-shrink-0">
            <i className="ri-customer-service-2-line text-xl text-primary-600"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground-900">Agent Live Chat</p>
            <p className="text-xs text-foreground-500 mt-0.5">
              {chats.length > 0
                ? `${chats.length} open session${chats.length > 1 ? "s" : ""}${waitingCount > 0 ? ` · ${waitingCount} waiting for reply` : ""}`
                : "No active sessions. Visitors escalated by AI will appear here."}
            </p>
          </div>
          {waitingCount > 0 && (
            <button onClick={() => setOpen(true)} className="text-xs font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors cursor-pointer px-4 py-2 rounded-md flex-shrink-0 flex items-center gap-1">
              <i className="ri-reply-line"></i> Reply
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="bg-background-100 rounded-xl border border-background-200/70 overflow-hidden animate-[fadeInUp_0.3s_ease-out]">
          <div className="flex h-[500px]">

            {/* Left: sessions list */}
            <div className="w-56 flex-shrink-0 border-r border-background-200/70 flex flex-col">
              <div className="px-3 py-2.5 border-b border-background-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-400">Sessions</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center h-20">
                    <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!loading && chats.length === 0 && (
                  <div className="p-4 text-center">
                    <i className="ri-inbox-line text-2xl text-foreground-300"></i>
                    <p className="text-[11px] text-foreground-400 mt-1">No open sessions</p>
                  </div>
                )}
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat)}
                    className={`w-full text-left px-3 py-3 border-b border-background-200/50 transition-colors cursor-pointer ${
                      activeChat?.id === chat.id ? "bg-primary-50 border-l-2 border-l-primary-500" : "hover:bg-background-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${chat.status === "waiting" ? "bg-red-400 animate-pulse" : "bg-accent-400"}`} />
                      <p className="text-xs font-semibold text-foreground-800 truncate">{chat.visitor_name}</p>
                    </div>
                    <p className="text-[10px] text-foreground-400 truncate pl-3.5">{chat.visitor_contact}</p>
                    <p className="text-[10px] text-foreground-300 pl-3.5 mt-0.5">{timeAgo(chat.created_at)}</p>
                  </button>
                ))}
              </div>
              {/* Agent name */}
              <div className="p-2 border-t border-background-200/70">
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Your name"
                  className="w-full text-xs bg-background-50 border border-background-200/70 rounded-md px-2 py-1.5 outline-none focus:border-primary-400 text-foreground-700"
                />
              </div>
            </div>

            {/* Right: conversation */}
            <div className="flex-1 flex flex-col min-w-0">
              {!activeChat ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
                  <i className="ri-chat-smile-2-line text-3xl text-foreground-300"></i>
                  <p className="text-sm text-foreground-400">Select a session to start replying</p>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-background-200/70 flex-shrink-0">
                    <div>
                      <p className="text-sm font-semibold text-foreground-900">{activeChat.visitor_name}</p>
                      <p className="text-[11px] text-foreground-400">{activeChat.visitor_contact}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        activeChat.status === "waiting" ? "bg-red-100 text-red-600" : "bg-accent-100 text-accent-600"
                      }`}>
                        {activeChat.status}
                      </span>
                      <button
                        onClick={() => closeChat(activeChat.id)}
                        className="text-xs font-medium text-foreground-400 hover:text-red-500 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-red-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {messages.length === 0 && (
                      <p className="text-xs text-foreground-400 text-center mt-4">No messages yet</p>
                    )}
                    {/* AI history separator */}
                    {messages.some((m) => m.role === "ai") && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-purple-100"></div>
                        <span className="text-[10px] text-purple-400 font-medium">AI Conversation History</span>
                        <div className="h-px flex-1 bg-purple-100"></div>
                      </div>
                    )}
                    {messages.map(msgBubble)}
                    {/* Live separator */}
                    {messages.some((m) => m.role === "ai") && messages.some((m) => m.role !== "ai") && (
                      <div className="flex items-center gap-2 my-3">
                        <div className="h-px flex-1 bg-background-200"></div>
                        <span className="text-[10px] text-foreground-400 font-medium">Live Chat</span>
                        <div className="h-px flex-1 bg-background-200"></div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply input */}
                  <div className="px-4 py-3 border-t border-background-200/70 flex-shrink-0">
                    <div className="flex gap-2">
                      <input
                        ref={replyInputRef}
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                        placeholder={`Reply as ${agentName || "Agent"}…`}
                        className="flex-1 bg-background-50 border border-background-200/70 rounded-xl px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 placeholder:text-foreground-300"
                      />
                      <button
                        onClick={sendReply}
                        disabled={!replyText.trim() || sending}
                        className={`text-xs font-semibold whitespace-nowrap cursor-pointer px-4 py-2 rounded-xl transition-colors ${
                          replyText.trim() && !sending
                            ? "bg-primary-500 text-white hover:bg-primary-600"
                            : "bg-background-200 text-foreground-300 cursor-not-allowed"
                        }`}
                      >
                        {sending ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : "Send"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
