-- IllumWorld's first assessed workplace project. Assignments use the existing
-- school class system; independent practice never grants a certificate.
create table public.learning_world_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid references public.learning_assignments(id) on delete cascade,
  mission_slug text not null default 'tech-repair-trainee' check(mission_slug='tech-repair-trainee'),
  answers jsonb not null,
  status text not null default 'draft' check(status in ('draft','submitted','changes_requested','approved')),
  score integer not null default 0 check(score between 0 and 3),
  feedback text check(length(feedback)<=4000),
  submitted_at timestamptz,
  approved_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  revision integer not null default 0 check(revision>=0),
  check(status<>'approved' or (assignment_id is not null and approved_at is not null and score=3))
);
create unique index learning_world_project_assignment on public.learning_world_projects(user_id,assignment_id) where assignment_id is not null;
create unique index learning_world_project_independent on public.learning_world_projects(user_id,mission_slug) where assignment_id is null;
create index learning_world_project_assignment_lookup on public.learning_world_projects(assignment_id);
create index learning_world_project_reviewer on public.learning_world_projects(reviewed_by);
alter table public.learning_world_projects enable row level security;
revoke all on public.learning_world_projects from public,anon,authenticated;
grant select on public.learning_world_projects to authenticated;
create policy "own projects and assigned teacher" on public.learning_world_projects for select to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.learning_assignments a
  where a.id=assignment_id and private.owns_class(a.class_id)));

create function private.save_learning_world_project(p_assignment uuid,p_answers jsonb,p_submit boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid();
  existing public.learning_world_projects;
  result public.learning_world_projects;
  device jsonb;
  expected integer;
  marked integer:=0;
  seen text[]:='{}';
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_answers is null or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>14000
     or jsonb_typeof(p_answers->'devices') is distinct from 'array' then raise exception 'invalid'; end if;
  if jsonb_array_length(p_answers->'devices')<>3
     or coalesce(p_answers->>'reportDevice','') not in ('raven-r4','kite-k2','ember-e3')
     or jsonb_typeof(p_answers->'report') is distinct from 'string'
     or length(p_answers->>'report')>2400 then raise exception 'invalid'; end if;
  for device in select value from jsonb_array_elements(p_answers->'devices') loop
    if jsonb_typeof(device)<>'object' or coalesce(device->>'id','') not in ('raven-r4','kite-k2','ember-e3')
       or device->>'id'=any(seen)
       or jsonb_typeof(device->'profit') is distinct from 'string'
       or jsonb_typeof(device->'decision') is distinct from 'string'
       or jsonb_typeof(device->'reason') is distinct from 'string'
       or coalesce(device->>'decision','') not in ('','repair','as-is','decline')
       or length(device->>'profit')>12 or length(device->>'reason')>1200 then raise exception 'invalid'; end if;
    seen:=array_append(seen,device->>'id');
    expected:=case device->>'id' when 'raven-r4' then 30 when 'kite-k2' then 40 else -15 end;
    if trim(device->>'profit') ~ '^-?[0-9]{1,6}(\.[0-9]{1,2})?$' then
      if abs((trim(device->>'profit'))::numeric-expected)<0.005 then marked:=marked+1; end if;
    elsif p_submit then raise exception 'missing_profit'; end if;
    if p_submit and (length(trim(device->>'reason'))<40 or device->>'decision'='') then raise exception 'incomplete'; end if;
  end loop;
  if p_submit and length(trim(p_answers->>'report'))<100 then raise exception 'incomplete_report'; end if;
  -- Prevent two first-save calls creating independent copies.
  perform pg_advisory_xact_lock(hashtextextended(uid::text||coalesce(p_assignment::text,'independent'),0));
  select * into existing from public.learning_world_projects
    where user_id=uid and assignment_id is not distinct from p_assignment for update;
  if existing.status='approved' or (existing.status='submitted' and existing.assignment_id is not null) then raise exception 'project_locked'; end if;
  -- This helper verifies active membership and exact product/resource pairing.
  perform private.learning_record_progress(p_assignment,'world','tech-repair-trainee',
    case when p_submit then 'submitted' else 'started' end,
    case when p_submit then marked end,case when p_submit then 3 end,
    case when p_submit then p_answers->>'report' end);
  if existing.id is null then
    insert into public.learning_world_projects(user_id,assignment_id,answers,status,score,submitted_at,revision)
    values(uid,p_assignment,p_answers,case when p_submit then 'submitted' else 'draft' end,marked,
      case when p_submit then now() end,case when p_submit then 1 else 0 end) returning * into result;
  else
    update public.learning_world_projects set answers=p_answers,status=case when p_submit then 'submitted' else 'draft' end,
      score=marked,submitted_at=case when p_submit then now() else submitted_at end,updated_at=now(),
      revision=revision+case when p_submit then 1 else 0 end,
      feedback=case when p_submit then null else feedback end,approved_at=null,reviewed_by=null
    where id=existing.id returning * into result;
  end if;
  return to_jsonb(result);
end; $$;
revoke all on function private.save_learning_world_project(uuid,jsonb,boolean) from public,anon;
grant execute on function private.save_learning_world_project(uuid,jsonb,boolean) to authenticated;
create function public.save_learning_world_project(p_assignment uuid,p_answers jsonb,p_submit boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_learning_world_project(p_assignment,p_answers,p_submit);
$$;
revoke all on function public.save_learning_world_project(uuid,jsonb,boolean) from public,anon;
grant execute on function public.save_learning_world_project(uuid,jsonb,boolean) to authenticated;

create function private.review_learning_world_project(p_project uuid,p_decision text,p_feedback text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.learning_world_projects; a public.learning_assignments;
begin
  if auth.uid() is null then raise exception 'not_allowed'; end if;
  select * into p from public.learning_world_projects where id=p_project for update;
  select * into a from public.learning_assignments where id=p.assignment_id;
  if p.id is null or a.id is null or not private.owns_class(a.class_id)
    or not exists(select 1 from public.class_members where class_id=a.class_id and user_id=p.user_id)
    then raise exception 'not_allowed'; end if;
  if p_decision is null or p_decision not in ('approved','changes_requested')
    or length(coalesce(p_feedback,''))>4000 then raise exception 'invalid'; end if;
  if p.status not in ('submitted','approved') then raise exception 'not_submitted'; end if;
  if p_decision='approved' and p.score<>3 then raise exception 'calculations_need_correction'; end if;
  if p_decision='changes_requested' and length(trim(coalesce(p_feedback,'')))<10 then raise exception 'feedback_required'; end if;
  update public.learning_world_projects set status=p_decision,feedback=nullif(trim(p_feedback),''),reviewed_by=auth.uid(),
    approved_at=case when p_decision='approved' then now() end,updated_at=now() where id=p.id;
  update public.learning_assignment_progress set status=p_decision,feedback=nullif(trim(p_feedback),'')
    where assignment_id=p.assignment_id and user_id=p.user_id;
end; $$;
revoke all on function private.review_learning_world_project(uuid,text,text) from public,anon;
grant execute on function private.review_learning_world_project(uuid,text,text) to authenticated;
create function public.review_learning_world_project(p_project uuid,p_decision text,p_feedback text)
returns void language sql security invoker set search_path='' as $$
  select private.review_learning_world_project(p_project,p_decision,p_feedback);
$$;
revoke all on function public.review_learning_world_project(uuid,text,text) from public,anon;
grant execute on function public.review_learning_world_project(uuid,text,text) to authenticated;
