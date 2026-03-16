-- Weft: Daily briefing cache for /briefing/[date] public SEO pages (AIX-32)

create table public.daily_briefings (
  date date primary key,
  stories jsonb not null default '[]',
  -- Each story: { title, url, source, category, score, summary, pubDate, trending }
  narrative text,
  categories jsonb,
  -- { "AI": [...story indices], "World": [...], ... }
  meta jsonb,
  -- { feedsFetched, articlesConsidered, generatedAt, model }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Public read, write restricted to service role (anon can insert via API secret)
alter table public.daily_briefings enable row level security;

create policy "Anyone can read daily briefings"
  on public.daily_briefings for select
  using (true);

create policy "Anyone can insert daily briefings"
  on public.daily_briefings for insert
  with check (true);

create policy "Anyone can update daily briefings"
  on public.daily_briefings for update
  using (true);

create index idx_daily_briefings_date
  on public.daily_briefings (date desc);

create trigger set_daily_briefings_updated_at
  before update on public.daily_briefings
  for each row execute procedure public.update_updated_at();
