-- Weft: Server-side article storage (AIX-39)
-- Stores articles fetched by the server-side feed cron job.
-- Replaces client-side RSS fetching via cors-proxy.

-- ==================== ARTICLES ====================
create table public.articles (
    id             bigint generated always as identity primary key,
    guid           text          not null unique, -- dedup key: rss guid or article url
    title          text          not null,
    description    text          not null default '',
    link           text          not null,
    pub_date       timestamptz   not null,
    source         text          not null,  -- feed display name
    category       text          not null,  -- category key from feeds config
    feed_url       text          not null,
    keywords       text[]        not null default '{}',
    created_at     timestamptz   not null default now(),
    updated_at     timestamptz   not null default now()
);

create index articles_pub_date_idx  on public.articles (pub_date desc);
create index articles_category_idx  on public.articles (category);
create index articles_source_idx    on public.articles (source);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger articles_updated_at
    before update on public.articles
    for each row execute function public.set_updated_at();

-- Public read (articles are not user-specific)
alter table public.articles enable row level security;

create policy "Articles are publicly readable"
    on public.articles for select
    using (true);

-- ==================== FEED HEALTH ====================
create table public.feed_health (
    id                   bigint generated always as identity primary key,
    feed_url             text        not null unique,
    feed_name            text        not null,
    category             text        not null,
    last_fetch_at        timestamptz,
    last_success_at      timestamptz,
    last_error           text,
    consecutive_errors   integer     not null default 0,
    total_articles       integer     not null default 0,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

create trigger feed_health_updated_at
    before update on public.feed_health
    for each row execute function public.set_updated_at();

alter table public.feed_health enable row level security;

create policy "Feed health is publicly readable"
    on public.feed_health for select
    using (true);
