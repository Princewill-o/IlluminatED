-- IlluminatED safety: contact messages, urgent reports, member blocks and moderator tools
-- Run after 0002_accounts_tutoring.sql. Safe to run more than once.

-- ─────────────────────────────────────────────────────────────
-- Contact messages (from the /contact form; signed in or not)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.contact_messages (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid default auth.uid() references auth.users (id) on delete set null,
  name        text check (name is null or char_length(name) between 1 and 80),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  topic       text not null check (topic in ('general', 'account', 'correction', 'safeguarding', 'tutoring', 'privacy')),
  message     text not null check (char_length(message) between 10 and 4000),
  status      text not null default 'new' check (status in ('new', 'handled')),
  handled_by  uuid references public.profiles (id) on delete set null
);
create index if not exists contact_messages_open on public.contact_messages (topic, created_at desc) where status = 'new';
create index if not exists contact_messages_created on public.contact_messages (created_at desc);

-- New messages: never trust status, handler or time from the browser, and slow down floods.
create or replace function private.prepare_contact_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent integer;
begin
  select count(*) into recent from contact_messages
    where created_at > now() - interval '1 hour'
      and (lower(email) = lower(new.email) or (new.user_id is not null and user_id = new.user_id));
  if recent >= 5 then raise exception 'rate_limited'; end if;
  select count(*) into recent from contact_messages where created_at > now() - interval '1 minute';
  if recent >= 30 then raise exception 'rate_limited'; end if;
  new.created_at := now();
  new.status := 'new';
  new.handled_by := null;
  return new;
end;
$$;
revoke all on function private.prepare_contact_message() from public, anon, authenticated;

drop trigger if exists contact_messages_prepare on public.contact_messages;
create trigger contact_messages_prepare before insert on public.contact_messages
  for each row execute function private.prepare_contact_message();

alter table public.contact_messages enable row level security;

drop policy if exists "anyone sends contact messages" on public.contact_messages;
create policy "anyone sends contact messages" on public.contact_messages for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
drop policy if exists "moderators read contact messages" on public.contact_messages;
create policy "moderators read contact messages" on public.contact_messages for select to authenticated
  using ((select private.is_moderator()));
drop policy if exists "moderators handle contact messages" on public.contact_messages;
create policy "moderators handle contact messages" on public.contact_messages for update to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));

revoke all on public.contact_messages from anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;
grant usage on sequence public.contact_messages_id_seq to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Urgent reports: someone may be at risk, or personal information was shared
-- ─────────────────────────────────────────────────────────────

alter table public.reports
  add column if not exists urgent boolean generated always as (reason in ('self-harm', 'personal-info')) stored;
create index if not exists reports_urgent_open on public.reports (created_at) where urgent and not resolved;

-- ─────────────────────────────────────────────────────────────
-- Member blocks: hide someone's threads and replies from yourself
-- ─────────────────────────────────────────────────────────────

create table if not exists public.user_blocks (
  blocker     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists user_blocks_blocked on public.user_blocks (blocked);

alter table public.user_blocks enable row level security;

drop policy if exists "own blocks readable" on public.user_blocks;
create policy "own blocks readable" on public.user_blocks for select to authenticated
  using (blocker = (select auth.uid()));
drop policy if exists "own blocks insert" on public.user_blocks;
create policy "own blocks insert" on public.user_blocks for insert to authenticated
  with check (blocker = (select auth.uid()));
drop policy if exists "own blocks delete" on public.user_blocks;
create policy "own blocks delete" on public.user_blocks for delete to authenticated
  using (blocker = (select auth.uid()));

revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Blocked terms: 0001 already gives moderators full access ("moderators manage
-- blocked terms", for all). Only add separate policies if that one is missing.
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blocked_terms'
                 and policyname = 'moderators manage blocked terms') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blocked_terms'
                   and policyname = 'moderators read blocked terms') then
      create policy "moderators read blocked terms" on public.blocked_terms for select to authenticated
        using ((select private.is_moderator()));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blocked_terms'
                   and policyname = 'moderators add blocked terms') then
      create policy "moderators add blocked terms" on public.blocked_terms for insert to authenticated
        with check ((select private.is_moderator()));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blocked_terms'
                   and policyname = 'moderators remove blocked terms') then
      create policy "moderators remove blocked terms" on public.blocked_terms for delete to authenticated
        using ((select private.is_moderator()));
    end if;
  end if;
end;
$$;
grant select, insert, delete on public.blocked_terms to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Unbanning: bans are profiles.banned. 0001's "moderators update profiles"
-- policy already lets moderators set banned = false (the moderation page does
-- exactly that). Recreate it only if it has gone missing.
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
                 and policyname = 'moderators update profiles') then
    create policy "moderators update profiles" on public.profiles for update to authenticated
      using ((select private.is_moderator())) with check ((select private.is_moderator()));
  end if;
end;
$$;
grant update on public.profiles to authenticated;
