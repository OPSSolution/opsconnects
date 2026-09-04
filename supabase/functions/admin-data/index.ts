/**
 * admin-data — backend for the admin portal (everything except the partner list,
 * which is served by admin-partners).
 *
 * Uses the service role key to read/write across ALL partners, bypassing the
 * per-partner RLS policies (which key off auth.uid() — something the app's
 * client-side-only "admin" role doesn't have). Gated by the same ADMIN_PANEL_KEY
 * shared secret as admin-partners.
 *
 * POST body: { admin_key, resource, action?, ...params }
 *   resource: "overview" | "support_requests" | "live_chats" | "live_chat_messages" | "agents"
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PANEL_KEY           = Deno.env.get("ADMIN_PANEL_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type":                 "application/json",
};

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: CORS });
}
function ok(body: unknown) {
  return new Response(JSON.stringify(body), { headers: CORS });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return err("Method not allowed", 405);

  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; }
  catch { return err("Invalid JSON"); }

  const adminKey = body.admin_key as string | undefined;
  if (!ADMIN_PANEL_KEY || adminKey !== ADMIN_PANEL_KEY) return err("Forbidden", 403);

  const resource = body.resource as string | undefined;
  const action   = body.action   as string | undefined;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Overview stats ─────────────────────────────────────────────────────
  if (resource === "overview") {
    const [partners, agents, supportNew, supportTotal, chatsWaiting, chatsActive, messagesTotal] = await Promise.all([
      supabase.from("partners").select("*", { count: "exact", head: true }),
      supabase.from("partner_agents").select("*", { count: "exact", head: true }),
      supabase.from("support_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("support_requests").select("*", { count: "exact", head: true }),
      supabase.from("live_chats").select("*", { count: "exact", head: true }).eq("status", "waiting"),
      supabase.from("live_chats").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("messages").select("*", { count: "exact", head: true }),
    ]);
    return ok({
      partners:        partners.count ?? 0,
      agents:          agents.count ?? 0,
      support_new:     supportNew.count ?? 0,
      support_total:   supportTotal.count ?? 0,
      chats_waiting:   chatsWaiting.count ?? 0,
      chats_active:    chatsActive.count ?? 0,
      messages_total:  messagesTotal.count ?? 0,
    });
  }

  // ── Support requests ───────────────────────────────────────────────────
  if (resource === "support_requests") {
    if (action === "update") {
      const id     = body.id     as string | undefined;
      const status = body.status as string | undefined;
      if (!id || !status) return err("id and status required");
      const { error } = await supabase.from("support_requests")
        .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) return err(error.message, 500);
      return ok({ ok: true });
    }

    const { data: requests, error: reqErr } = await supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (reqErr) return err(reqErr.message, 500);

    const { data: partners } = await supabase.from("partners").select("partner_id, partner_name");
    const nameByPartner = new Map((partners ?? []).map((p) => [p.partner_id as string, p.partner_name as string]));
    const enriched = (requests ?? []).map((r) => ({
      ...r,
      partner_name: r.partner_id ? nameByPartner.get(r.partner_id as string) ?? null : null,
    }));
    return ok({ requests: enriched });
  }

  // ── Live chats ──────────────────────────────────────────────────────────
  if (resource === "live_chats") {
    if (action === "close") {
      const chatId = body.chat_id as string | undefined;
      if (!chatId) return err("chat_id required");
      const { error } = await supabase.from("live_chats").update({ status: "closed" }).eq("id", chatId);
      if (error) return err(error.message, 500);
      return ok({ ok: true });
    }

    if (action === "reply") {
      const chatId     = body.chat_id     as string | undefined;
      const content     = body.content     as string | undefined;
      const senderName = body.sender_name as string | undefined;
      if (!chatId || !content) return err("chat_id and content required");
      const { error } = await supabase.from("live_chat_messages").insert({
        chat_id: chatId, role: "agent", sender_name: senderName || "Admin", content,
      });
      if (error) return err(error.message, 500);
      return ok({ ok: true });
    }

    const { data: chats, error: chatErr } = await supabase
      .from("live_chats")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (chatErr) return err(chatErr.message, 500);

    const { data: partners } = await supabase.from("partners").select("partner_id, partner_name");
    const nameByPartner = new Map((partners ?? []).map((p) => [p.partner_id as string, p.partner_name as string]));
    const enriched = (chats ?? []).map((c) => ({
      ...c,
      partner_name: nameByPartner.get(c.partner_id as string) ?? null,
    }));
    return ok({ chats: enriched });
  }

  if (resource === "live_chat_messages") {
    const chatId = body.chat_id as string | undefined;
    if (!chatId) return err("chat_id required");
    const { data, error } = await supabase
      .from("live_chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (error) return err(error.message, 500);
    return ok({ messages: data ?? [] });
  }

  // ── Agents ──────────────────────────────────────────────────────────────
  if (resource === "agents") {
    const { data: agents, error: agentErr } = await supabase
      .from("partner_agents")
      .select("id, partner_id, name, email, role, avatar_color, created_at")
      .order("created_at", { ascending: false });
    if (agentErr) return err(agentErr.message, 500);

    const { data: partners } = await supabase.from("partners").select("partner_id, partner_name");
    const nameByPartner = new Map((partners ?? []).map((p) => [p.partner_id as string, p.partner_name as string]));
    const enriched = (agents ?? []).map((a) => ({
      ...a,
      partner_name: nameByPartner.get(a.partner_id as string) ?? null,
    }));
    return ok({ agents: enriched });
  }

  return err("Unknown resource");
});
