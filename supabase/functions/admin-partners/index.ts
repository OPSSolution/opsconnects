/**
 * admin-partners — returns the partner list for the admin panel.
 *
 * Uses the service role key to bypass the per-partner RLS policy
 * (`auth.uid() = user_id`), gated by the caller's real Supabase Auth session
 * carrying the "admin" JWT claim (see supabase/functions/_shared/auth.ts
 * requireAdmin) so the partner list (emails included) isn't exposed to the
 * public anon key.
 *
 * Note: src/utils/auth.ts getAllPartners() now reads the partners table
 * directly (RLS-gated by the same admin JWT claim) instead of calling this
 * function — kept for any other admin-portal callers that still need it.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/auth.ts";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!(await requireAdmin(supabase, req))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS });
  }

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
