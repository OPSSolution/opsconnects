/**
 * admin-partners — returns the partner list for the admin panel.
 *
 * The app's "admin" role is a client-side-only check (see src/utils/auth.ts),
 * not a real Supabase Auth session — so it has no auth.uid() and can't read
 * partners under the normal RLS policy (`auth.uid() = user_id`). This function
 * uses the service role key to bypass RLS, gated by a shared secret so the
 * partner list (emails included) isn't exposed to the public anon key.
 *
 * POST body: { admin_key: string }
 * Secret required: ADMIN_PANEL_KEY — must match ADMIN_PASSWORD in src/utils/auth.ts.
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS }); }

  const adminKey = body.admin_key as string | undefined;
  if (!ADMIN_PANEL_KEY || adminKey !== ADMIN_PANEL_KEY) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("partners")
    .select(`
      partner_id,
      partner_name,
      email,
      created_at,
      channel_configs ( channel_id, configured )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
  }

  return new Response(JSON.stringify({ partners: data ?? [] }), { headers: CORS });
});
