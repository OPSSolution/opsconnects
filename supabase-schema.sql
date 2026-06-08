-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run on your existing schema.

-- 1. Add auth link + email to partners (safe if already exists)
alter table public.partners
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists email   text;

-- 2. Enable RLS on all tables
alter table public.partners       enable row level security;
alter table public.channel_configs enable row level security;
alter table public.team_members   enable row level security;
alter table public.conversations  enable row level security;

-- 3. Partners policies
drop policy if exists "Public read partners"      on public.partners;
drop policy if exists "Users insert own partner"  on public.partners;
drop policy if exists "Users update own partner"  on public.partners;

create policy "Public read partners"
  on public.partners for select using (true);

create policy "Users insert own partner"
  on public.partners for insert with check (true);

create policy "Users update own partner"
  on public.partners for update using (auth.uid() = user_id);

-- 4. Channel configs policies
drop policy if exists "Public read channel_configs"  on public.channel_configs;
drop policy if exists "Users manage channel_configs" on public.channel_configs;

create policy "Public read channel_configs"
  on public.channel_configs for select using (true);

create policy "Users manage channel_configs"
  on public.channel_configs for all using (true);
