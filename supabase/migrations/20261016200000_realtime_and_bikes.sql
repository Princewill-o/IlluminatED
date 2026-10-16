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
