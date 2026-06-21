-- ─────────────────────────────────────────────────────────────────────────────
-- partners
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.partners (
  id                uuid primary key default gen_random_uuid(),
  partner_id        text unique not null,
  partner_name      text not null,
  email             text,
  user_id           uuid references auth.users(id) on delete cascade,
  ai_business_context text,
  created_at        timestamptz default now()
);
alter table public.partners enable row level security;
create policy "Partners can read own record"
  on public.partners for select
  using (auth.uid() = user_id);
create policy "Partners can update own record"
  on public.partners for update
  using (auth.uid() = user_id);
create policy "Allow insert on signup"
  on public.partners for insert
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- channel_configs
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.channel_configs (
  id          uuid primary key default gen_random_uuid(),
  partner_id  text not null references public.partners(partner_id) on delete cascade,
  channel_id  text not null,
  channel     text,
  account_id  text,
  configured  boolean default true,
  created_at  timestamptz default now(),
  unique(partner_id, channel_id)
);
alter table public.channel_configs enable row level security;
create policy "Partners access own channel_configs"
  on public.channel_configs for all
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- partner_agents
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.partner_agents (
  id           uuid primary key default gen_random_uuid(),
  partner_id   text not null,
  user_id      uuid references auth.users(id) on delete set null,
  name         text not null,
  email        text not null,
  role         text not null default 'agent',
  avatar_color text,
  created_at   timestamptz default now()
);
alter table public.partner_agents enable row level security;
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

-- ─────────────────────────────────────────────────────────────────────────────
-- messages (webhook inbound/outbound)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id                  uuid primary key default gen_random_uuid(),
  partner_id          uuid references public.partners(id) on delete set null,
  channel             text not null,
  direction           text not null check (direction in ('inbound','outbound')),
  sender_id           text,
  sender_name         text,
  recipient_id        text,
  content             text,
  content_type        text default 'text',
  media_url           text,
  external_message_id text unique,
  status              text default 'received',
  raw_payload         jsonb,
  created_at          timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Partners read own messages"
  on public.messages for select
  using (
    partner_id in (
      select id from public.partners where user_id = auth.uid()
    )
  );
create policy "Service role insert messages"
  on public.messages for insert
  with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- support_requests
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.support_requests (
  id              uuid primary key default gen_random_uuid(),
  partner_id      text,
  visitor_name    text not null,
  visitor_contact text not null,
  message         text not null,
  company         text,
  topic           text,
  status          text default 'new',
  created_at      timestamptz default now()
);
alter table public.support_requests enable row level security;
create policy "Partners read own support requests"
  on public.support_requests for select
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );
create policy "Allow anonymous insert"
  on public.support_requests for insert
  with check (true);
create policy "Partners update own support requests"
  on public.support_requests for update
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- live_chats
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.live_chats (
  id              uuid primary key default gen_random_uuid(),
  partner_id      text not null,
  visitor_name    text,
  visitor_contact text,
  initial_message text,
  status          text default 'waiting',
  created_at      timestamptz default now()
);
alter table public.live_chats enable row level security;
create policy "Partners read own live_chats"
  on public.live_chats for select
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );
create policy "Partners update own live_chats"
  on public.live_chats for update
  using (
    partner_id in (
      select partner_id from public.partners where user_id = auth.uid()
    )
  );
create policy "Allow anonymous insert live_chats"
  on public.live_chats for insert
  with check (true);
create policy "Agents read assigned live_chats"
  on public.live_chats for select
  using (
    partner_id in (
      select partner_id from public.partner_agents where user_id = auth.uid()
    )
  );
create policy "Agents update assigned live_chats"
  on public.live_chats for update
  using (
    partner_id in (
      select partner_id from public.partner_agents where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- live_chat_messages
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.live_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.live_chats(id) on delete cascade,
  role        text not null,
  sender_name text,
  content     text,
  created_at  timestamptz default now()
);
alter table public.live_chat_messages enable row level security;
create policy "Allow all on live_chat_messages"
  on public.live_chat_messages for all
  with check (true);
create policy "Allow read on live_chat_messages"
  on public.live_chat_messages for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.live_chats;
alter publication supabase_realtime add table public.live_chat_messages;
