-- Weft: Shared article summaries for public shareable URLs (AIX-31)
-- Public table: anyone can read, authenticated users can insert

create table public.shared_summaries (
  id text primary key,                    -- hash of article URL (dedup key)
  article_url text not null,
  article_title text not null,
  article_source text not null,
  article_date timestamptz,
  category text,
  summary text not null,
  summary_style text default 'newsletter',
  share_count integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: public read, rate-limited write handled at API layer
alter table public.shared_summaries enable row level security;

create policy "Anyone can read shared summaries"
  on public.shared_summaries for select
  using (true);

create policy "Anyone can insert shared summaries"
  on public.shared_summaries for insert
  with check (true);

create policy "Anyone can update share count"
  on public.shared_summaries for update
  using (true);

-- Index for fast lookups
create index idx_shared_summaries_created
  on public.shared_summaries (created_at desc);

-- Updated_at trigger
create trigger set_shared_summaries_updated_at
  before update on public.shared_summaries
  for each row execute procedure public.update_updated_at();
