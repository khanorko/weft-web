-- Weft: Email digest preferences (AIX-36)
-- Add digest frequency and unsubscribe token to profiles

alter table public.profiles
  add column if not exists email_digest text default 'off' check (email_digest in ('off', 'daily', 'weekly'));

-- Unsubscribe token: random UUID generated on first opt-in, never changes
-- Embedded in every email link so users can one-click unsubscribe without login
alter table public.profiles
  add column if not exists unsubscribe_token uuid default gen_random_uuid();

-- API endpoint for unsubscribe: POST /api/unsubscribe?token=<uuid>
-- Sets email_digest = 'off' where unsubscribe_token = <uuid>
-- No auth required (public endpoint, token is the auth)
create policy "Unsubscribe by token (public)"
  on public.profiles for update
  using (true)
  with check (email_digest = 'off');
