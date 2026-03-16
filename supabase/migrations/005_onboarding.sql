-- Weft: Onboarding fields for user preferences
-- Adds onboarding_done flag and reading_pace to profiles

alter table public.profiles
  add column if not exists onboarding_done boolean default false,
  add column if not exists reading_pace text default 'balanced';
