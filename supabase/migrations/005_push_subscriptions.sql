-- Weft: Push notification subscriptions (AIX-37)
-- Stores Web Push subscriptions per user device

-- ==================== PUSH SUBSCRIPTIONS ====================
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ==================== PUSH SETTINGS IN PROFILES ====================
alter table public.profiles
  add column if not exists push_breaking boolean default true,
  add column if not exists push_threshold integer default 9,
  add column if not exists push_quiet_start text default '22:00',
  add column if not exists push_quiet_end text default '08:00';
