-- Seven new cars at Motor Mile (prices match src/game/core/cars.ts). The original
-- player_cars table only accepts the first five models, so new models live in a
-- second garage table with the same shape, delivery trigger and read policy.
create table if not exists public.player_cars_more (
  user_id uuid not null references auth.users (id) on delete cascade,
  car text not null check (car in ('mini', 'ev-hatch', 'pickup', 'box-van', 'camper', 'rally', 'supercar')),
  bought_at timestamptz not null default now(),
  primary key (user_id, car)
);
alter table public.player_cars_more enable row level security;
create policy "read own extra cars" on public.player_cars_more for select to authenticated using (user_id = (select auth.uid()));
create or replace trigger deliver_car after insert on public.player_cars_more for each row execute function private.deliver_car();

create or replace function public.car_buy(p_car text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  price integer := case p_car
    when 'sedan' then 120 when 'van' then 180 when 'suv' then 220 when 'cab' then 260 when 'hatchback-sports' then 320
    when 'mini' then 140 when 'ev-hatch' then 240 when 'pickup' then 260 when 'box-van' then 230
    when 'camper' then 300 when 'rally' then 360 when 'supercar' then 480 end;
  extra boolean := p_car in ('mini', 'ev-hatch', 'pickup', 'box-van', 'camper', 'rally', 'supercar');
  left_over integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if price is null then raise exception 'unknown_item'; end if;
  if exists (select 1 from public.player_cars where user_id = uid and car = p_car)
     or exists (select 1 from public.player_cars_more where user_id = uid and car = p_car) then raise exception 'already_owned'; end if;
  perform private.spend_clout(uid, price);
  if extra then insert into public.player_cars_more (user_id, car) values (uid, p_car);
  else insert into public.player_cars (user_id, car) values (uid, p_car); end if;
  select clout into left_over from public.player_stats where user_id = uid;
  return left_over;
end;
$$;
revoke all on function public.car_buy(text) from public, anon;
grant execute on function public.car_buy(text) to authenticated;
