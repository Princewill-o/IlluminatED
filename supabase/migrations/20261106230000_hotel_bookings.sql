-- Hotels: book a room at reception for 1 to 7 nights (one night = one real day), paid in Clout at
-- the hotel's nightly rate (the seventh night is free). The server picks a free room of the type,
-- so two players can never hold the same room. One stay at a time; extend or check out early
-- (half of each unused whole night back). Rates mirror src/game/core/hotels.ts.
create table if not exists private.hotel_rates (
  hotel text not null, room_type text not null, rate integer not null check (rate > 0),
  primary key (hotel, room_type)
);
insert into private.hotel_rates (hotel, room_type, rate) values
  ('hotel-0', 'standard', 40), ('hotel-0', 'deluxe', 75), ('hotel-0', 'suite', 140),
  ('hotel-1', 'standard', 30), ('hotel-1', 'deluxe', 60), ('hotel-1', 'suite', 110)
on conflict (hotel, room_type) do update set rate = excluded.rate;

create table if not exists private.hotel_rooms (
  hotel text not null, room text not null, room_type text not null,
  primary key (hotel, room)
);
insert into private.hotel_rooms (hotel, room, room_type)
select h, r.room, r.t from unnest(array['hotel-0', 'hotel-1']) h,
  (values ('101', 'standard'), ('102', 'standard'), ('103', 'deluxe'), ('104', 'suite'),
          ('201', 'standard'), ('202', 'standard'), ('203', 'deluxe'), ('204', 'suite')) r(room, t)
on conflict (hotel, room) do nothing;

create table if not exists public.hotel_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  hotel text not null,
  room text not null,
  room_type text not null,
  rate integer not null,
  nights integer not null check (nights between 1 and 14),
  paid integer not null,
  check_in timestamptz not null default now(),
  check_out timestamptz not null,
  ended_at timestamptz
);
create index if not exists hotel_bookings_user on public.hotel_bookings (user_id, check_out desc);
create index if not exists hotel_bookings_room on public.hotel_bookings (hotel, room, check_out desc);
alter table public.hotel_bookings enable row level security;
create policy "read own hotel bookings" on public.hotel_bookings for select to authenticated using (user_id = (select auth.uid()));

-- How many rooms of each type are free right now, and each type's rate.
create or replace function public.hotel_availability(p_hotel text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(t.room_type, jsonb_build_object('rate', t.rate, 'free', (
    select count(*) from private.hotel_rooms r where r.hotel = p_hotel and r.room_type = t.room_type
      and not exists (select 1 from public.hotel_bookings b where b.hotel = r.hotel and b.room = r.room and b.ended_at is null and b.check_out > now())
  ))), '{}'::jsonb)
  from private.hotel_rates t where t.hotel = p_hotel;
$$;

create or replace function public.hotel_book(p_hotel text, p_type text, p_nights integer) returns public.hotel_bookings
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); v_rate integer; v_room text; v_paid integer; b public.hotel_bookings;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_nights is null or p_nights not between 1 and 7 then raise exception 'invalid'; end if;
  select rate into v_rate from private.hotel_rates where hotel = p_hotel and room_type = p_type;
  if v_rate is null then raise exception 'invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_hotel, 911));
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 912));
  if exists (select 1 from public.hotel_bookings where user_id = uid and ended_at is null and check_out > now()) then raise exception 'already_booked'; end if;
  select r.room into v_room from private.hotel_rooms r
  where r.hotel = p_hotel and r.room_type = p_type
    and not exists (select 1 from public.hotel_bookings x where x.hotel = r.hotel and x.room = r.room and x.ended_at is null and x.check_out > now())
  order by r.room limit 1;
  if v_room is null then raise exception 'no_rooms'; end if;
  v_paid := v_rate * (case when p_nights >= 7 then p_nights - 1 else p_nights end);
  perform private.spend_clout(uid, v_paid);
  insert into public.hotel_bookings (user_id, hotel, room, room_type, rate, nights, paid, check_out)
  values (uid, p_hotel, v_room, p_type, v_rate, p_nights, v_paid, now() + make_interval(days => p_nights))
  returning * into b;
  return b;
end;
$$;

-- Add nights to your current stay (up to 14 nights in all), at the room's rate.
create or replace function public.hotel_extend(p_nights integer) returns public.hotel_bookings
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); b public.hotel_bookings; v_cost integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_nights is null or p_nights not between 1 and 7 then raise exception 'invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 912));
  select * into b from public.hotel_bookings where user_id = uid and ended_at is null and check_out > now() order by check_out desc limit 1 for update;
  if not found then raise exception 'no_booking'; end if;
  if b.nights + p_nights > 14 then raise exception 'too_long'; end if;
  v_cost := b.rate * p_nights;
  perform private.spend_clout(uid, v_cost);
  update public.hotel_bookings set nights = nights + p_nights, paid = paid + v_cost, check_out = check_out + make_interval(days => p_nights)
  where id = b.id returning * into b;
  return b;
end;
$$;

-- Check out now. Returns the Clout refunded: half the rate for each unused whole night.
create or replace function public.hotel_checkout() returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); b public.hotel_bookings; v_refund integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 912));
  select * into b from public.hotel_bookings where user_id = uid and ended_at is null and check_out > now() order by check_out desc limit 1 for update;
  if not found then raise exception 'no_booking'; end if;
  v_refund := least(b.paid, floor(extract(epoch from (b.check_out - now())) / 86400)::integer * (b.rate / 2));
  update public.hotel_bookings set ended_at = now() where id = b.id;
  if v_refund > 0 then
    insert into public.player_stats (user_id, clout) values (uid, v_refund)
    on conflict (user_id) do update set clout = public.player_stats.clout + excluded.clout, updated_at = now();
  end if;
  return v_refund;
end;
$$;

revoke all on function public.hotel_availability(text) from public, anon;
revoke all on function public.hotel_book(text, text, integer) from public, anon;
revoke all on function public.hotel_extend(integer) from public, anon;
revoke all on function public.hotel_checkout() from public, anon;
grant execute on function public.hotel_availability(text) to authenticated;
grant execute on function public.hotel_book(text, text, integer) to authenticated;
grant execute on function public.hotel_extend(integer) to authenticated;
grant execute on function public.hotel_checkout() to authenticated;
