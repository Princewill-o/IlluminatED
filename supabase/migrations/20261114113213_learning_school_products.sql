-- One existing class can assign any of the four Learning products.
create table public.learning_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  product text not null check(product in ('world','maths','science','english')),
  resource_slug text not null check(length(resource_slug) between 3 and 80),
  title text not null check(length(title) between 2 and 120),
  due_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index learning_assignments_class on public.learning_assignments(class_id,created_at desc);
create index learning_assignments_creator on public.learning_assignments(created_by);
create table public.learning_assignment_progress (
  assignment_id uuid not null references public.learning_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'started' check(status in ('started','submitted','completed','changes_requested','approved')),
  score integer,
  max_score integer,
  written_response text check(length(written_response)<=12000),
  feedback text check(length(feedback)<=4000),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  primary key(assignment_id,user_id),
  check((score is null and max_score is null) or (score>=0 and max_score>0 and score<=max_score))
);
create index learning_assignment_progress_user on public.learning_assignment_progress(user_id);
alter table public.learning_assignments enable row level security;
alter table public.learning_assignment_progress enable row level security;
revoke all on public.learning_assignments,public.learning_assignment_progress from public,anon,authenticated;
grant select on public.learning_assignments,public.learning_assignment_progress to authenticated;
create policy "class members and teacher read product assignments" on public.learning_assignments for select to authenticated
using(private.owns_class(class_id) or private.in_class(class_id));
create policy "own current class progress or teacher" on public.learning_assignment_progress for select to authenticated
using(exists(select 1 from public.learning_assignments a where a.id=assignment_id and
  (private.owns_class(a.class_id) or (user_id=(select auth.uid()) and private.in_class(a.class_id)))));

create function public.learning_assignment_create(p_class uuid,p_product text,p_slug text,p_title text,p_due timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if auth.uid() is null or not private.owns_class(p_class) then raise exception 'not_allowed'; end if;
  if not ((p_product='world' and p_slug='tech-repair-trainee') or
    (p_product='maths' and p_slug in ('percentages','ratio-proportion','profit-financial-maths')) or
    (p_product='science' and p_slug in ('cells-microscopy','particles-materials','electricity-circuits')) or
    (p_product='english' and p_slug in ('reading-evidence','language-analysis','writing-audience'))) then raise exception 'invalid_resource'; end if;
  if p_title is null or length(trim(p_title)) not between 2 and 120 or (p_due is not null and p_due<=now()) then raise exception 'invalid'; end if;
  if (select count(*) from public.learning_assignments where class_id=p_class and created_at>now()-interval '1 hour')>=30 then raise exception 'rate_limit'; end if;
  insert into public.learning_assignments(class_id,product,resource_slug,title,due_at,created_by)
  values(p_class,p_product,p_slug,trim(p_title),p_due,auth.uid()) returning id into result;
  return result;
end; $$;
revoke all on function public.learning_assignment_create(uuid,text,text,text,timestamptz) from public,anon;
grant execute on function public.learning_assignment_create(uuid,text,text,text,timestamptz) to authenticated;

-- Internal only. Subject marking and World submission RPCs call this after
-- calculating the result, so a browser cannot submit a fabricated score.
create function private.learning_record_progress(p_assignment uuid,p_product text,p_slug text,p_status text,p_score integer,p_max_score integer,p_written text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.learning_assignments;
begin
  if p_assignment is null then return; end if;
  if auth.uid() is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into a from public.learning_assignments where id=p_assignment;
  if a.id is null or not private.in_class(a.class_id) or a.product<>p_product or a.resource_slug<>p_slug then raise exception 'assignment_mismatch'; end if;
  if p_status not in ('started','submitted','completed') then raise exception 'invalid_status'; end if;
  if p_written is not null and length(p_written)>12000 then raise exception 'invalid'; end if;
  insert into public.learning_assignment_progress(assignment_id,user_id,status,score,max_score,written_response,submitted_at)
  values(p_assignment,auth.uid(),p_status,p_score,p_max_score,p_written,case when p_status<>'started' then now() end)
  on conflict(assignment_id,user_id) do update set
    status=case when excluded.status='started' then public.learning_assignment_progress.status else excluded.status end,
    score=coalesce(excluded.score,public.learning_assignment_progress.score),
    max_score=coalesce(excluded.max_score,public.learning_assignment_progress.max_score),
    written_response=coalesce(nullif(excluded.written_response,''),public.learning_assignment_progress.written_response),
    submitted_at=coalesce(excluded.submitted_at,public.learning_assignment_progress.submitted_at),
    feedback=case when excluded.status='started' then public.learning_assignment_progress.feedback else null end;
end; $$;
revoke all on function private.learning_record_progress(uuid,text,text,text,integer,integer,text) from public,anon,authenticated;

create function public.learning_assignment_start(p_assignment uuid)
returns void language plpgsql security definer set search_path='' as $$
declare a public.learning_assignments;
begin
  select * into a from public.learning_assignments where id=p_assignment;
  perform private.learning_record_progress(p_assignment,a.product,a.resource_slug,'started',null,null,null);
end; $$;
revoke all on function public.learning_assignment_start(uuid) from public,anon;
grant execute on function public.learning_assignment_start(uuid) to authenticated;

create function public.learning_review_subject(p_assignment uuid,p_user uuid,p_decision text,p_feedback text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.learning_assignments;
begin
  select * into a from public.learning_assignments where id=p_assignment;
  if auth.uid() is null or not private.owns_class(a.class_id) or a.product='world' then raise exception 'not_allowed'; end if;
  if p_decision not in ('completed','changes_requested') or length(coalesce(p_feedback,''))>4000 then raise exception 'invalid'; end if;
  if not exists(select 1 from public.class_members where class_id=a.class_id and user_id=p_user) then raise exception 'not_allowed'; end if;
  update public.learning_assignment_progress set status=p_decision,feedback=nullif(trim(p_feedback),'')
  where assignment_id=p_assignment and user_id=p_user and status<>'started';
  if not found then raise exception 'not_submitted'; end if;
end; $$;
revoke all on function public.learning_review_subject(uuid,uuid,text,text) from public,anon;
grant execute on function public.learning_review_subject(uuid,uuid,text,text) to authenticated;

-- A small editorial registry; a draft is never exposed as reviewed material.
create table public.learning_content_review (
  id uuid primary key default gen_random_uuid(),
  product text not null check(product in ('world','maths','science','english')),
  kind text not null check(kind in ('resource','question','mission')),
  title text not null check(length(title) between 3 and 160),
  topic text not null check(length(topic) between 2 and 120),
  exam_board text check(length(exam_board)<=100),
  board_verified boolean not null default false,
  body text not null check(length(body) between 10 and 30000),
  answer_explanation text check(length(answer_explanation)<=12000),
  source_url text check(length(source_url)<=500),
  status text not null default 'draft' check(status in ('draft','reviewed','changes_requested')),
  review_notes text check(length(review_notes)<=4000),
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check(not board_verified or exam_board is not null),
  check(status<>'reviewed' or (reviewed_by is not null and reviewed_at is not null)),
  check(kind<>'question' or (answer_explanation is not null and length(answer_explanation)>=3))
);
create index learning_content_review_creator on public.learning_content_review(created_by);
create index learning_content_review_reviewer on public.learning_content_review(reviewed_by);
alter table public.learning_content_review enable row level security;
revoke all on public.learning_content_review from public,anon,authenticated;
grant select,insert,update on public.learning_content_review to authenticated;
create policy "admin content review read" on public.learning_content_review for select to authenticated using(private.is_platform_admin());
create policy "admin content review insert" on public.learning_content_review for insert to authenticated
with check(private.is_platform_admin() and created_by=(select auth.uid()) and status='draft' and reviewed_by is null and reviewed_at is null);
create policy "admin content review update" on public.learning_content_review for update to authenticated
using(private.is_platform_admin()) with check(private.is_platform_admin() and (status<>'reviewed' or reviewed_by=(select auth.uid())));
