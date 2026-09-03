-- Admin access via JWT app_metadata claim.
--
-- To make a user an admin: Supabase Dashboard → Authentication → Users →
-- select the user → Raw App Meta Data → set:
--   { "role": "admin" }
-- app_metadata can only be edited via the dashboard or service-role API,
-- never by the user themselves (unlike user_metadata), so it's safe to
-- trust inside RLS policies.

drop policy if exists "Admins can read all partners" on public.partners;
create policy "Admins can read all partners"
  on public.partners for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can read all channel_configs" on public.channel_configs;
create policy "Admins can read all channel_configs"
  on public.channel_configs for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- newsletter_subscribers
-- Populated by the newsletter-subscribe Edge Function (service_role key).
-- No client-facing RLS policies — locked to service-role access only.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz default now()
);
alter table public.newsletter_subscribers enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Widget branding + Telegram live-chat-alert settings, saved from the
-- dashboard (src/pages/dashboard/page.tsx). Queried/updated there but never
-- had columns backing them.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.partners
  add column if not exists widget_settings    jsonb,
  add column if not exists telegram_bot_token text,
  add column if not exists telegram_chat_id   text;
