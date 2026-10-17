-- Online play: Supabase Realtime private channels need these policies, or
-- every world, lobby and Games Hall channel is refused ("Can't connect").
-- (Same two policies as the worlds migration, on their own so they can ship alone.)
drop policy if exists "members receive world channels" on realtime.messages;
drop policy if exists "members send in world channels" on realtime.messages;
create policy "members receive world channels" on realtime.messages for select to authenticated
  using (realtime.topic() like 'world:%' and (select private.is_active_member()));
create policy "members send in world channels" on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'world:%' and (select private.is_active_member()));

-- Hire bikes: pay Clout for a timed ride. Prices match src/game/core/bikes.ts.
create or replace function public.bike_hire(p_brand text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  price integer := case p_brand when 'santa' then 10 when 'humm' then 18 when 'lyme' then 25 end;
  left_over integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if price is null then raise exception 'unknown_item'; end if;
  perform private.spend_clout(uid, price);
  select clout into left_over from public.player_stats where user_id = uid;
  return left_over;
end;
$$;
revoke all on function public.bike_hire(text) from public, anon;
grant execute on function public.bike_hire(text) to authenticated;

-- Car dealership: buy a car with Clout, keep it, drive it around the world.
create table if not exists public.player_cars (
  user_id uuid not null references auth.users (id) on delete cascade,
  car text not null check (car in ('sedan', 'hatchback-sports', 'suv', 'van', 'cab')),
  bought_at timestamptz not null default now(),
  primary key (user_id, car)
);
alter table public.player_cars enable row level security;
drop policy if exists "read own cars" on public.player_cars;
create policy "read own cars" on public.player_cars for select to authenticated using (user_id = (select auth.uid()));

-- Prices match src/game/core/cars.ts.
create or replace function public.car_buy(p_car text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  price integer := case p_car when 'sedan' then 120 when 'van' then 180 when 'suv' then 220 when 'cab' then 260 when 'hatchback-sports' then 320 end;
  left_over integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if price is null then raise exception 'unknown_item'; end if;
  if exists (select 1 from public.player_cars where user_id = uid and car = p_car) then raise exception 'already_owned'; end if;
  perform private.spend_clout(uid, price);
  insert into public.player_cars (user_id, car) values (uid, p_car);
  select clout into left_over from public.player_stats where user_id = uid;
  return left_over;
end;
$$;
revoke all on function public.car_buy(text) from public, anon;
grant execute on function public.car_buy(text) to authenticated;

-- XP for living your life in the world (bus revision, hikes, train trips), at most
-- once per activity every 10 minutes so it can't be farmed. Same level curve as shifts.
create table if not exists public.world_activity_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  at timestamptz not null default now()
);
create index if not exists world_activity_recent on public.world_activity_log (user_id, kind, at desc);
alter table public.world_activity_log enable row level security;

create or replace function public.world_xp(p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  gain integer := case p_kind when 'bus' then 15 when 'hike' then 12 when 'train' then 8 when 'eat' then 4 when 'study' then 10 when 'sleep' then 4 end;
  st public.player_stats;
  lvl integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if gain is null then raise exception 'unknown_item'; end if;
  if exists (select 1 from public.world_activity_log where user_id = uid and kind = p_kind and at > now() - interval '10 minutes') then
    return jsonb_build_object('xp', 0);
  end if;
  insert into public.world_activity_log (user_id, kind) values (uid, p_kind);
  insert into public.player_stats (user_id) values (uid) on conflict do nothing;
  select * into st from public.player_stats where user_id = uid for update;
  lvl := greatest(1, floor((1 + sqrt(1 + 0.08 * (st.xp + gain))) / 2)::integer);
  update public.player_stats set xp = xp + gain, level = lvl, updated_at = now() where user_id = uid;
  return jsonb_build_object('xp', gain, 'total', st.xp + gain, 'level', lvl, 'levelled', lvl > st.level);
end;
$$;
revoke all on function public.world_xp(text) from public, anon;
grant execute on function public.world_xp(text) to authenticated;

-- Paying for things in the world: energy drinks, meals, medicine. Prices match src/game/core/law.ts.
create or replace function public.world_buy(p_item text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  price integer := case p_item when 'medicine' then 1 when 'drink' then 3 when 'meal' then 6 when 'coffee' then 2 end;
  left_over integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if price is null then raise exception 'unknown_item'; end if;
  perform private.spend_clout(uid, price);
  select clout into left_over from public.player_stats where user_id = uid;
  return left_over;
end;
$$;
revoke all on function public.world_buy(text) from public, anon;
grant execute on function public.world_buy(text) to authenticated;
