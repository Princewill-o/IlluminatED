-- City NPC contacts and a self-contained, fictional business simulation.
-- Venture credits never convert to Clout, payments, or real-world money.
create table public.city_npc_friends (
 user_id uuid not null references auth.users(id) on delete cascade,
 npc_id text not null check(char_length(npc_id) between 3 and 180),
 name text not null check(char_length(name) between 1 and 60),
 map_id text not null check(char_length(map_id) between 1 and 100),
 created_at timestamptz not null default now(),
 primary key(user_id,npc_id)
);
alter table public.city_npc_friends enable row level security;
revoke all on public.city_npc_friends from public,anon,authenticated;
grant select,delete on public.city_npc_friends to authenticated;
create policy "own city contacts" on public.city_npc_friends for select to authenticated using(user_id=(select auth.uid()));
create policy "remove own city contacts" on public.city_npc_friends for delete to authenticated using(user_id=(select auth.uid()));

create function private.city_befriend_npc(p_npc text,p_name text,p_map text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 if p_npc is null or p_map is null or p_name is null or char_length(p_name) not between 1 and 60
    or char_length(p_npc)>180 or char_length(p_map) not between 1 and 100
    or p_map !~ '^[a-z0-9_-]+$' or p_npc not like p_map||':resident:%' then raise exception 'invalid_contact'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':npc-friends',0));
 if exists(select 1 from public.city_npc_friends where user_id=uid and npc_id=p_npc) then return; end if;
 if (select count(*) from public.city_npc_friends where user_id=uid)>=30 then raise exception 'friend_limit'; end if;
 insert into public.city_npc_friends(user_id,npc_id,name,map_id) values(uid,p_npc,p_name,p_map);
end;$$;
revoke all on function private.city_befriend_npc(text,text,text) from public,anon;
grant execute on function private.city_befriend_npc(text,text,text) to authenticated;
create function public.city_befriend_npc(p_npc text,p_name text,p_map text) returns void
language sql security invoker set search_path='' as $$select private.city_befriend_npc(p_npc,p_name,p_map)$$;
revoke all on function public.city_befriend_npc(text,text,text) from public,anon;
grant execute on function public.city_befriend_npc(text,text,text) to authenticated;

create table public.city_ventures (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 40),
 sector text not null check(sector in ('cafe','studio','workshop')),
 credits integer not null default 200 check(credits>=0),
 revenue integer not null default 0 check(revenue>=0),
 costs integer not null default 0 check(costs>=0),
 level integer not null default 1 check(level between 1 and 5),
 staff text[] not null default '{}' check(cardinality(staff)<=3),
 orders_completed integer not null default 0 check(orders_completed>=0),
 orders_today integer not null default 0,
 order_day date not null default current_date,
 revision integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.city_ventures enable row level security;
revoke all on public.city_ventures from public,anon,authenticated;
grant select on public.city_ventures to authenticated;
create policy "own venture" on public.city_ventures for select to authenticated using(user_id=(select auth.uid()) and (select private.is_active_member()));

create function private.city_venture_action(p_action text,p_sector text default null,p_name text default null,p_staff text default null,p_answer integer default null,p_revision integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); v public.city_ventures; quantity integer; unit_price integer; unit_cost integer; wages integer; income integer; expenses integer; upgrade_cost integer;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':venture',0));
 select * into v from public.city_ventures where user_id=uid for update;
 if p_action='start' then
   if v.user_id is not null then raise exception 'already_started'; end if;
   if p_sector is null or p_sector not in ('cafe','studio','workshop') or p_name is null or char_length(trim(p_name)) not between 2 and 40 then raise exception 'invalid_business'; end if;
   insert into public.city_ventures(user_id,name,sector) values(uid,trim(p_name),p_sector) returning * into v;
   return to_jsonb(v);
 end if;
 if v.user_id is null then raise exception 'not_started'; end if;
 if p_revision is null or p_revision<>v.revision then raise exception 'stale_order'; end if;
 if p_action='hire' then
   if p_staff is null or p_staff not in ('amara','kai','priya') then raise exception 'invalid_staff'; end if;
   if p_staff=any(v.staff) then raise exception 'already_hired'; end if;
   if v.credits<50 then raise exception 'not_enough_credits'; end if;
   update public.city_ventures set credits=credits-50,costs=costs+50,staff=array_append(staff,p_staff),revision=revision+1,updated_at=now() where user_id=uid returning * into v;
 elsif p_action='upgrade' then
   if v.level>=5 then raise exception 'max_level'; end if;
   upgrade_cost:=v.level*100;
   if v.credits<upgrade_cost then raise exception 'not_enough_credits'; end if;
   update public.city_ventures set credits=credits-upgrade_cost,costs=costs+upgrade_cost,level=level+1,revision=revision+1,updated_at=now() where user_id=uid returning * into v;
 elsif p_action='order' then
   if v.order_day=private.london_today() and v.orders_today>=20 then raise exception 'daily_limit'; end if;
   if v.orders_completed>0 and v.updated_at>now()-interval '5 seconds' then raise exception 'take_your_time'; end if;
   quantity:=4+(v.orders_completed%4)+v.level+cardinality(v.staff);
   unit_price:=case v.sector when 'cafe' then 8 when 'studio' then 18 else 14 end;
   unit_cost:=case v.sector when 'cafe' then 3 when 'studio' then 6 else 5 end;
   wages:=cardinality(v.staff)*4;
   income:=quantity*unit_price; expenses:=quantity*unit_cost+wages;
   if p_answer is null or p_answer<>income-expenses then raise exception 'check_profit'; end if;
   if v.credits<expenses then raise exception 'not_enough_credits'; end if;
   update public.city_ventures set credits=credits+income-expenses,revenue=revenue+income,costs=costs+expenses,
     orders_completed=orders_completed+1,orders_today=case when order_day=private.london_today() then orders_today+1 else 1 end,
     order_day=private.london_today(),revision=revision+1,updated_at=now() where user_id=uid returning * into v;
 else raise exception 'unknown_action'; end if;
 return to_jsonb(v);
end;$$;
revoke all on function private.city_venture_action(text,text,text,text,integer,integer) from public,anon;
grant execute on function private.city_venture_action(text,text,text,text,integer,integer) to authenticated;
create function public.city_venture_action(p_action text,p_sector text default null,p_name text default null,p_staff text default null,p_answer integer default null,p_revision integer default null) returns jsonb
language sql security invoker set search_path='' as $$select private.city_venture_action(p_action,p_sector,p_name,p_staff,p_answer,p_revision)$$;
revoke all on function public.city_venture_action(text,text,text,text,integer,integer) from public,anon;
grant execute on function public.city_venture_action(text,text,text,text,integer,integer) to authenticated;
