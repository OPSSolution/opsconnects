import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requirePartnerOwner } from "../_shared/auth.ts";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TEST_TEXT = "✅ Test message from OPSConnect — your Telegram channel is connected and working.";

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type":                 "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  let partnerId: string | undefined;
  try {
    const body = await req.json() as Record<string, unknown>;
    partnerId = body.partner_id as string | undefined;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: cors });
  }
  if (!partnerId) {
    return new Response(JSON.stringify({ error: "partner_id is required" }), { status: 400, headers: cors });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const caller = await requirePartnerOwner(supabase, req, partnerId, "id");
  if (!caller) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: cors });
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("telegram_bot_token, telegram_chat_id")
    .eq("id", partnerId)
    .maybeSingle();

  const botToken = (partner?.telegram_bot_token as string | null) ?? "";
  const chatId   = (partner?.telegram_chat_id as string | null) ?? "";

  if (!botToken.trim() || !chatId.trim()) {
    return new Response(
      JSON.stringify({ ok: false, error: "No Telegram bot token / chat ID saved yet — set it up under Dashboard → Widget & Notification Settings first." }),
      { headers: cors }
    );
  }

  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: TEST_TEXT }),
  });
  const tgData = await tgRes.json() as { ok: boolean; description?: string; result?: { message_id: number } };

  if (!tgData.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: tgData.description ?? "Telegram rejected the test message." }),
      { headers: cors }
    );
  }

  const { error: insertError } = await supabase.from("messages").insert({
    partner_id:          partnerId,
    channel:              "telegram",
    direction:            "outbound",
    sender_id:            "opsconnect",
    sender_name:          "OPSConnect (test)",
    recipient_id:         chatId,
    content:              TEST_TEXT,
    content_type:         "text",
    external_message_id:  `telegram_test_${tgData.result?.message_id ?? Date.now()}`,
    status:               "sent",
  });
  if (insertError) console.error("Test message insert failed:", insertError.message);

  return new Response(JSON.stringify({ ok: true }), { headers: cors });
});
