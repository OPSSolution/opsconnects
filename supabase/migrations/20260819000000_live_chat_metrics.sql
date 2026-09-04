-- Adds the columns needed to compute real resolution-rate / CSAT metrics
-- (previously these were hardcoded mock numbers in the dashboard UI).

alter table public.live_chats
  add column if not exists rating    smallint,
  add column if not exists rated_at  timestamptz;

alter table public.live_chats
  add constraint live_chats_rating_range check (rating is null or (rating between 1 and 5));

alter table public.support_requests
  add column if not exists resolved_at timestamptz;
