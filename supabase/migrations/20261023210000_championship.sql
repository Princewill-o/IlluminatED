-- IllumED Championship: a free weekly competition per division.
-- Questions come from the question bank and are served one at a time; the
-- correct answer stays on the server until the student has answered.
-- Daily cap of 15 questions keeps it fair and stops grinding.
-- Rollback: remove the champ_* functions and the champ_attempts and champ_entries tables.

create or replace function private.champ_week(t timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select date_trunc('week', (t at time zone 'Europe/London'))::date; $$;

create table if not exists public.champ_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  division text not null check (division in ('gcse-foundation', 'gcse-higher', 'a-level', 'vocational')),
  points integer not null default 0,
  correct integer not null default 0,
  answered integer not null default 0,
  reward integer,
  badge text,
  created_at timestamptz not null default now(),
  unique (user_id, week)
);
create index if not exists champ_entries_board on public.champ_entries (week, division, points desc);
alter table public.champ_entries enable row level security;

create table if not exists public.champ_attempts (
  id bigint generated always as identity primary key,
  entry_id bigint not null references public.champ_entries (id) on delete cascade,
  question_id text not null,
  options jsonb not null,
  answer smallint not null,
  explain text,
  worth smallint not null,
  served_at timestamptz not null default clock_timestamp(),
  answered_at timestamptz,
  choice smallint,
  correct boolean
);
create index if not exists champ_attempts_entry on public.champ_attempts (entry_id, served_at);
alter table public.champ_attempts enable row level security;
-- No direct access to either table: the functions below are the only way in.

create or replace function private.champ_levels(p_division text) returns text[] language sql immutable set search_path = '' as $$
  select case p_division when 'a-level' then array['A-level'] when 'vocational' then array['BTEC', 'T Level', 'GCSE'] else array['GCSE'] end;
$$;
create or replace function private.champ_difficulty_ok(p_division text, d text) returns boolean language sql immutable set search_path = '' as $$
  select case p_division
    when 'gcse-foundation' then d in ('foundation', 'foundation/developing', 'ungraded')
    when 'gcse-higher' then d in ('intermediate', 'stretch', 'ungraded', 'advanced')
    when 'vocational' then d in ('foundation', 'foundation/developing', 'ungraded', 'intermediate')
    else true end;
$$;
create or replace function private.champ_worth(d text) returns smallint language sql immutable set search_path = '' as $$
  select (case when d in ('stretch', 'advanced') then 20 when d = 'intermediate' then 15 when d = 'ungraded' then 12 else 10 end)::smallint;
$$;

create or replace function public.champ_enter(p_division text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); e public.champ_entries;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_division not in ('gcse-foundation', 'gcse-higher', 'a-level', 'vocational') then raise exception 'invalid'; end if;
  insert into public.champ_entries (user_id, week, division) values (uid, private.champ_week(), p_division)
    on conflict (user_id, week) do nothing;
  select * into e from public.champ_entries where user_id = uid and week = private.champ_week();
  -- You can switch division only before answering anything this week.
  if e.answered = 0 and e.division <> p_division then update public.champ_entries set division = p_division where id = e.id; end if;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.champ_next() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid()); e public.champ_entries; a public.champ_attempts; q record;
  wrong text[]; opts text[]; slot integer; today integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into e from public.champ_entries where user_id = uid and week = private.champ_week();
  if not found then raise exception 'not_entered'; end if;
  -- An open question (not yet answered, still in time) is served again, not replaced.
  select * into a from public.champ_attempts where entry_id = e.id and answered_at is null and served_at > clock_timestamp() - interval '75 seconds' order by served_at desc limit 1;
  if not found then
    -- Expired open questions count as wrong.
    update public.champ_attempts set answered_at = clock_timestamp(), correct = false where entry_id = e.id and answered_at is null;
    update public.champ_entries set answered = (select count(*) from public.champ_attempts where entry_id = e.id and answered_at is not null) where id = e.id;
    select count(*) into today from public.champ_attempts where entry_id = e.id and (served_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date;
    if today >= 15 then raise exception 'daily_cap'; end if;
    for q in
      select b.* from public.bank_questions b
      where b.review_status not in ('retired', 'flagged_needs_fix')
        and b.level = any (private.champ_levels(e.division)) and private.champ_difficulty_ok(e.division, b.difficulty)
        and b.question_type in ('short_answer', 'calculation', 'multiple_choice')
        and char_length(b.answer) between 1 and 60 and char_length(b.question) <= 260
        and not exists (select 1 from public.champ_attempts x where x.entry_id = e.id and x.question_id = b.id)
      order by random() limit 6
    loop
      select array_agg(s.a) into wrong from (
        select min(d.answer) as a, bool_or(d.topic = q.topic) as same_topic from public.bank_questions d
        where d.subject = q.subject and d.id <> q.id and lower(trim(d.answer)) <> lower(trim(q.answer))
          and char_length(d.answer) between 1 and 60 and d.question_type = q.question_type
          and d.review_status not in ('retired', 'flagged_needs_fix')
        group by lower(trim(d.answer))
        order by bool_or(d.topic = q.topic) desc, abs(char_length(min(d.answer)) - char_length(q.answer)), random() limit 3
      ) s;
      continue when coalesce(cardinality(wrong), 0) < 3;
      slot := floor(random() * 4)::int;
      opts := wrong[1:slot] || array[q.answer] || wrong[slot + 1:3];
      insert into public.champ_attempts (entry_id, question_id, options, answer, explain, worth)
        values (e.id, q.id, to_jsonb(opts), slot, coalesce(nullif(q.explanation, ''), 'The answer is ' || q.answer || '.'), private.champ_worth(q.difficulty))
        returning * into a;
      exit;
    end loop;
    if a.id is null then raise exception 'no_questions'; end if;
  end if;
  select bq.subject, bq.topic, bq.question into q from public.bank_questions bq where bq.id = a.question_id;
  select count(*) into today from public.champ_attempts where entry_id = e.id and (served_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date;
  -- The answer is NOT included.
  return jsonb_build_object('id', a.id, 'prompt', q.question, 'subject', q.subject, 'topic', q.topic, 'options', a.options, 'worth', a.worth,
    'deadline', extract(epoch from a.served_at + interval '75 seconds') * 1000, 'today', today);
end; $$;

create or replace function public.champ_answer(p_attempt bigint, p_choice integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); a public.champ_attempts; e public.champ_entries; ok boolean; late boolean;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select a2.* into a from public.champ_attempts a2 join public.champ_entries e2 on e2.id = a2.entry_id
    where a2.id = p_attempt and e2.user_id = uid and e2.week = private.champ_week() for update of a2;
  if not found or a.answered_at is not null then raise exception 'invalid'; end if;
  -- Read the question first: answers in under two seconds aren't accepted.
  if clock_timestamp() - a.served_at < interval '2 seconds' then raise exception 'too_fast'; end if;
  late := clock_timestamp() - a.served_at > interval '75 seconds';
  ok := not late and p_choice = a.answer;
  update public.champ_attempts set answered_at = clock_timestamp(), choice = p_choice, correct = ok where id = a.id;
  update public.champ_entries set answered = answered + 1, correct = correct + ok::int, points = points + case when ok then a.worth else 0 end
    where id = a.entry_id returning * into e;
  return jsonb_build_object('correct', ok, 'late', late, 'answer', a.answer, 'explain', a.explain, 'worth', case when ok then a.worth else 0 end,
    'points', e.points, 'answered', e.answered, 'right', e.correct);
end; $$;

create or replace function public.champ_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  with me as (select * from public.champ_entries where user_id = (select auth.uid()) and week = private.champ_week())
  select jsonb_build_object(
    'week', private.champ_week(),
    'endsAt', extract(epoch from ((private.champ_week() + 7)::timestamp at time zone 'Europe/London')) * 1000,
    'entry', (select jsonb_build_object('division', m.division, 'points', m.points, 'answered', m.answered, 'right', m.correct,
      'rank', (select count(*) + 1 from public.champ_entries o where o.week = m.week and o.division = m.division and o.points > m.points),
      'players', (select count(*) from public.champ_entries o where o.week = m.week and o.division = m.division),
      'today', (select count(*) from public.champ_attempts t where t.entry_id = m.id and (t.served_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date))
      from me m),
    'history', coalesce((select jsonb_agg(jsonb_build_object('week', h.week, 'division', h.division, 'points', h.points, 'answered', h.answered, 'right', h.correct,
      'rank', (select count(*) + 1 from public.champ_entries o where o.week = h.week and o.division = h.division and o.points > h.points),
      'players', (select count(*) from public.champ_entries o where o.week = h.week and o.division = h.division),
      'reward', h.reward, 'badge', h.badge) order by h.week desc)
      from (select * from public.champ_entries where user_id = (select auth.uid()) and week < private.champ_week() order by week desc limit 8) h), '[]'::jsonb));
$$;

create or replace function public.champ_board(p_division text, p_week date default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('top', coalesce(jsonb_agg(jsonb_build_object('name', coalesce(p.username, 'player'), 'points', e.points,
      'acc', case when e.answered > 0 then round(100.0 * e.correct / e.answered) else 0 end, 'me', e.user_id = (select auth.uid())) order by e.points desc, e.correct desc), '[]'::jsonb))
  from (select * from public.champ_entries where week = coalesce(p_week, private.champ_week()) and division = p_division and answered > 0
        order by points desc, correct desc limit 50) e
  left join public.profiles p on p.id = e.user_id;
$$;

-- After a week ends: collect your reward once (free virtual rewards only).
create or replace function public.champ_claim(p_week date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); e public.champ_entries; better integer; total integer; pct numeric; r integer := 0; b text := null;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_week >= private.champ_week() then raise exception 'not_finished'; end if;
  select * into e from public.champ_entries where user_id = uid and week = p_week for update;
  if not found then raise exception 'invalid'; end if;
  if e.reward is not null then raise exception 'already_claimed'; end if;
  select count(*) into total from public.champ_entries where week = p_week and division = e.division and answered >= 5;
  select count(*) into better from public.champ_entries where week = p_week and division = e.division and answered >= 5 and points > e.points;
  pct := case when total > 0 then (better + 1)::numeric / total else 1 end;
  if e.answered >= 5 and pct <= 0.10 then r := 150; b := 'gold';
  elsif e.answered >= 5 and pct <= 0.25 then r := 75; b := 'silver';
  elsif e.answered >= 5 and pct <= 0.50 then r := 40; b := 'bronze';
  elsif e.answered >= 10 then r := 20; b := 'finisher';
  end if;
  update public.champ_entries set reward = r, badge = b where id = e.id;
  if r > 0 then
    insert into public.player_stats (user_id) values (uid) on conflict do nothing;
    update public.player_stats set clout = clout + r, xp = xp + r, updated_at = now() where user_id = uid;
  end if;
  return jsonb_build_object('reward', r, 'badge', b, 'rank', better + 1, 'players', total);
end; $$;

revoke all on function public.champ_enter(text), public.champ_next(), public.champ_answer(bigint, integer), public.champ_status(),
  public.champ_board(text, date), public.champ_claim(date) from public, anon;
grant execute on function public.champ_enter(text), public.champ_next(), public.champ_answer(bigint, integer), public.champ_status(),
  public.champ_board(text, date), public.champ_claim(date) to authenticated;
