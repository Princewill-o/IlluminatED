-- IllumED World: alongside the regional public worlds, a Plus member can build
-- ONE world of their own, with a name and an icon, that anyone can join. The
-- owner runs it as a sandbox (police, flight, time, weather, visitors).
create or replace function private.is_plus(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.billing_accounts b
    where b.user_id = p_user and b.tier in ('plus', 'plus_experience') and b.status in ('active', 'trialing')
  );
$$;
revoke all on function private.is_plus(uuid) from public, anon, authenticated;

create table if not exists public.player_worlds (
  owner uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^pw-[0-9a-f]{8}$'),
  name text not null check (char_length(name) between 3 and 30),
  icon text not null default 'castle' check (icon ~ '^[a-z-]{2,20}$'),
  settings jsonb not null default '{"police":"normal","flight":"owner","time":"auto","weather":"auto","visitors":"everyone"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.player_worlds enable row level security;
-- Worlds are public: anyone signed in can see the list and join one.
create policy "player worlds are listed" on public.player_worlds for select to authenticated using (true);

create or replace function private.world_settings_ok(s jsonb) returns boolean language sql immutable set search_path = '' as $$
  select s ?& array['police', 'flight', 'time', 'weather', 'visitors']
    and s->>'police' in ('off', 'relaxed', 'normal', 'strict')
    and s->>'flight' in ('off', 'owner', 'everyone')
    and s->>'time' in ('auto', 'day', 'dusk', 'night')
    and s->>'weather' in ('auto', 'clear', 'rain', 'snow')
    and s->>'visitors' in ('everyone', 'friends');
$$;

-- Build your world (Plus only, one per member).
create or replace function public.world_build(p_name text, p_icon text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c text;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if not private.is_plus(uid) then raise exception 'plus_only'; end if;
  if exists (select 1 from public.player_worlds where owner = uid) then raise exception 'already_built'; end if;
  c := 'pw-' || substr(md5(uid::text || clock_timestamp()::text), 1, 8);
  insert into public.player_worlds (owner, code, name, icon) values (uid, c, trim(p_name), coalesce(p_icon, 'castle'));
  return c;
end; $$;

-- Rename, change the icon, or change the sandbox rules (owner only).
create or replace function public.world_configure(p_name text, p_icon text, p_settings jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_settings is not null and not private.world_settings_ok(p_settings) then raise exception 'invalid_settings'; end if;
  update public.player_worlds set
    name = coalesce(nullif(trim(p_name), ''), name),
    icon = coalesce(p_icon, icon),
    settings = coalesce(p_settings, settings),
    updated_at = now()
  where owner = uid;
  if not found then raise exception 'no_world'; end if;
end; $$;

revoke all on function public.world_build(text, text) from public, anon;
revoke all on function public.world_configure(text, text, jsonb) from public, anon;
grant execute on function public.world_build(text, text) to authenticated;
grant execute on function public.world_configure(text, text, jsonb) to authenticated;

-- Admission: the regional worlds, or any player's world.
do $$
declare def text;
begin
  select pg_get_functiondef('public.world_claim(text,text,uuid,uuid)'::regprocedure) into def;
  def := replace(def,
    $r$or p_server !~ '^(lse-[1-3]|(sw|mid|north|scot|wales|ni|intl)-[1-2])$'$r$,
    $r$or (p_server !~ '^(lse-[1-3]|(sw|mid|north|scot|wales|ni|intl)-[1-2])$' and not exists (select 1 from public.player_worlds w where w.code = p_server))$r$);
  execute def;
end $$;

-- A closed world ("visitors": "friends" until there are friend lists) admits only its owner.
do $$
declare def text;
begin
  select pg_get_functiondef('public.world_claim(text,text,uuid,uuid)'::regprocedure) into def;
  def := replace(def,
    $r$not exists (select 1 from public.player_worlds w where w.code = p_server))$r$,
    $r$not exists (select 1 from public.player_worlds w where w.code = p_server and (w.settings->>'visitors' = 'everyone' or w.owner = uid)))$r$);
  execute def;
end $$;

-- "Friends only" now means accepted city friends (plus the owner).
do $$
declare def text;
begin
  select pg_get_functiondef('public.world_claim(text,text,uuid,uuid)'::regprocedure) into def;
  def := replace(def,
    $r$(w.settings->>'visitors' = 'everyone' or w.owner = uid)$r$,
    $r$(w.settings->>'visitors' = 'everyone' or w.owner = uid or exists (select 1 from public.city_friends f where f.state = 'accepted' and f.low_id = least(w.owner, uid) and f.high_id = greatest(w.owner, uid)))$r$);
  execute def;
end $$;
