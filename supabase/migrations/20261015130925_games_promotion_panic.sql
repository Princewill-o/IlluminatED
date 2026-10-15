-- IlluminatED City: Promotion Panic (the first game) and the shared player
-- progression it feeds: XP, levels, Clout, streaks, cosmetics and challenges.
-- Additive only. Clients never write scores or currency directly: every change
-- goes through the security definer functions below, which validate the run.
begin;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

-- One row per player. Kept out of public.profiles on purpose: profiles is
-- world-readable (forum usernames), and game activity should stay private.
create table public.player_stats (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  xp              integer not null default 0 check (xp >= 0),
  level           integer not null default 1 check (level >= 1),
  clout           integer not null default 0 check (clout >= 0),
  streak_days     integer not null default 0 check (streak_days >= 0),
  streak_best     integer not null default 0 check (streak_best >= 0),
  last_played_on  date,
  shifts_played   integer not null default 0 check (shifts_played >= 0),
  avatar          jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(avatar) = 'object' and octet_length(avatar::text) <= 2000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Best result per parody company (drives the city map and CEO unlocks).
create table public.game_company_progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  company_id  text not null check (company_id ~ '^[a-z0-9-]{2,40}$'),
  best_score  integer not null default 0 check (best_score >= 0),
  best_rank   integer not null default 0 check (best_rank between 0 and 7),
  shifts      integer not null default 0 check (shifts >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table public.game_challenges (
  code        text primary key check (code ~ '^[A-Z0-9]{6}$'),
  creator_id  uuid not null references auth.users (id) on delete cascade,
  run_id      bigint not null unique,
  company_id  text not null check (company_id ~ '^[a-z0-9-]{2,40}$'),
  seed        integer not null,
  score       integer not null check (score >= 0),
  rank        integer not null check (rank between 0 and 7),
  created_at  timestamptz not null default now()
);
create index game_challenges_creator on public.game_challenges (creator_id, created_at desc);

create table public.game_runs (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  game            text not null default 'promotion-panic' check (game in ('promotion-panic')),
  company_id      text not null check (company_id ~ '^[a-z0-9-]{2,40}$'),
  seed            integer not null,
  score           integer not null check (score >= 0),
  rank            integer not null check (rank between 0 and 7),
  correct         integer not null check (correct >= 0),
  total           integer not null check (total between 1 and 12 and correct <= total),
  best_streak     integer not null default 0 check (best_streak >= 0),
  duration_ms     integer not null check (duration_ms > 0),
  fired           boolean not null default false,
  xp_awarded      integer not null default 0,
  clout_awarded   integer not null default 0,
  challenge_code  text references public.game_challenges (code) on delete set null,
  created_at      timestamptz not null default now()
);
create index game_runs_user on public.game_runs (user_id, created_at desc);
create index game_runs_challenge on public.game_runs (challenge_code) where challenge_code is not null;

alter table public.game_challenges
  add constraint game_challenges_run_fk foreign key (run_id) references public.game_runs (id) on delete cascade;

-- The Locker catalogue. Mirrors src/game/core/cosmetics.ts (a test checks they match).
create table public.cosmetic_items (
  id      text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  slot    text not null check (slot in ('skin','hair','hairColor','top','hat','face','held','pet')),
  name    text not null check (char_length(name) between 1 and 40),
  price   integer not null default 0 check (price >= 0),
  unlock  text check (unlock is null or unlock ~ '^(ceo:[a-z0-9-]{2,40}|level:[0-9]{1,3}|streak:[0-9]{1,3})$'),
  sort    integer not null default 0
);

create table public.player_items (
  user_id      uuid not null references auth.users (id) on delete cascade,
  item_id      text not null references public.cosmetic_items (id) on delete cascade,
  acquired_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

insert into public.cosmetic_items (id, slot, name, price, unlock, sort) values
  ('skin-1', 'skin', 'Tone 1', 0, null, 1),
  ('skin-2', 'skin', 'Tone 2', 0, null, 2),
  ('skin-3', 'skin', 'Tone 3', 0, null, 3),
  ('skin-4', 'skin', 'Tone 4', 0, null, 4),
  ('skin-5', 'skin', 'Tone 5', 0, null, 5),
  ('skin-6', 'skin', 'Tone 6', 0, null, 6),
  ('hair-short', 'hair', 'Short', 0, null, 7),
  ('hair-curly', 'hair', 'Curly', 0, null, 8),
  ('hair-long', 'hair', 'Long', 0, null, 9),
  ('hair-buns', 'hair', 'Space buns', 0, null, 10),
  ('hair-buzz', 'hair', 'Buzz cut', 0, null, 11),
  ('hair-braids', 'hair', 'Braids', 150, null, 12),
  ('hair-afro', 'hair', 'Afro', 150, null, 13),
  ('hair-spiky', 'hair', 'Anime spikes', 200, null, 14),
  ('hair-mohawk', 'hair', 'Mohawk', 250, null, 15),
  ('haircol-black', 'hairColor', 'Black', 0, null, 16),
  ('haircol-brown', 'hairColor', 'Brown', 0, null, 17),
  ('haircol-blonde', 'hairColor', 'Blonde', 0, null, 18),
  ('haircol-ginger', 'hairColor', 'Ginger', 0, null, 19),
  ('haircol-purple', 'hairColor', 'Purple', 120, null, 20),
  ('haircol-blue', 'hairColor', 'Blue', 120, null, 21),
  ('haircol-pink', 'hairColor', 'Pink', 120, null, 22),
  ('haircol-silver', 'hairColor', 'Silver', 200, null, 23),
  ('top-tee', 'top', 'IlluminatED tee', 0, null, 24),
  ('top-hoodie', 'top', 'Comfy hoodie', 0, null, 25),
  ('top-apron', 'top', 'Baker''s apron', 150, null, 26),
  ('top-jersey', 'top', 'Footy jersey', 250, null, 27),
  ('top-suit', 'top', 'Power suit', 300, null, 28),
  ('top-tux', 'top', 'Red-carpet tux', 800, null, 29),
  ('top-astronaut', 'top', 'Space suit', 1200, null, 30),
  ('top-labcoat', 'top', 'Dr Ow''s lab coat', 0, 'ceo:st-plasters', 31),
  ('top-hivis', 'top', 'Hi-vis of honour', 0, 'ceo:bodge', 32),
  ('top-tracksuit', 'top', 'Psyke tracksuit', 0, 'ceo:psyke', 33),
  ('hat-none', 'hat', 'No hat', 0, null, 34),
  ('hat-cap', 'hat', 'Cap', 0, null, 35),
  ('hat-beanie', 'hat', 'Beanie', 100, null, 36),
  ('hat-party', 'hat', 'Party hat', 150, null, 37),
  ('hat-crown', 'hat', 'Crown', 2000, null, 38),
  ('hat-hardhat', 'hat', 'Tesler hard hat', 0, 'ceo:tesler', 39),
  ('hat-chef', 'hat', 'Gregz chef hat', 0, 'ceo:gregz', 40),
  ('hat-explorer', 'hat', 'Explorer hat', 0, 'ceo:atlas', 41),
  ('hat-grad', 'hat', 'Graduation cap', 0, 'level:10', 42),
  ('hat-lion', 'hat', 'Tiggy ears', 0, 'streak:7', 43),
  ('face-none', 'face', 'Nothing', 0, null, 44),
  ('face-round', 'face', 'Round glasses', 0, null, 45),
  ('face-star', 'face', 'Star glasses', 250, null, 46),
  ('face-vr', 'face', 'VR visor', 400, null, 47),
  ('face-shades', 'face', 'Netflics shades', 0, 'ceo:netflics', 48),
  ('face-monocle', 'face', 'Judge''s monocle', 0, 'ceo:lawz', 49),
  ('held-none', 'held', 'Empty hands', 0, null, 50),
  ('held-coffee', 'held', 'Coffee', 0, null, 51),
  ('held-croissant', 'held', 'Croissant', 120, null, 52),
  ('held-briefcase', 'held', 'Briefcase', 200, null, 53),
  ('held-mic', 'held', 'Microphone', 300, null, 54),
  ('held-laptop', 'held', 'Macrosoft laptop', 0, 'ceo:macrosoft', 55),
  ('held-trophy', 'held', 'Gold star trophy', 0, 'ceo:tiny-humans', 56),
  ('pet-none', 'pet', 'No pet', 0, null, 57),
  ('pet-goldfish', 'pet', 'Office goldfish', 300, null, 58),
  ('pet-duck', 'pet', 'Debugging duck', 500, null, 59),
  ('pet-dragon', 'pet', 'Tiny dragon', 2500, null, 60),
  ('pet-cub', 'pet', 'Tiggy cub', 0, 'level:5', 61),
  ('pet-robot', 'pet', 'Goggle robot', 0, 'ceo:goggle', 62),
  ('pet-dog', 'pet', 'Barklays pup', 0, 'ceo:barklays', 63),
  ('pet-cow', 'pet', 'Tescow calf', 0, 'ceo:tescow', 64);

-- ─────────────────────────────────────────────────────────────
-- Access: read your own rows; all writes go through the functions below
-- ─────────────────────────────────────────────────────────────

alter table public.player_stats enable row level security;
alter table public.game_company_progress enable row level security;
alter table public.game_challenges enable row level security;
alter table public.game_runs enable row level security;
alter table public.cosmetic_items enable row level security;
alter table public.player_items enable row level security;

revoke all on public.player_stats, public.game_company_progress, public.game_challenges,
  public.game_runs, public.cosmetic_items, public.player_items from public, anon, authenticated;
grant select on public.player_stats, public.game_company_progress, public.game_runs,
  public.player_items to authenticated;
grant select on public.cosmetic_items to anon, authenticated;
grant all on public.player_stats, public.game_company_progress, public.game_challenges,
  public.game_runs, public.cosmetic_items, public.player_items to service_role;

create policy "own player stats" on public.player_stats for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own company progress" on public.game_company_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own runs" on public.game_runs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own items" on public.player_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy "catalogue readable" on public.cosmetic_items for select to anon, authenticated
  using (true);
-- game_challenges has no policies: it is only read through game_challenge().

-- ─────────────────────────────────────────────────────────────
-- Functions
-- ─────────────────────────────────────────────────────────────

-- Same thresholds as RANKS in src/game/core/shift.ts.
create function private.game_rank_for(score integer) returns integer
language sql immutable set search_path = '' as $$
  select case
    when score >= 5200 then 7 when score >= 3900 then 6 when score >= 2900 then 5
    when score >= 2000 then 4 when score >= 1200 then 3 when score >= 600 then 2
    when score >= 200 then 1 else 0 end;
$$;

-- Saves a finished shift and pays out XP and Clout. The client reports the run;
-- this checks it is physically possible, recomputes the rank and rewards, caps
-- daily rewards, and grants any cosmetics the player has now unlocked.
create function public.game_finish_run(
  p_company text, p_seed integer, p_score integer, p_correct integer, p_total integer,
  p_best_streak integer, p_duration_ms integer, p_fired boolean, p_challenge text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  today date := private.london_today();
  st public.player_stats;
  v_rank integer;
  v_daily boolean;
  v_runs_today integer;
  v_xp integer := 0;
  v_clout integer := 0;
  v_streak integer;
  v_level integer;
  v_prev_best integer;
  v_run bigint;
  v_unlocked text[];
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_company is null or p_company !~ '^[a-z0-9-]{2,40}$' or p_seed is null
     or p_total is null or p_total not between 1 and 12
     or p_correct is null or p_correct not between 0 and p_total
     or p_score is null or p_score < 0 or p_score > p_correct * 800
     or p_best_streak is null or p_best_streak not between 0 and p_correct
     or p_duration_ms is null or p_duration_ms not between p_total * 1200 and 900000 then
    raise exception 'invalid_run';
  end if;
  if exists (select 1 from public.game_runs r where r.user_id = uid and r.created_at > now() - interval '20 seconds') then
    raise exception 'too_fast';
  end if;
  if p_challenge is not null and not exists (
    select 1 from public.game_challenges c where c.code = p_challenge and c.company_id = p_company) then
    p_challenge := null;
  end if;

  v_rank := private.game_rank_for(p_score);

  insert into public.player_stats (user_id) values (uid) on conflict (user_id) do nothing;
  select * into st from public.player_stats where user_id = uid for update;

  v_daily := st.last_played_on is distinct from today;
  select count(*) into v_runs_today from public.game_runs r
    where r.user_id = uid and r.created_at >= (today::timestamp at time zone 'Europe/London');
  -- Rewards stop after 40 shifts a day, so grinding can't break the economy.
  if v_runs_today < 40 then
    v_xp := 10 + p_correct * 20 + v_rank * 10;
    v_clout := (p_correct * 10 + v_rank * 15) * (case when v_daily then 2 else 1 end);
  end if;

  v_streak := case
    when st.last_played_on = today then greatest(st.streak_days, 1)
    when st.last_played_on = today - 1 then st.streak_days + 1
    else 1 end;
  v_level := greatest(1, floor((1 + sqrt(1 + 0.08 * (st.xp + v_xp))) / 2)::integer);

  update public.player_stats set
    xp = xp + v_xp, clout = clout + v_clout, level = v_level,
    streak_days = v_streak, streak_best = greatest(streak_best, v_streak),
    last_played_on = today, shifts_played = shifts_played + 1, updated_at = now()
  where user_id = uid;

  select g.best_score into v_prev_best from public.game_company_progress g
    where g.user_id = uid and g.company_id = p_company;
  insert into public.game_company_progress as g (user_id, company_id, best_score, best_rank, shifts)
    values (uid, p_company, p_score, v_rank, 1)
  on conflict (user_id, company_id) do update set
    best_score = greatest(g.best_score, excluded.best_score),
    best_rank = greatest(g.best_rank, excluded.best_rank),
    shifts = g.shifts + 1, updated_at = now();

  insert into public.game_runs (user_id, company_id, seed, score, rank, correct, total, best_streak,
    duration_ms, fired, xp_awarded, clout_awarded, challenge_code)
  values (uid, p_company, p_seed, p_score, v_rank, p_correct, p_total, p_best_streak,
    p_duration_ms, coalesce(p_fired, false), v_xp, v_clout, p_challenge)
  returning id into v_run;

  with eligible as (
    select i.id from public.cosmetic_items i
    where i.unlock is not null and case
      when i.unlock like 'ceo:%' then exists (
        select 1 from public.game_company_progress g
        where g.user_id = uid and g.best_rank >= 6 and 'ceo:' || g.company_id = i.unlock)
      when i.unlock like 'level:%' then v_level >= split_part(i.unlock, ':', 2)::integer
      when i.unlock like 'streak:%' then v_streak >= split_part(i.unlock, ':', 2)::integer
      else false end
  ), added as (
    insert into public.player_items (user_id, item_id)
    select uid, e.id from eligible e
    on conflict (user_id, item_id) do nothing
    returning item_id
  )
  select coalesce(array_agg(item_id), '{}') into v_unlocked from added;

  return jsonb_build_object(
    'run_id', v_run, 'rank', v_rank, 'xp', v_xp, 'clout', v_clout,
    'daily_bonus', v_daily and v_clout > 0, 'capped', v_runs_today >= 40,
    'level', v_level, 'total_xp', st.xp + v_xp, 'total_clout', st.clout + v_clout,
    'streak', v_streak, 'previous_best', coalesce(v_prev_best, 0),
    'new_best', v_prev_best is null or p_score > v_prev_best,
    'unlocked', to_jsonb(v_unlocked));
end;
$$;

create function public.game_buy_item(p_item text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  it public.cosmetic_items;
  balance integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into it from public.cosmetic_items where id = p_item;
  if not found or it.unlock is not null or it.price <= 0 then raise exception 'not_for_sale'; end if;
  if exists (select 1 from public.player_items p where p.user_id = uid and p.item_id = p_item) then
    raise exception 'already_owned';
  end if;
  insert into public.player_stats (user_id) values (uid) on conflict (user_id) do nothing;
  update public.player_stats set clout = clout - it.price, updated_at = now()
    where user_id = uid and clout >= it.price
    returning clout into balance;
  if balance is null then raise exception 'not_enough_clout'; end if;
  insert into public.player_items (user_id, item_id) values (uid, p_item);
  return balance;
end;
$$;

create function public.game_set_avatar(p_avatar jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  k text;
  v text;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_avatar is null or jsonb_typeof(p_avatar) <> 'object' or octet_length(p_avatar::text) > 2000 then
    raise exception 'invalid_avatar';
  end if;
  for k, v in select key, value from jsonb_each_text(p_avatar) loop
    if k not in ('skin','hair','hairColor','top','hat','face','held','pet') then raise exception 'invalid_avatar'; end if;
    if not exists (
      select 1 from public.cosmetic_items i
      where i.id = v and i.slot = k and (
        (i.price = 0 and i.unlock is null)
        or exists (select 1 from public.player_items p where p.user_id = uid and p.item_id = i.id))
    ) then
      raise exception 'not_owned';
    end if;
  end loop;
  insert into public.player_stats (user_id, avatar) values (uid, p_avatar)
  on conflict (user_id) do update set avatar = excluded.avatar, updated_at = now();
end;
$$;

-- Turns one of your own runs into a shareable challenge code (same seed, same tasks).
create function public.game_create_challenge(p_run bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  r public.game_runs;
  v_code text;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into r from public.game_runs where id = p_run and user_id = uid;
  if not found then raise exception 'not_found'; end if;
  select code into v_code from public.game_challenges where run_id = p_run;
  if v_code is not null then return v_code; end if;
  if (select count(*) from public.game_challenges c where c.creator_id = uid and c.created_at > now() - interval '1 day') >= 30 then
    raise exception 'too_many_challenges';
  end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.game_challenges where code = v_code);
  end loop;
  insert into public.game_challenges (code, creator_id, run_id, company_id, seed, score, rank)
    values (v_code, uid, r.id, r.company_id, r.seed, r.score, r.rank);
  return v_code;
end;
$$;

-- Public challenge card: who set it, the score to beat, and how others got on.
-- Shows only the forum username (already public) and avatar, nothing else.
create function public.game_challenge(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code', c.code, 'company', c.company_id, 'seed', c.seed, 'score', c.score, 'rank', c.rank,
    'username', p.username::text,
    'avatar', coalesce(s.avatar, '{}'::jsonb),
    'attempts', (select count(*) from public.game_runs r where r.challenge_code = c.code),
    'beaten', (select count(*) from public.game_runs r where r.challenge_code = c.code and r.score > c.score),
    'best', (select coalesce(max(r.score), 0) from public.game_runs r where r.challenge_code = c.code))
  from public.game_challenges c
  left join public.profiles p on p.id = c.creator_id and not p.banned
  left join public.player_stats s on s.user_id = c.creator_id
  where c.code = upper(p_code);
$$;

revoke all on function private.game_rank_for(integer) from public;
grant execute on function private.game_rank_for(integer) to authenticated;
revoke all on function public.game_finish_run(text, integer, integer, integer, integer, integer, integer, boolean, text) from public, anon;
revoke all on function public.game_buy_item(text) from public, anon;
revoke all on function public.game_set_avatar(jsonb) from public, anon;
revoke all on function public.game_create_challenge(bigint) from public, anon;
revoke all on function public.game_challenge(text) from public;
grant execute on function public.game_finish_run(text, integer, integer, integer, integer, integer, integer, boolean, text) to authenticated;
grant execute on function public.game_buy_item(text) to authenticated;
grant execute on function public.game_set_avatar(jsonb) to authenticated;
grant execute on function public.game_create_challenge(bigint) to authenticated;
grant execute on function public.game_challenge(text) to anon, authenticated;

-- Let the existing feature counter track game visits too.
alter table public.feature_usage drop constraint if exists feature_usage_feature_check;
alter table public.feature_usage add constraint feature_usage_feature_check check (feature in
  ('courses','quizzes','flashcards','revision','resources','tiggy','jobs','next-steps','premium','billing','social','games'));

commit;
