-- Weft: Initial schema for Supabase auth + persistence
-- profiles: extends auth.users with app settings
-- article_interactions: bookmarks, likes, scores, summaries per user

-- ==================== PROFILES ====================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  filter_interests text default 'AI, machine learning, LLMs, generative AI, tech industry',
  filter_threshold integer default 6,
  summary_style text default 'newsletter',
  llm_provider text default 'groq',
  use_own_key boolean default false,
  custom_styles jsonb default '{}'::jsonb,
  disabled_feeds text[] default '{}',
  custom_feeds jsonb default '[]'::jsonb,
  theme text default 'dark',
  sidebar_width integer default 400,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==================== ARTICLE INTERACTIONS ====================
create table public.article_interactions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  article_id text not null,
  score integer,
  score_reason text,
  groq_summary text,
  read boolean default false,
  read_duration_seconds integer default 0,
  bookmarked boolean default false,
  liked boolean default false,
  disliked boolean default false,
  summary text,
  summary_style text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, article_id)
);

-- RLS
alter table public.article_interactions enable row level security;

create policy "Users can view own interactions"
  on public.article_interactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own interactions"
  on public.article_interactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own interactions"
  on public.article_interactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own interactions"
  on public.article_interactions for delete
  using (auth.uid() = user_id);

-- Index for fast lookups
create index idx_interactions_user_article
  on public.article_interactions (user_id, article_id);

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger set_interactions_updated_at
  before update on public.article_interactions
  for each row execute procedure public.update_updated_at();
