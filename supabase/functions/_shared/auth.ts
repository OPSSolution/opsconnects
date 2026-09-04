import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Verifies the caller's Supabase session (from the Authorization header that
 * supabase.functions.invoke() attaches automatically) and confirms they own
 * the referenced partner row via the partners table. Use this in any
 * admin-style edge function (create-agent, delete-agent, seed-demo-messages,
 * ...) that runs on a service-role client and would otherwise bypass RLS
 * entirely.
 *
 * `by` picks which partners column to match against: "partner_id" for the
 * human-readable text code (e.g. partner_agents.partner_id), "id" for the
 * uuid primary key (e.g. messages.partner_id).
 */
export async function requirePartnerOwner(
  supabase: SupabaseClient,
  req: Request,
  value: string,
  by: "partner_id" | "id" = "partner_id",
): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return null;

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .eq(by, value)
    .maybeSingle();

  if (!partner) return null;
  return { userId: user.id };
}

/**
 * Verifies the caller's Supabase session and confirms the "admin" role claim
 * on their JWT (set server-side via app_metadata — see src/utils/auth.ts
 * getSession()). Use this in place of a shared admin_key secret for any
 * edge function serving the admin portal.
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  req: Request,
): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  if (user.app_metadata?.role !== "admin") return null;

  return { userId: user.id };
}
