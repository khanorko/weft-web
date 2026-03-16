-- Weft: Referral tracking (AIX-33)
-- Tracks who invited who via ?ref= links

-- Add referred_by column to profiles
alter table public.profiles
  add column if not exists referred_by text;

-- Referrals table for analytics
create table if not exists public.referrals (
  id bigint generated always as identity primary key,
  referrer_code text not null,   -- first 8 chars of referrer's user ID (no dashes)
  new_user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique (new_user_id)           -- one referral per new user
);

alter table public.referrals enable row level security;

-- Only service/anon can insert (API handles auth)
create policy "Anyone can insert referrals"
  on public.referrals for insert
  with check (true);

create index idx_referrals_code
  on public.referrals (referrer_code);
