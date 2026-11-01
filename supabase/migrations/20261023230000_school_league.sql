-- School vs School: weekly league tables built from Championship points and
-- Maths Racing wins. Only verified school memberships count (schools add their
-- students; nobody can join a school themselves), a school needs at least 5
-- active students to be ranked, and its score is the average of its top 10
-- students, so big schools don't win just by being big and one star student
-- can't carry a tiny team. Student names are never shown, only school names.
-- Rollback: remove public.school_league and public.school_mine and private.school_scores.

create or replace function private.school_scores(p_week date, p_subject text default null)
returns table (school_id uuid, name text, active integer, score numeric, wins integer)
language sql stable security definer set search_path = '' as $$
  with members as (
    select m.user_id, m.school_id, l.name from public.school_memberships m
    join public.school_licences l on l.id = m.school_id
    where m.role = 'student' and l.status = 'active' and (l.expires_at is null or l.expires_at > now())
  ),
  pts as (
    select e.user_id,
      case when p_subject is null then e.points
      else coalesce((select sum(a.worth) from public.champ_attempts a join public.bank_questions b on b.id = a.question_id
                     where a.entry_id = e.id and a.correct and b.subject = p_subject), 0) end as points,
      e.answered
    from public.champ_entries e where e.week = p_week
  ),
  racing as (
    select r.user_id, count(*) filter (where r.place = 1 and r.mode <> 'trial') as wins
    from public.racing_runs r
    where r.finished_at >= (p_week::timestamp at time zone 'Europe/London') and r.finished_at < ((p_week + 7)::timestamp at time zone 'Europe/London')
    group by r.user_id
  ),
  per_student as (
    select m.school_id, m.name, m.user_id, coalesce(p.points, 0) + 5 * least(coalesce(rc.wins, 0), 10) as total,
      coalesce(rc.wins, 0) as wins, (coalesce(p.answered, 0) >= 5 or coalesce(rc.wins, 0) >= 1) as active
    from members m left join pts p on p.user_id = m.user_id left join racing rc on rc.user_id = m.user_id
  ),
  ranked as (
    select *, row_number() over (partition by school_id order by total desc) as rn from per_student where active
  )
  select school_id, min(name), count(*)::int, round(avg(total) filter (where rn <= 10), 1), sum(wins)::int
  from ranked group by school_id;
$$;
revoke all on function private.school_scores(date, text) from public, anon, authenticated;

create or replace function public.school_league(p_subject text default null, p_week date default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'week', coalesce(p_week, private.champ_week()),
    'minimum', 5,
    'table', coalesce(jsonb_agg(jsonb_build_object('school', s.name, 'active', s.active, 'score', s.score, 'wins', s.wins,
      'mine', exists (select 1 from public.school_memberships m where m.user_id = (select auth.uid()) and m.school_id = s.school_id))
      order by s.score desc), '[]'::jsonb))
  from private.school_scores(coalesce(p_week, private.champ_week()), p_subject) s
  where (select auth.uid()) is not null and s.active >= 5;
$$;

-- Your school's standing (only to its own members).
create or replace function public.school_mine() returns jsonb
language sql stable security definer set search_path = '' as $$
  with mine as (
    select m.school_id, l.name from public.school_memberships m join public.school_licences l on l.id = m.school_id
    where m.user_id = (select auth.uid()) limit 1
  ), s as (select * from private.school_scores(private.champ_week(), null))
  select case when not exists (select 1 from mine) then null else jsonb_build_object(
    'school', (select name from mine),
    'active', coalesce((select active from s where s.school_id = (select school_id from mine)), 0),
    'score', (select score from s where s.school_id = (select school_id from mine)),
    'rank', (select count(*) + 1 from s where s.active >= 5 and s.score > coalesce((select score from s x where x.school_id = (select school_id from mine)), -1)),
    'schools', (select count(*) from s where s.active >= 5)) end;
$$;

revoke all on function public.school_league(text, date), public.school_mine() from public, anon;
grant execute on function public.school_league(text, date), public.school_mine() to authenticated;
