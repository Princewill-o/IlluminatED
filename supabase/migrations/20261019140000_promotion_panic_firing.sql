-- Promotion Panic failure ends the matching active career job. Keep the job
-- record as history so its shifts and CV evidence remain available.
alter table public.career_jobs drop constraint if exists career_jobs_status_check;
alter table public.career_jobs add constraint career_jobs_status_check
  check (status in ('active', 'left', 'fired'));

create or replace function public.career_fire(p_workplace text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null or not private.is_active_member() then
    raise exception 'not_allowed';
  end if;
  if p_workplace is null or p_workplace !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'invalid';
  end if;
  update public.career_jobs
    set status = 'fired'
    where user_id = uid and workplace = p_workplace and status = 'active';
  return found;
end;
$$;

revoke all on function public.career_fire(text) from public, anon;
grant execute on function public.career_fire(text) to authenticated;
