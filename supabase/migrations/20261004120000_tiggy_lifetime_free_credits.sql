-- Free Tiggy credits are a one-time allowance. Premium retains its daily limit.
-- Existing free users keep their recorded usage; no previously used credits are restored.
create table if not exists public.tiggy_free_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now()
);
alter table public.tiggy_free_credits enable row level security;
revoke all on public.tiggy_free_credits from public, anon, authenticated;
grant select on public.tiggy_free_credits to authenticated;
drop policy if exists "own free Tiggy credits readable" on public.tiggy_free_credits;
create policy "own free Tiggy credits readable" on public.tiggy_free_credits
  for select to authenticated using (user_id = (select auth.uid()));

insert into public.tiggy_free_credits (user_id, used)
select u.user_id, sum(u.messages)::integer
from public.tiggy_usage u
where not exists (
  select 1 from public.subscriptions s
  where s.user_id = u.user_id and s.plan = 'premium'
)
group by u.user_id
on conflict (user_id) do update set used = greatest(public.tiggy_free_credits.used, excluded.used);

create or replace function public.tiggy_consume() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := private.london_today();
  plan text;
  lim integer;
  used integer;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not private.is_active_member() then raise exception 'not_allowed'; end if;
  if not exists (select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null) then
    raise exception 'email_not_verified';
  end if;
  plan := private.tiggy_plan(uid);
  lim := private.tiggy_limit(plan);
  if plan = 'free' then
    insert into public.tiggy_free_credits as c (user_id, used) values (uid, 1)
    on conflict (user_id) do update set used = c.used + 1, updated_at = now()
      where c.used < lim
    returning c.used into used;
  else
    insert into public.tiggy_usage as u (user_id, day, messages) values (uid, today, 1)
    on conflict (user_id, day) do update set messages = u.messages + 1
      where u.messages < lim
    returning u.messages into used;
    if used = 1 then delete from public.tiggy_usage where day < today - 7; end if;
  end if;
  if used is null or used > lim then raise exception 'limit_reached'; end if;
  return lim - used;
end;
$$;
revoke all on function public.tiggy_consume() from public, anon;
grant execute on function public.tiggy_consume() to authenticated;

create or replace function public.tiggy_status()
returns table (plan text, used integer, max_per_day integer, remaining integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  p text;
  n integer;
begin
  if uid is null then return; end if;
  p := private.tiggy_plan(uid);
  if p = 'free' then
    select coalesce((select c.used from public.tiggy_free_credits c where c.user_id = uid), 0) into n;
  else
    select coalesce((select t.messages from public.tiggy_usage t
      where t.user_id = uid and t.day = private.london_today()), 0) into n;
  end if;
  return query select p, n, private.tiggy_limit(p), greatest(private.tiggy_limit(p) - n, 0);
end;
$$;
revoke all on function public.tiggy_status() from public, anon;
grant execute on function public.tiggy_status() to authenticated;
