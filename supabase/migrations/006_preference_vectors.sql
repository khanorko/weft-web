-- Phase 3.2: Adaptive scoring — preference vectors
-- Adds preference_vector to profiles for persisted user taste model
-- Adds scroll_depth_pct to article_interactions for implicit signal tracking

-- Preference vector: { sources: {src: score}, keywords: {kw: score}, categories: {cat: score}, updatedAt: ts }
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preference_vector jsonb DEFAULT '{}'::jsonb;

-- Scroll depth tracking (0–100%)
ALTER TABLE public.article_interactions
  ADD COLUMN IF NOT EXISTS scroll_depth_pct integer DEFAULT 0;
