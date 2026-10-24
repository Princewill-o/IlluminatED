begin;
create table public.marathon_entries (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ends_at timestamptz not null,
  joined_at timestamptz not null default clock_timestamp(),
  rules_version text not null default '2026-11-v1',
  primary key (user_id, ends_at)
);
alter table public.marathon_entries enable row level security;
revoke all on public.marathon_entries from anon, authenticated;
create policy own_entry on public.marathon_entries for select to authenticated using (user_id=(select auth.uid()));
grant select on public.marathon_entries to authenticated;

create function private.marathon_end() returns timestamptz language sql stable set search_path='' as $$
  select greatest((date_trunc('month',now() at time zone 'Europe/London')+interval '1 month') at time zone 'Europe/London', '2026-12-01 00:00:00 Europe/London'::timestamptz)
$$;
create function public.marathon_join(p_eligible boolean, p_guardian boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 if p_eligible is distinct from true or p_guardian is distinct from true then raise exception 'eligibility_required'; end if;
 insert into public.marathon_entries(user_id,ends_at) values(auth.uid(),private.marathon_end()) on conflict do nothing;
end $$;
revoke all on function public.marathon_join(boolean,boolean) from public,anon;
grant execute on function public.marathon_join(boolean,boolean) to authenticated;

create function public.marathon_board() returns jsonb
language plpgsql security definer set search_path='' as $$
declare closing timestamptz:=private.marathon_end(); result jsonb;
begin
 if auth.uid() is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 with scores as (
 select e.user_id,p.username,e.joined_at,
 count(a.id) filter(where a.correct)::int*10 as points,
 count(a.id) filter(where not a.correct)::int as wrong,
 max(a.answered_at) filter(where a.correct) as reached
 from public.marathon_entries e join public.profiles p on p.id=e.user_id and not p.banned
 left join public.champ_entries c on c.user_id=e.user_id
 left join public.champ_attempts a on a.entry_id=c.id and a.answered_at>=greatest(e.joined_at,closing-interval '30 days')
 and a.served_at>=greatest(e.joined_at,closing-interval '30 days') and a.answered_at<closing
 where e.ends_at=closing group by e.user_id,p.username,e.joined_at
 ), ranked as (
 select *,row_number() over(order by points desc,wrong asc,reached asc nulls last,joined_at asc,user_id asc) as rank from scores
 )
 select jsonb_build_object('endsAt',closing,'startsAt',closing-interval '30 days',
 'entered',exists(select 1 from public.marathon_entries where user_id=auth.uid() and ends_at=closing),
 'mine',(select jsonb_build_object('rank',rank,'points',points) from ranked where user_id=auth.uid()),
 'top',coalesce((select jsonb_agg(jsonb_build_object('name',username,'points',points,'rank',rank,'me',user_id=auth.uid()) order by rank) from ranked where rank<=20),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.marathon_board() from public,anon;
grant execute on function public.marathon_board() to authenticated;

create table public.event_coin_purchases(
 user_id uuid not null references public.profiles(id) on delete cascade,
 item text not null check(item in ('marathoner','race-fan','what-if-dreamer')),
 cost integer not null check(cost=25),
 bought_at timestamptz not null default now(),
 primary key(user_id,item)
);
alter table public.event_coin_purchases enable row level security;
revoke all on public.event_coin_purchases from anon,authenticated;
create policy own_coins on public.event_coin_purchases for select to authenticated using(user_id=(select auth.uid()));
grant select on public.event_coin_purchases to authenticated;
create function public.event_coins(p_item text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare earned integer; spent integer; uid uuid:=auth.uid();
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 perform 1 from public.profiles where id=uid for update;
 select count(*) into earned from public.champ_attempts a join public.champ_entries e on e.id=a.entry_id where e.user_id=uid and a.correct;
 select coalesce(sum(cost),0) into spent from public.event_coin_purchases where user_id=uid;
 if p_item is not null then
  if p_item not in ('marathoner','race-fan','what-if-dreamer') then raise exception 'invalid'; end if;
  if exists(select 1 from public.event_coin_purchases where user_id=uid and item=p_item) then raise exception 'already_owned'; end if;
  if earned-spent<25 then raise exception 'not_enough_coins'; end if;
  insert into public.event_coin_purchases values(uid,p_item,25,now()); spent:=spent+25;
 end if;
 return jsonb_build_object('balance',earned-spent,'earned',earned,'owned',coalesce((select jsonb_agg(item) from public.event_coin_purchases where user_id=uid),'[]'::jsonb));
end $$;
revoke all on function public.event_coins(text) from public,anon;
grant execute on function public.event_coins(text) to authenticated;

create function public.public_school_search(p_search text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('name',name)),'[]'::jsonb) from (
 select distinct name from public.school_licences
 where status='active' and (expires_at is null or expires_at>now())
 and length(trim(p_search)) between 2 and 80 and name ilike '%'||replace(replace(trim(p_search),'%',''), '_','')||'%'
 order by name limit 20) s
$$;
revoke all on function public.public_school_search(text) from public;
grant execute on function public.public_school_search(text) to anon,authenticated;
commit;
