-- Phase 5.2 + 5.4: Language and region preferences
-- Adds preferred_language to profiles for persisted language preference
-- Adds preferred_locale for full locale string (e.g. en-US, sv-SE) used for region defaults

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';
