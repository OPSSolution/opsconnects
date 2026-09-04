import { supabase } from "./supabase/client";
import { ADMIN_PASSWORD } from "./auth";

export interface Overview {
  partners: number;
  agents: number;
  support_new: number;
  support_total: number;
  chats_waiting: number;
  chats_active: number;
  messages_total: number;
}

export interface SupportRequestRow {
  id: string;
  partner_id: string | null;
  partner_name: string | null;
  visitor_name: string;
  visitor_contact: string;
  company: string | null;
  message: string;
  topic: string | null;
  status: "new" | "read" | "resolved";
  created_at: string;
  resolved_at: string | null;
}

export interface LiveChatRow {
  id: string;
  partner_id: string;
  partner_name: string | null;
  visitor_name: string;
  visitor_contact: string;
  initial_message: string | null;
  status: "waiting" | "active" | "closed";
  created_at: string;
  rating: number | null;
  rated_at: string | null;
}

export interface LiveChatMessageRow {
  id: string;
  chat_id: string;
  role: "visitor" | "agent" | "ai";
  sender_name: string | null;
  content: string;
  created_at: string;
}

export interface AgentRow {
  id: string;
  partner_id: string;
  partner_name: string | null;
  name: string;
  email: string;
  role: string;
  avatar_color: string | null;
  created_at: string;
}

async function call<T>(resource: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-data", {
    body: { admin_key: ADMIN_PASSWORD, resource, ...extra },
  });
  if (error || !data || data.error) {
    throw new Error(data?.error ?? error?.message ?? "Admin request failed");
  }
  return data as T;
}

export const getOverview          = () => call<Overview>("overview");
export const getSupportRequests   = () => call<{ requests: SupportRequestRow[] }>("support_requests").then((d) => d.requests);
export const updateSupportRequest = (id: string, status: string) => call("support_requests", { action: "update", id, status });
export const getLiveChats         = () => call<{ chats: LiveChatRow[] }>("live_chats").then((d) => d.chats);
export const getLiveChatMessages  = (chatId: string) => call<{ messages: LiveChatMessageRow[] }>("live_chat_messages", { chat_id: chatId }).then((d) => d.messages);
export const replyToLiveChat      = (chatId: string, content: string, senderName: string) => call("live_chats", { action: "reply", chat_id: chatId, content, sender_name: senderName });
export const closeLiveChat        = (chatId: string) => call("live_chats", { action: "close", chat_id: chatId });
export const getAgents            = () => call<{ agents: AgentRow[] }>("agents").then((d) => d.agents);
