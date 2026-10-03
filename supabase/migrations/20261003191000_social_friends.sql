-- Mutual, opt-in Social connections. No private messages are stored here.
create table public.social_friend_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  allow_requests boolean not null default false
);
alter table public.social_friend_settings enable row level security;
create policy "own friend setting readable" on public.social_friend_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own friend setting insert" on public.social_friend_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own friend setting update" on public.social_friend_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.social_friend_settings from anon, authenticated;
grant select, insert on public.social_friend_settings to authenticated;
grant update(allow_requests) on public.social_friend_settings to authenticated;

create table public.social_connections (
  requester uuid not null references public.profiles(id) on delete cascade,
  recipient uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, recipient),
  check (requester <> recipient)
);
create index social_connections_recipient on public.social_connections(recipient, status);
create unique index social_connections_one_pair on public.social_connections(least(requester, recipient), greatest(requester, recipient));

create or replace function private.social_connection_allowed(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a <> b
    and exists(select 1 from profiles where id = a and not banned)
    and exists(select 1 from profiles where id = b and not banned)
    and exists(select 1 from social_friend_settings where user_id = b and allow_requests)
    and not exists(select 1 from user_blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;

create or replace function public.can_request_friend(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select auth.uid()) is not null and private.social_connection_allowed((select auth.uid()), target);
$$;
revoke all on function public.can_request_friend(uuid) from public;
grant execute on function public.can_request_friend(uuid) to authenticated;

alter table public.social_connections enable row level security;
create policy "participants see connections" on public.social_connections for select to authenticated
  using (requester = (select auth.uid()) or recipient = (select auth.uid()));
create policy "active member requests connection" on public.social_connections for insert to authenticated
  with check (requester = (select auth.uid()) and status = 'pending' and private.social_connection_allowed(requester, recipient));
create policy "recipient accepts connection" on public.social_connections for update to authenticated
  using (recipient = (select auth.uid()) and status = 'pending')
  with check (recipient = (select auth.uid()) and status = 'accepted');
create policy "participants remove connection" on public.social_connections for delete to authenticated
  using (requester = (select auth.uid()) or recipient = (select auth.uid()));
revoke all on public.social_connections from anon, authenticated;
grant select, insert, delete on public.social_connections to authenticated;
grant update(status) on public.social_connections to authenticated;

create or replace function public.remove_blocked_connection() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from social_connections where (requester = new.blocker and recipient = new.blocked)
    or (requester = new.blocked and recipient = new.blocker);
  return new;
end;
$$;
create trigger remove_connection_on_block after insert on public.user_blocks
  for each row execute function public.remove_blocked_connection();
