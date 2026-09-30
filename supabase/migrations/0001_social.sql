-- IlluminatEDSocial schema
-- Run this once in the Supabase SQL editor (or with `supabase db push`).
-- Everything is protected by Row Level Security: the publishable key used in
-- the browser can only do what the policies below allow.

create extension if not exists citext with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    extensions.citext not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  role        text not null default 'member' check (role in ('member', 'moderator')),
  banned      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.threads (
  id                bigint generated always as identity primary key,
  category          text not null check (category in ('sixth-form', 'universities', 'applying', 'apprenticeships', 'student-life', 'chat')),
  university        text check (university is null or char_length(university) between 2 and 80),
  title             text not null check (char_length(title) between 5 and 120),
  body              text not null check (char_length(body) between 10 and 5000),
  author_id         uuid not null references public.profiles (id) on delete cascade,
  reply_count       integer not null default 0,
  report_count      integer not null default 0,
  hidden            boolean not null default false,
  locked            boolean not null default false,
  created_at        timestamptz not null default now(),
  last_activity_at  timestamptz not null default now()
);
create index threads_category_activity on public.threads (category, last_activity_at desc);
create index threads_activity on public.threads (last_activity_at desc);
create index threads_author on public.threads (author_id, created_at desc);
create index threads_university on public.threads (lower(university)) where university is not null;

create table public.posts (
  id            bigint generated always as identity primary key,
  thread_id     bigint not null references public.threads (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 5000),
  report_count  integer not null default 0,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);
create index posts_thread on public.posts (thread_id, created_at);
create index posts_author on public.posts (author_id, created_at desc);

create table public.reports (
  id           bigint generated always as identity primary key,
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  thread_id    bigint references public.threads (id) on delete cascade,
  post_id      bigint references public.posts (id) on delete cascade,
  reason       text not null check (reason in ('bullying', 'personal-info', 'spam', 'inappropriate', 'self-harm', 'other')),
  note         text check (note is null or char_length(note) <= 300),
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  check ((thread_id is null) <> (post_id is null))
);
create unique index reports_one_per_thread on public.reports (reporter_id, thread_id) where thread_id is not null;
create unique index reports_one_per_post on public.reports (reporter_id, post_id) where post_id is not null;
create index reports_thread on public.reports (thread_id) where thread_id is not null;
create index reports_post on public.reports (post_id) where post_id is not null;
create index reports_open on public.reports (created_at) where not resolved;

-- Words or phrases moderators want blocked. Matched case-insensitively.
create table public.blocked_terms (
  term text primary key check (char_length(term) between 2 and 60)
);

-- ─────────────────────────────────────────────────────────────
-- Helper functions (kept in a private schema so they aren't exposed through the API)
-- ─────────────────────────────────────────────────────────────

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = (select auth.uid()) and role = 'moderator' and not banned);
$$;

create or replace function private.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = (select auth.uid()) and not banned);
$$;

-- Rejects contact details, blocked terms and flooding. Runs before every new thread or reply.
create or replace function public.check_new_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  txt text := coalesce(new.body, '') || ' ' || coalesce(to_jsonb(new) ->> 'title', '');
  recent integer;
begin
  if txt ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' then
    raise exception 'contact_details' using hint = 'Please do not share email addresses.';
  end if;
  if regexp_replace(txt, '[\s().-]', '', 'g') ~ '(\+44|0)7\d{9}' then
    raise exception 'contact_details' using hint = 'Please do not share phone numbers.';
  end if;
  if exists (select 1 from blocked_terms b where lower(txt) like '%' || lower(b.term) || '%') then
    raise exception 'blocked_term';
  end if;
  select (select count(*) from threads where author_id = new.author_id and created_at > now() - interval '1 minute')
       + (select count(*) from posts where author_id = new.author_id and created_at > now() - interval '1 minute')
    into recent;
  if recent >= 3 then
    raise exception 'rate_limited';
  end if;
  if tg_table_name = 'threads' and
     (select count(*) from threads where author_id = new.author_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;

create trigger threads_check before insert on public.threads for each row execute function public.check_new_content();
create trigger posts_check before insert on public.posts for each row execute function public.check_new_content();

-- Keep reply counts and activity times in step with posts.
create or replace function public.bump_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update threads set reply_count = reply_count + 1, last_activity_at = now() where id = new.thread_id;
  elsif tg_op = 'DELETE' then
    update threads set reply_count = greatest(reply_count - 1, 0) where id = old.thread_id;
  end if;
  return null;
end;
$$;
create trigger posts_bump after insert or delete on public.posts for each row execute function public.bump_thread();

-- Count reports; hide content automatically after three separate reports until a moderator reviews it.
create or replace function public.apply_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.thread_id is not null then
    update threads set report_count = report_count + 1, hidden = hidden or report_count + 1 >= 3 where id = new.thread_id;
  else
    update posts set report_count = report_count + 1, hidden = hidden or report_count + 1 >= 3 where id = new.post_id;
  end if;
  return null;
end;
$$;
create trigger reports_apply after insert on public.reports for each row execute function public.apply_report();

-- Lets a signed-in user delete their own account and everything they posted.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;
-- Intentionally callable by signed-in users (Supabase's advisor will list it as a notice).
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Universities mentioned in visible threads, for the universities index.
create or replace view public.university_counts with (security_invoker = true) as
  select min(university) as university, count(*)::int as thread_count, max(last_activity_at) as last_activity_at
  from public.threads
  where university is not null and not hidden
  group by lower(university);

-- Trigger functions are never called directly through the API.
revoke all on function public.check_new_content() from public, anon, authenticated;
revoke all on function public.bump_thread() from public, anon, authenticated;
revoke all on function public.apply_report() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- API access (Row Level Security below decides which rows)
-- ─────────────────────────────────────────────────────────────

revoke all on public.profiles, public.threads, public.posts, public.reports, public.blocked_terms, public.university_counts from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.threads, public.posts, public.university_counts to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.threads, public.posts to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert, update, delete on public.blocked_terms to authenticated;
grant usage on all sequences in schema public to authenticated;
revoke all on function private.is_moderator(), private.is_active_member() from public;
grant execute on function private.is_moderator(), private.is_active_member() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;
alter table public.reports enable row level security;
alter table public.blocked_terms enable row level security;

-- Profiles: usernames are public. You can create your own profile as a member; only moderators can change roles or bans.
create policy "profiles readable" on public.profiles for select using (true);
create policy "create own profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'member' and banned = false);
create policy "moderators update profiles" on public.profiles for update to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));

-- Threads
create policy "threads readable" on public.threads for select
  using (not hidden or author_id = (select auth.uid()) or (select private.is_moderator()));
create policy "members start threads" on public.threads for insert to authenticated
  with check (author_id = (select auth.uid()) and (select private.is_active_member())
              and not hidden and not locked and reply_count = 0 and report_count = 0);
create policy "moderators update threads" on public.threads for update to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));
create policy "authors and moderators delete threads" on public.threads for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_moderator()));

-- Replies
create policy "posts readable" on public.posts for select
  using (not hidden or author_id = (select auth.uid()) or (select private.is_moderator()));
create policy "members reply" on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and (select private.is_active_member()) and not hidden and report_count = 0
              and exists (select 1 from public.threads t where t.id = thread_id and not t.locked and not t.hidden));
create policy "moderators update posts" on public.posts for update to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));
create policy "authors and moderators delete posts" on public.posts for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_moderator()));

-- Reports: members file them; only moderators read or resolve them.
create policy "members report" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select private.is_active_member()) and not resolved);
create policy "moderators read reports" on public.reports for select to authenticated using ((select private.is_moderator()));
create policy "moderators resolve reports" on public.reports for update to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));

-- Blocked terms: moderators only.
create policy "moderators manage blocked terms" on public.blocked_terms for all to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));

-- To make someone a moderator, run in the SQL editor:
--   update public.profiles set role = 'moderator' where username = 'their_username';
