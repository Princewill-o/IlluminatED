-- Daily and weekly quests, checked against real activity (races, Championship,
-- quizzes, study sessions, shifts). Three daily quests rotate each day; missing
-- a day never costs anything. Rewards are Clout and XP only.
-- Rollback: remove public.quest_board, public.quest_claim, private.quest_* and public.quest_claims.
create table if not exists public.quest_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  quest text not null,
  period date not null,
  reward integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest, period)
);
alter table public.quest_claims enable row level security;

create or replace function private.quest_catalogue() returns table (key text, title text, target integer, reward integer, weekly boolean)
language sql immutable set search_path = '' as $$
  values
    ('d-champ', 'Get 8 Championship questions right', 8, 15, false),
    ('d-race-win', 'Win a Maths Racing race', 1, 15, false),
    ('d-races', 'Finish 2 Maths Racing races', 2, 10, false),
    ('d-quiz', 'Score 80% or more in a quiz (5+ questions)', 1, 15, false),
    ('d-study', 'Complete a Study Quarter session', 1, 15, false),
    ('d-shift', 'Work a shift with 4 or more correct', 1, 15, false),
    ('d-arcade', 'Score 20 or more in an Arcade game', 1, 10, false),
    ('w-sessions', 'Complete 3 revision sessions this week', 3, 40, true),
    ('w-champ', 'Answer 40 Championship questions this week', 40, 50, true),
    ('w-wins', 'Win 3 Maths Racing races this week', 3, 40, true)
$$;

create or replace function private.quest_today() returns date language sql stable set search_path = '' as $$ select (now() at time zone 'Europe/London')::date; $$;

/** Today's three daily quests: a rotation through the seven, different each day. */
create or replace function private.quest_daily_keys(d date) returns text[] language sql immutable set search_path = '' as $$
  select array_agg(k order by i) from (
    select i, (array['d-champ', 'd-race-win', 'd-races', 'd-quiz', 'd-study', 'd-shift', 'd-arcade'])[1 + ((d - date '2026-01-01') + i * 2) % 7] as k
    from generate_series(0, 2) i
  ) t;
$$;

create or replace function private.quest_progress(uid uuid, k text) returns integer
language sql stable security definer set search_path = '' as $$
  with b as (
    select (private.quest_today()::timestamp at time zone 'Europe/London') as day0,
           (private.champ_week()::timestamp at time zone 'Europe/London') as week0
  )
  select coalesce(case k
    when 'd-champ' then (select count(*) from public.champ_attempts a join public.champ_entries e on e.id = a.entry_id, b where e.user_id = uid and a.correct and a.answered_at >= b.day0)
    when 'd-race-win' then (select count(*) from public.racing_runs r, b where r.user_id = uid and r.place = 1 and r.mode <> 'trial' and r.finished_at >= b.day0)
    when 'd-races' then (select count(*) from public.racing_runs r, b where r.user_id = uid and r.finished_at >= b.day0)
    when 'd-quiz' then (select count(*) from public.quiz_rounds q, b where q.user_id = uid and q.total >= 5 and q.correct * 5 >= q.total * 4 and q.created_at >= b.day0)
    when 'd-study' then (select count(*) from public.study_sessions s, b where s.user_id = uid and s.completed_at >= b.day0)
    when 'd-shift' then (select count(*) from public.career_shifts s, b where s.user_id = uid and s.correct >= 4 and s.created_at >= b.day0)
    when 'd-arcade' then (select count(*) from public.arcade_rounds a, b where a.user_id = uid and a.score >= 20 and a.created_at >= b.day0)
    when 'w-sessions' then (select (select count(*) from public.study_sessions s where s.user_id = uid and s.completed_at >= b.week0)
                                 + (select count(*) from public.quiz_rounds q where q.user_id = uid and q.total >= 5 and q.created_at >= b.week0) from b)
    when 'w-champ' then (select coalesce(sum(e.answered), 0) from public.champ_entries e where e.user_id = uid and e.week = private.champ_week())
    when 'w-wins' then (select count(*) from public.racing_runs r, b where r.user_id = uid and r.place = 1 and r.mode <> 'trial' and r.finished_at >= b.week0)
  end, 0)::int;
$$;
revoke all on function private.quest_progress(uuid, text) from public, anon, authenticated;

create or replace function public.quest_board() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', c.key, 'title', c.title, 'target', c.target, 'reward', c.reward, 'weekly', c.weekly,
    'progress', least(c.target, private.quest_progress((select auth.uid()), c.key)),
    'claimed', exists (select 1 from public.quest_claims q where q.user_id = (select auth.uid()) and q.quest = c.key
      and q.period = case when c.weekly then private.champ_week() else private.quest_today() end))
    order by c.weekly, array_position(private.quest_daily_keys(private.quest_today()), c.key)), '[]'::jsonb)
  from private.quest_catalogue() c
  where (select auth.uid()) is not null and (c.weekly or c.key = any (private.quest_daily_keys(private.quest_today())));
$$;

create or replace function public.quest_claim(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c record; per date;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into c from private.quest_catalogue() q where q.key = p_key;
  if not found or (not c.weekly and not (p_key = any (private.quest_daily_keys(private.quest_today()))) ) then raise exception 'invalid'; end if;
  per := case when c.weekly then private.champ_week() else private.quest_today() end;
  if private.quest_progress(uid, p_key) < c.target then raise exception 'not_done'; end if;
  insert into public.quest_claims (user_id, quest, period, reward) values (uid, p_key, per, c.reward) on conflict do nothing;
  if not found then raise exception 'already_claimed'; end if;
  insert into public.player_stats (user_id) values (uid) on conflict do nothing;
  update public.player_stats set clout = clout + c.reward, xp = xp + c.reward, updated_at = now() where user_id = uid;
  return jsonb_build_object('reward', c.reward);
end; $$;

revoke all on function public.quest_board(), public.quest_claim(text) from public, anon;
grant execute on function public.quest_board(), public.quest_claim(text) to authenticated;
