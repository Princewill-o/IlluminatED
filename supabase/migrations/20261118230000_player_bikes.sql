-- Own a bike: one custom bike per player, kept in the garage. Prices match src/game/core/bikes.ts (BIKE_FRAMES).
create table if not exists public.player_bikes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  frame text not null check (frame in ('city', 'bmx', 'road', 'ebike')),
  colour text not null check (colour ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz not null default now()
);
alter table public.player_bikes enable row level security;
drop policy if exists "read own bike" on public.player_bikes;
create policy "read own bike" on public.player_bikes for select to authenticated using (user_id = (select auth.uid()));

-- Buys a new frame (charged) or repaints the frame you already own (free). Returns the Clout left.
create or replace function public.bike_buy(p_frame text, p_colour text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  price integer := case p_frame when 'city' then 60 when 'bmx' then 90 when 'road' then 140 when 'ebike' then 220 end;
  current_frame text;
  left_over integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if price is null or p_colour !~ '^#[0-9a-fA-F]{6}$' then raise exception 'unknown_item'; end if;
  select frame into current_frame from public.player_bikes where user_id = uid;
  if current_frame is distinct from p_frame then perform private.spend_clout(uid, price); end if;
  insert into public.player_bikes (user_id, frame, colour) values (uid, p_frame, p_colour)
  on conflict (user_id) do update set frame = excluded.frame, colour = excluded.colour, updated_at = now();
  select clout into left_over from public.player_stats where user_id = uid;
  return left_over;
end;
$$;
revoke all on function public.bike_buy(text, text) from public, anon;
grant execute on function public.bike_buy(text, text) to authenticated;
