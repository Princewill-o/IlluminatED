-- Maths Racing: campaign races, time trials and ghost races.
-- The server picks each race's seed and start time; a finish is only accepted
-- if it is physically possible for that track in the real time that passed.
-- Rollback: remove the five racing_* functions and the racing_runs table.
create table if not exists public.racing_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  track text not null check (track ~ '^w[1-8]-t[1-4]$'),
  mode text not null check (mode in ('campaign', 'trial', 'ghost')),
  seed integer not null,
  ghost_of bigint references public.racing_runs (id) on delete set null,
  started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  time_ms integer,
  correct integer,
  wrong integer,
  place smallint,
  stars smallint,
  events jsonb
);
create index if not exists racing_runs_board on public.racing_runs (track, time_ms) where finished_at is not null;
create index if not exists racing_runs_user on public.racing_runs (user_id, track);
alter table public.racing_runs enable row level security;
-- No direct table access: everything goes through the functions below.

create or replace function private.racing_length(p_track text) returns integer language sql immutable set search_path = '' as $$
  select 900 + (substr(p_track, 5, 1)::int - 1) * 150 + case when substr(p_track, 5, 1) = '4' then 150 else 0 end;
$$;

create or replace function public.racing_start(p_track text, p_mode text, p_ghost bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); s integer; g public.racing_runs; rid bigint;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_track !~ '^w[1-8]-t[1-4]$' or p_mode not in ('campaign', 'trial', 'ghost') then raise exception 'invalid'; end if;
  if (select count(*) from public.racing_runs where user_id = uid and started_at > now() - interval '1 minute') >= 6 then raise exception 'slow_down'; end if;
  if p_ghost is not null then
    select * into g from public.racing_runs where id = p_ghost and finished_at is not null and track = p_track;
    if not found then raise exception 'no_ghost'; end if;
    s := g.seed;
  else
    s := 1 + floor(random() * 2000000000)::int;
  end if;
  insert into public.racing_runs (user_id, track, mode, seed, ghost_of) values (uid, p_track, p_mode, s, p_ghost) returning id into rid;
  return jsonb_build_object('id', rid, 'seed', s);
end; $$;

create or replace function public.racing_finish(p_id bigint, p_time_ms integer, p_correct integer, p_wrong integer, p_place integer, p_events jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid()); r public.racing_runs; elapsed integer; len integer;
  st integer; prev integer; gain integer := 0; best_trial integer; acc numeric;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into r from public.racing_runs where id = p_id and user_id = uid for update;
  if not found or r.finished_at is not null then raise exception 'invalid'; end if;
  elapsed := floor(extract(epoch from clock_timestamp() - r.started_at) * 1000);
  len := private.racing_length(r.track);
  if p_time_ms is null or p_time_ms < 20000 or p_time_ms > 900000 or p_correct < 0 or p_wrong < 0 or p_place not between 1 and 5
     or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 1500 then raise exception 'invalid'; end if;
  -- The race can't be shorter than the real time that passed (3 s countdown, small network slack).
  if p_time_ms > elapsed + 2000 then raise exception 'too_fast'; end if;
  -- No more than one counted answer per 0.9 s.
  if p_correct + p_wrong > p_time_ms / 900 + 1 then raise exception 'too_fast'; end if;
  -- Physics: cruising 12 m/s, each correct answer adds at most ~60 m.
  if 12.0 * p_time_ms / 1000 + 60.0 * p_correct < len then raise exception 'too_fast'; end if;
  acc := case when p_correct + p_wrong > 0 then p_correct::numeric / (p_correct + p_wrong) else 0 end;
  st := case when r.mode = 'trial' then null when p_place = 1 and acc >= 0.8 then 3 when p_place <= 3 then 2 else 1 end;
  select coalesce(max(stars), 0) into prev from public.racing_runs where user_id = uid and track = r.track and finished_at is not null;
  if st is not null and st > prev then
    gain := (st - prev) * 5;
    insert into public.player_stats (user_id) values (uid) on conflict do nothing;
    update public.player_stats set clout = clout + gain, xp = xp + (st - prev) * 10, updated_at = now() where user_id = uid;
  end if;
  update public.racing_runs set finished_at = clock_timestamp(), time_ms = p_time_ms, correct = p_correct, wrong = p_wrong,
    place = p_place, stars = st, events = p_events where id = p_id;
  select min(time_ms) into best_trial from public.racing_runs where user_id = uid and track = r.track and finished_at is not null;
  return jsonb_build_object('stars', st, 'clout', gain, 'best', best_trial);
end; $$;

-- Your stars per track (campaign progress).
create or replace function public.racing_progress() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(track, jsonb_build_object('stars', stars, 'best', best)), '{}'::jsonb) from (
    select track, max(coalesce(stars, 0)) as stars, min(time_ms) as best from public.racing_runs
    where user_id = (select auth.uid()) and finished_at is not null group by track
  ) t;
$$;

-- Fastest times on a track (one per player), plus yours.
create or replace function public.racing_board(p_track text) returns jsonb
language sql stable security definer set search_path = '' as $$
  with best as (
    select distinct on (r.user_id) r.id, r.user_id, r.time_ms, r.correct, r.wrong
    from public.racing_runs r where r.track = p_track and r.finished_at is not null
    order by r.user_id, r.time_ms
  )
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('run', b.id, 'name', coalesce(p.username, 'player'), 'time', b.time_ms,
      'acc', case when b.correct + b.wrong > 0 then round(100.0 * b.correct / (b.correct + b.wrong)) else 0 end, 'me', b.user_id = (select auth.uid())) order by b.time_ms)
      from (select * from best order by time_ms limit 10) b left join public.profiles p on p.id = b.user_id), '[]'::jsonb),
    'mine', (select jsonb_build_object('run', id, 'time', time_ms) from best where user_id = (select auth.uid())));
$$;

-- A finished run to race against (its inputs replay exactly with the same seed).
create or replace function public.racing_ghost(p_run bigint) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'track', r.track, 'seed', r.seed, 'time', r.time_ms, 'events', r.events, 'name', coalesce(p.username, 'player'))
  from public.racing_runs r left join public.profiles p on p.id = r.user_id
  where r.id = p_run and r.finished_at is not null;
$$;

revoke all on function public.racing_start(text, text, bigint), public.racing_finish(bigint, integer, integer, integer, integer, jsonb),
  public.racing_progress(), public.racing_board(text), public.racing_ghost(bigint) from public, anon;
grant execute on function public.racing_start(text, text, bigint), public.racing_finish(bigint, integer, integer, integer, integer, jsonb),
  public.racing_progress(), public.racing_board(text), public.racing_ghost(bigint) to authenticated;
