-- Run this in Supabase Dashboard → SQL Editor.
-- Idempotent — safe to run repeatedly against an existing project.
--
-- This is the complete schema: partners, channel_configs, partner_agents,
-- messages, support_requests, live_chats, live_chat_messages, plus RLS
-- policies scoped to each partner's own data (and an admin override via
-- the JWT app_metadata.role claim — see the bottom of this file).

-- ─────────────────────────────────────────────
-- PARTNERS
-- ─────────────────────────────────────────────
create table if not exists public.partners (
  id                   uuid        default gen_random_uuid() primary key,
  partner_id           text        unique not null,
  partner_name         text        not null,
  email                text,
  user_id              uuid        references auth.users(id) on delete cascade,
  ai_business_context  text,       -- free-text fed to the AI chat widget
  widget_settings      jsonb,      -- branding (name/avatar/logo/colors/contacts) for the embed widget
  telegram_bot_token   text,       -- Telegram bot used for live-chat-request alerts
  telegram_chat_id     text,       -- chat/group to notify
  created_at           timestamptz not null default now()
);

-- Safe to run against an existing partners table that predates these columns
alter table public.partners
  add column if not exists widget_settings    jsonb,
  add column if not exists telegram_bot_token text,
  add column if not exists telegram_chat_id   text;

alter table public.partners enable row level security;

drop policy if exists "Public read partners"       on public.partners;
drop policy if exists "Users insert own partner"   on public.partners;
drop policy if exists "Partners can read own record"  on public.partners;
drop policy if exists "Partners can update own record" on public.partners;
drop policy if exists "Allow insert on signup"        on public.partners;
drop policy if exists "Admins can read all partners"  on public.partners;

create policy "Partners can read own record"
  on public.partners for select
  using (auth.uid() = user_id);

create policy "Partners can update own record"
  on public.partners for update
  using (auth.uid() = user_id);

create policy "Allow insert on signup"
  on public.partners for insert
  with check (auth.uid() = user_id);

-- Admin dashboard: only true when the caller's JWT carries
-- app_metadata.role = "admin" (settable only via the Supabase dashboard
-- or service-role API — never by the user themselves).
create policy "Admins can read all partners"
  on public.partners for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─────────────────────────────────────────────
-- CHANNEL CONFIGS
-- ─────────────────────────────────────────────
create table if not exists public.channel_configs (
  id          uuid        default gen_random_uuid() primary key,
  partner_id  text        not null references public.partners(partner_id) on delete cascade,
  channel_id  text        not null,
  channel     text,
  account_id  text,
  configured  boolean     default true,
  created_at  timestamptz not null default now(),
  unique(partner_id, channel_id)
);

alter table public.channel_configs enable row level security;

drop policy if exists "Public read channel_configs"     on public.channel_configs;
drop policy if exists "Users manage channel_configs"     on public.channel_configs;
drop policy if exists "Partners access own channel_configs" on public.channel_configs;
drop policy if exists "Admins can read all channel_configs"  on public.channel_configs;

create policy "Partners access own channel_configs"
  on public.channel_configs for all
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );

create policy "Admins can read all channel_configs"
  on public.channel_configs for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─────────────────────────────────────────────
-- NEWSLETTER SUBSCRIBERS
-- Populated by the newsletter-subscribe Edge Function (service_role key).
-- No client-facing RLS policies — locked to service-role access only.
-- ─────────────────────────────────────────────
create table if not exists public.newsletter_subscribers (
  id         uuid        default gen_random_uuid() primary key,
  email      text        unique not null,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- ─────────────────────────────────────────────
-- PARTNER AGENTS (team members: agent / viewer roles)
-- Created via the create-agent Edge Function (service_role key).
-- ─────────────────────────────────────────────
create table if not exists public.partner_agents (
  id           uuid        default gen_random_uuid() primary key,
  partner_id   text        not null,
  user_id      uuid        references auth.users(id) on delete set null,
  name         text        not null,
  email        text        not null,
  role         text        not null default 'agent',
  avatar_color text,
  created_at   timestamptz not null default now()
);

alter table public.partner_agents enable row level security;

drop policy if exists "Partners manage own agents" on public.partner_agents;
drop policy if exists "Agents read own record"     on public.partner_agents;

create policy "Partners manage own agents"
  on public.partner_agents for all
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );

create policy "Agents read own record"
  on public.partner_agents for select
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- MESSAGES TABLE
-- Stores every inbound/outbound message from all connected channels.
-- Populated by Supabase Edge Function webhook handlers.
-- ─────────────────────────────────────────────
create table if not exists public.messages (
  id                  uuid        default gen_random_uuid() primary key,
  partner_id          uuid        references public.partners(id) on delete cascade,
  channel             text        not null,  -- 'whatsapp' | 'telegram' | 'messenger' | 'instagram' | 'line' | 'wechat' | 'email' | 'livechat'
  direction           text        not null check (direction in ('inbound', 'outbound')),
  sender_id           text,                  -- platform user ID of the sender
  sender_name         text,                  -- display name if available
  recipient_id        text,                  -- platform user ID of the recipient
  content             text,                  -- message body text
  content_type        text        not null default 'text',  -- 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'location'
  media_url           text,                  -- URL to media attachment if any
  external_message_id text,                  -- message ID from the originating platform
  status              text        not null default 'received' check (status in ('received', 'sent', 'delivered', 'read', 'failed')),
  raw_payload         jsonb,                 -- full webhook payload for debugging / replay
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Fast lookup by partner + channel + time (inbox view)
create index if not exists messages_partner_channel_idx on public.messages (partner_id, channel, created_at desc);
-- Fast lookup by sender (contact timeline)
create index if not exists messages_sender_idx          on public.messages (sender_id, created_at desc);
-- Dedup: unique per channel + platform message ID (partial — excludes live chat which has no external ID)
create unique index if not exists messages_dedup_idx on public.messages (channel, external_message_id)
  where external_message_id is not null;

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists messages_updated_at on public.messages;
create trigger messages_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

-- RLS: enabled, service-role key (used by Edge Functions) bypasses it
alter table public.messages enable row level security;

drop policy if exists "Partners read own messages" on public.messages;
drop policy if exists "Service role insert messages" on public.messages;

-- Authenticated partners can read their own messages
create policy "Partners read own messages"
  on public.messages for select
  using (
    partner_id in (
      select id from public.partners where user_id = auth.uid()
    )
  );

-- Edge Functions use service_role key → bypasses RLS (no insert policy needed)

-- ─────────────────────────────────────────────
-- SUPPORT REQUESTS TABLE
-- Stores visitor info collected by the embedded chat widget.
-- Populated by the chat-support Edge Function.
-- partner_id stores the readable "PART-XXXX-XXXX" value from partners.partner_id.
-- ─────────────────────────────────────────────
create table if not exists public.support_requests (
  id              uuid        default gen_random_uuid() primary key,
  partner_id      text,                 -- matches partners.partner_id (e.g. "PART-XXXX-XXXX")
  visitor_name    text        not null,
  visitor_contact text        not null, -- email or phone entered by visitor
  company         text,                 -- company name (optional)
  topic           text,                 -- support topic / category (optional)
  message         text        not null,
  status          text        not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at      timestamptz not null default now()
);

create index if not exists support_requests_partner_idx
  on public.support_requests (partner_id, created_at desc);

alter table public.support_requests enable row level security;

drop policy if exists "Partners read own support requests"   on public.support_requests;
drop policy if exists "Partners update own support requests" on public.support_requests;
drop policy if exists "Allow anonymous insert" on public.support_requests;

-- Authenticated partners can read and update their own support requests
create policy "Partners read own support requests"
  on public.support_requests for select
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );

create policy "Partners update own support requests"
  on public.support_requests for update
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );

-- The public chat widget submits support requests anonymously
create policy "Allow anonymous insert"
  on public.support_requests for insert
  with check (true);

-- ─────────────────────────────────────────────
-- LIVE CHAT TABLES
-- Real-time web chat between widget visitors and partner staff.
-- Separate from channel webhooks — no external platform needed.
-- ─────────────────────────────────────────────
create table if not exists public.live_chats (
  id              uuid        default gen_random_uuid() primary key,
  partner_id      text        not null,   -- partners.partner_id text "PART-XXXX"
  visitor_name    text        not null,
  visitor_contact text        not null,
  initial_message text,
  status          text        not null default 'waiting'
                              check (status in ('waiting', 'active', 'closed')),
  assigned_agent  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists live_chats_partner_idx
  on public.live_chats (partner_id, created_at desc);

create table if not exists public.live_chat_messages (
  id          uuid        default gen_random_uuid() primary key,
  chat_id     uuid        not null references public.live_chats(id) on delete cascade,
  role        text        not null check (role in ('visitor', 'agent', 'ai')),
  sender_name text,
  content     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists live_chat_messages_idx
  on public.live_chat_messages (chat_id, created_at asc);

alter table public.live_chats        enable row level security;
alter table public.live_chat_messages enable row level security;

drop policy if exists "Partners read own live chats"    on public.live_chats;
drop policy if exists "Partners update own live chats"  on public.live_chats;
drop policy if exists "Allow anonymous insert live_chats" on public.live_chats;
drop policy if exists "Agents read assigned live_chats"   on public.live_chats;
drop policy if exists "Agents update assigned live_chats" on public.live_chats;

create policy "Partners read own live chats"
  on public.live_chats for select
  using (partner_id in (select partner_id from public.partners where user_id = auth.uid()));

create policy "Partners update own live chats"
  on public.live_chats for update
  using (partner_id in (select partner_id from public.partners where user_id = auth.uid()));

-- The public chat widget creates live chat sessions anonymously
create policy "Allow anonymous insert live_chats"
  on public.live_chats for insert
  with check (true);

create policy "Agents read assigned live_chats"
  on public.live_chats for select
  using (partner_id in (select partner_id from public.partner_agents where user_id = auth.uid()));

create policy "Agents update assigned live_chats"
  on public.live_chats for update
  using (partner_id in (select partner_id from public.partner_agents where user_id = auth.uid()));

drop policy if exists "Partners read live chat messages"   on public.live_chat_messages;
drop policy if exists "Partners insert live chat messages" on public.live_chat_messages;
drop policy if exists "Allow all on live_chat_messages"    on public.live_chat_messages;
drop policy if exists "Allow read on live_chat_messages"   on public.live_chat_messages;

-- Widget visitors (anonymous) and partner staff both read/write these —
-- access is effectively gated by knowing the chat_id (a uuid handed back
-- by the widget-init/live-chat functions), not by RLS row ownership.
create policy "Allow all on live_chat_messages"
  on public.live_chat_messages for all
  with check (true);

create policy "Allow read on live_chat_messages"
  on public.live_chat_messages for select
  using (true);

-- Enable Realtime for live chat tables (guarded — "add table" errors if the
-- table is already a publication member, e.g. from a previous run of this
-- script or of the migration)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_chats'
  ) then
    alter publication supabase_realtime add table public.live_chats;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_chat_messages'
  ) then
    alter publication supabase_realtime add table public.live_chat_messages;
  end if;
end $$;
