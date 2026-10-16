-- Access by invitation: people book a demo, we talk, then invite them.
-- Anyone already set up keeps access. New accounts need an invite (by email)
-- before they can finish setting up.

create table if not exists public.demo_requests (
  id bigint generated always as identity primary key,
  name text not null check (length(name) between 2 and 80),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  role text not null check (role in ('student', 'parent', 'teacher', 'leader', 'other')),
  organisation_type text not null check (organisation_type in ('individual', 'school', 'college', 'sixth-form', 'trust', 'other')),
  organisation text check (length(organisation) <= 120),
  learners integer check (learners between 1 and 100000),
  times text check (length(times) <= 300),
  message text check (length(message) <= 1000),
  status text not null default 'new' check (status in ('new', 'booked', 'invited', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists demo_requests_created on public.demo_requests (created_at desc);
alter table public.demo_requests enable row level security;
-- Anyone can ask for a demo; only platform admins can read requests.
create policy "anyone can request a demo" on public.demo_requests for insert to anon, authenticated with check (status = 'new');
create policy "admins read demo requests" on public.demo_requests for select to authenticated using (private.is_platform_admin());
create policy "admins update demo requests" on public.demo_requests for update to authenticated using (private.is_platform_admin());

create table if not exists public.access_invites (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  note text check (length(note) <= 200),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.access_invites enable row level security;
create policy "admins manage invites" on public.access_invites for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

-- Can the signed-in person use the platform? Existing learners yes; new ones only if invited.
create or replace function public.access_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.learner_details d where d.user_id = (select auth.uid()))
    or exists (select 1 from public.access_invites i join auth.users u on lower(u.email) = i.email where u.id = (select auth.uid()))
    or private.is_platform_admin()
  );
$$;
revoke all on function public.access_allowed() from public, anon;
grant execute on function public.access_allowed() to authenticated;
