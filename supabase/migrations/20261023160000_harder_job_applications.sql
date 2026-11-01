-- Job applications are a five-question paper form now: two behavioural
-- questions and three job tasks. Pass mark 4/5; it takes at least 20 seconds.
create or replace function private.career_interview(p_workplace text, p_correct integer, p_duration_ms integer)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  uid uuid := (select auth.uid());
  r public.career_roles;
  passed boolean;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into r from public.career_roles where workplace = p_workplace and rank = 1;
  if not found then raise exception 'unknown_workplace'; end if;
  if p_correct is null or p_correct not between 0 and 5 or p_duration_ms is null or p_duration_ms < 20000 then raise exception 'invalid'; end if;
  if exists (select 1 from public.career_interviews i where i.user_id = uid and i.workplace = p_workplace and not i.passed and i.created_at > now() - interval '10 minutes') then
    raise exception 'cooldown';
  end if;
  if exists (select 1 from public.career_jobs j where j.user_id = uid and j.workplace = p_workplace and j.status = 'active') then raise exception 'already_hired'; end if;
  passed := p_correct >= 4;
  insert into public.career_interviews (user_id, workplace, passed) values (uid, p_workplace, passed);
  if passed then
    update public.career_jobs set status = 'left' where user_id = uid and status = 'active';
    insert into public.career_jobs (user_id, workplace, role, rank) values (uid, p_workplace, r.role, 1)
    on conflict (user_id, workplace) do update set status = 'active', hired_at = now();
  end if;
  return jsonb_build_object('passed', passed, 'role', r.role);
end;
$function$;
