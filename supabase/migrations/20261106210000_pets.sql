-- Pets: adopt with Clout, name and colour them, care for them. Care is never punished: needs only
-- fall to a floor. Completing the daily care round (feed, water and play) pays a little Clout once a day.
create table if not exists public.player_pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('dog', 'cat', 'rabbit', 'fox', 'panda', 'penguin')),
  name text not null check (char_length(name) between 1 and 20),
  colour text not null check (colour ~ '^#[0-9a-fA-F]{6}$'),
  accessory text not null default 'none' check (accessory in ('none', 'collar', 'bow', 'bandana', 'cap')),
  equipped boolean not null default false,
  fed_at timestamptz not null default now(),
  watered_at timestamptz not null default now(),
  washed_at timestamptz not null default now(),
  slept_at timestamptz not null default now(),
  played_at timestamptz not null default now(),
  care_day date,
  care_done text[] not null default '{}',
  adopted_at timestamptz not null default now()
);
create index if not exists player_pets_user on public.player_pets (user_id);
alter table public.player_pets enable row level security;
create policy "read own pets" on public.player_pets for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.pet_adopt(p_kind text, p_name text, p_colour text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  price integer := case p_kind when 'dog' then 150 when 'cat' then 150 when 'rabbit' then 100 when 'fox' then 220 when 'panda' then 300 when 'penguin' then 260 end;
  pet uuid;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if price is null then raise exception 'unknown_item'; end if;
  if (select count(*) from public.player_pets where user_id = uid) >= 6 then raise exception 'too_many_pets'; end if;
  if p_name !~ '^[A-Za-z0-9 ''-]{1,20}$' then raise exception 'invalid_name'; end if;
  perform private.spend_clout(uid, price);
  update public.player_pets set equipped = false where user_id = uid;
  insert into public.player_pets (user_id, kind, name, colour, equipped) values (uid, p_kind, trim(p_name), p_colour, true) returning id into pet;
  return pet;
end;
$$;

create or replace function public.pet_update(p_pet uuid, p_name text, p_accessory text, p_equipped boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if not exists (select 1 from public.player_pets where id = p_pet and user_id = uid) then raise exception 'invalid'; end if;
  if p_name is not null and p_name !~ '^[A-Za-z0-9 ''-]{1,20}$' then raise exception 'invalid_name'; end if;
  if p_equipped then update public.player_pets set equipped = false where user_id = uid and id <> p_pet; end if;
  update public.player_pets set name = coalesce(trim(p_name), name), accessory = coalesce(p_accessory, accessory), equipped = coalesce(p_equipped, equipped)
  where id = p_pet and user_id = uid;
end;
$$;

-- One care action. Returns Clout paid (10 once a day when feed, water and play are all done).
create or replace function public.pet_care(p_pet uuid, p_action text) returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); p public.player_pets; paid integer := 0; done text[];
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_action not in ('feed', 'water', 'wash', 'sleep', 'play') then raise exception 'invalid'; end if;
  select * into p from public.player_pets where id = p_pet and user_id = uid for update;
  if not found then raise exception 'invalid'; end if;
  done := case when p.care_day = current_date then p.care_done else '{}' end;
  if not (p_action = any(done)) then done := done || p_action; end if;
  update public.player_pets set
    fed_at = case when p_action = 'feed' then now() else fed_at end,
    watered_at = case when p_action = 'water' then now() else watered_at end,
    washed_at = case when p_action = 'wash' then now() else washed_at end,
    slept_at = case when p_action = 'sleep' then now() else slept_at end,
    played_at = case when p_action = 'play' then now() else played_at end,
    care_day = current_date, care_done = done
  where id = p.id;
  -- The daily care round pays once: when the third of feed/water/play is first completed today.
  if 'feed' = any(done) and 'water' = any(done) and 'play' = any(done)
     and not ('paid' = any(done)) then
    update public.player_pets set care_done = care_done || 'paid'::text where id = p.id;
    if not exists (select 1 from public.player_pets where user_id = uid and id <> p.id and care_day = current_date and 'paid' = any(care_done)) then
      paid := 10;
      insert into public.player_stats (user_id, clout) values (uid, paid)
      on conflict (user_id) do update set clout = public.player_stats.clout + excluded.clout, updated_at = now();
    end if;
  end if;
  return paid;
end;
$$;

revoke all on function public.pet_adopt(text, text, text) from public, anon;
revoke all on function public.pet_update(uuid, text, text, boolean) from public, anon;
revoke all on function public.pet_care(uuid, text) from public, anon;
grant execute on function public.pet_adopt(text, text, text) to authenticated;
grant execute on function public.pet_update(uuid, text, text, boolean) to authenticated;
grant execute on function public.pet_care(uuid, text) to authenticated;
