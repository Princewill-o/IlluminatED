-- Principals (headteachers): a school-wide view of teachers, classes and learning, and the ability to invite staff and students.
-- A principal is a teacher at the school with a principal record (added by a platform admin).
create table if not exists public.school_principals (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  school_id  uuid not null references public.school_licences (id) on delete cascade,
  added_by   uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.school_principals enable row level security;
revoke all on public.school_principals from public, anon, authenticated;
grant select on public.school_principals to authenticated;
grant insert on public.school_principals to authenticated;
create policy "own principal record or platform admin" on public.school_principals for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());
create policy "platform admins add principals" on public.school_principals for insert to authenticated
  with check (private.is_platform_admin());

create or replace function private.principal_school() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.school_id from public.school_principals sp
  join public.school_memberships m on m.user_id = sp.user_id and m.school_id = sp.school_id and m.role = 'teacher'
  join public.school_licences s on s.id = m.school_id
  where sp.user_id = (select auth.uid()) and s.status = 'active'
    and s.payment_approved_at is not null and s.expires_at > now();
$$;
revoke all on function private.principal_school() from public, anon;
grant execute on function private.principal_school() to authenticated;

-- Aggregates only: usernames of staff, class-level counts and course-level accuracy. No individual student answers.
create or replace function public.school_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare sid uuid := private.principal_school(); result jsonb;
begin
  if sid is null then raise exception 'not_allowed'; end if;
  with students as (
    select m.user_id from public.school_memberships m where m.school_id = sid and m.role = 'student'
  ), staff as (
    select m.user_id, case when exists (select 1 from public.school_principals sp where sp.user_id = m.user_id) then 'principal' else 'teacher' end as role, p.username::text as username from public.school_memberships m
    left join public.profiles p on p.id = m.user_id where m.school_id = sid and m.role = 'teacher'
  ), cls as (
    select c.id, c.name, c.subject, c.owner_id,
      (select count(*) from public.class_members cm where cm.class_id = c.id) as learners,
      (select count(*) from public.homework h where h.class_id = c.id) as homework,
      (select count(*) from public.homework_submissions hs join public.homework h on h.id = hs.homework_id where h.class_id = c.id) as submissions
    from public.classes c where c.school_id = sid or c.owner_id in (select user_id from staff)
  ), courses as (
    select q.course_id, count(distinct q.user_id) as learners, sum(q.seen) as seen, sum(q.correct) as correct
    from public.question_progress q where q.user_id in (select user_id from students) group by q.course_id
  ), topics as (
    select q.topic_id, q.course_id, sum(q.seen) as seen, sum(q.correct) as correct, count(distinct q.user_id) as learners
    from public.question_progress q where q.user_id in (select user_id from students) group by q.topic_id, q.course_id
    having count(distinct q.user_id) >= 3 and sum(q.seen) >= 10
  )
  select jsonb_build_object(
    'school', (select jsonb_build_object('name', s.name, 'seats', s.seats, 'expiresAt', s.expires_at) from public.school_licences s where s.id = sid),
    'students', (select count(*) from students),
    'activeThisWeek', (select count(distinct r.user_id) from public.quiz_rounds r where r.user_id in (select user_id from students) and r.created_at > now() - interval '7 days'),
    'answeredThisWeek', coalesce((select sum(r.total) from public.quiz_rounds r where r.user_id in (select user_id from students) and r.created_at > now() - interval '7 days'), 0),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('username', st.username, 'role', st.role,
        'classes', (select count(*) from cls where cls.owner_id = st.user_id),
        'learners', (select coalesce(sum(learners), 0) from cls where cls.owner_id = st.user_id)) order by st.role desc, st.username) from staff st), '[]'::jsonb),
    'classes', coalesce((select jsonb_agg(jsonb_build_object('name', cls.name, 'subject', cls.subject, 'teacher', (select username from staff where staff.user_id = cls.owner_id),
        'learners', cls.learners, 'homework', cls.homework, 'submissions', cls.submissions) order by cls.name) from cls), '[]'::jsonb),
    'courses', coalesce((select jsonb_agg(jsonb_build_object('courseId', course_id, 'learners', learners, 'accuracy', case when seen > 0 then round(correct::numeric / seen, 3) else null end) order by learners desc) from courses), '[]'::jsonb),
    'weakTopics', coalesce((select jsonb_agg(t) from (select jsonb_build_object('topicId', topic_id, 'courseId', course_id, 'learners', learners, 'accuracy', round(correct::numeric / seen, 3)) t
        from topics order by correct::numeric / seen asc limit 8) x), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('email', i.email, 'role', i.school_role, 'at', i.created_at) order by i.created_at desc)
        from public.access_invites i where i.school_id = sid and not exists (select 1 from auth.users u join public.school_memberships m on m.user_id = u.id where lower(u.email) = i.email)), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.school_overview() from public, anon;
grant execute on function public.school_overview() to authenticated;

-- Principals invite teachers and students (not other principals) to their own school. Student invites respect the seat count.
create or replace function public.school_invite(p_email text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid := private.principal_school(); e text := lower(trim(p_email)); seats integer; used integer;
begin
  if sid is null then raise exception 'not_allowed'; end if;
  if p_role not in ('teacher','student') then raise exception 'invalid_role'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 200 then raise exception 'invalid_email'; end if;
  if exists (select 1 from public.access_invites i where i.email = e and i.school_id is not null and i.school_id <> sid) then raise exception 'other_school'; end if;
  if p_role = 'student' then
    select s.seats into seats from public.school_licences s where s.id = sid;
    select (select count(*) from public.school_memberships m where m.school_id = sid and m.role = 'student')
         + (select count(*) from public.access_invites i where i.school_id = sid and i.school_role = 'student'
              and not exists (select 1 from auth.users u join public.school_memberships m on m.user_id = u.id where lower(u.email) = i.email)) into used;
    if used >= seats then raise exception 'no_seats'; end if;
  end if;
  if (select count(*) from public.access_invites i where i.invited_by = (select auth.uid()) and i.created_at > now() - interval '1 day') >= 300 then raise exception 'rate_limited'; end if;
  insert into public.access_invites (email, note, invited_by, school_id, school_role)
  values (e, 'Invited by principal', (select auth.uid()), sid, p_role)
  on conflict (email) do update set school_id = excluded.school_id, school_role = excluded.school_role, invited_by = excluded.invited_by
    where public.access_invites.school_id is null or public.access_invites.school_id = sid;
end;
$$;
revoke all on function public.school_invite(text, text) from public, anon;
grant execute on function public.school_invite(text, text) to authenticated;

-- Platform admins can mark a teacher invitation as a principal invitation.
alter table public.access_invites add column if not exists principal boolean not null default false;

create or replace function private.principal_school() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.school_id from public.school_memberships m
  join public.school_licences s on s.id = m.school_id
  where m.user_id = (select auth.uid()) and m.role = 'teacher' and s.status = 'active'
    and s.payment_approved_at is not null and s.expires_at > now()
    and (exists (select 1 from public.school_principals sp where sp.user_id = m.user_id and sp.school_id = m.school_id)
      or exists (select 1 from public.access_invites i join auth.users u on lower(u.email) = i.email
                 where u.id = m.user_id and i.school_id = m.school_id and i.principal));
$$;

create or replace function public.is_principal() returns boolean
language sql stable security definer set search_path = '' as $$ select private.principal_school() is not null; $$;
revoke all on function public.is_principal() from public, anon;
grant execute on function public.is_principal() to authenticated;
