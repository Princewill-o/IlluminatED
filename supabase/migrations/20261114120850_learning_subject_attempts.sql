-- Original focused topic packs; all saved scores and race timing are calculated
-- in Postgres. No client is allowed to insert/update attempts or answer keys.
create table private.learning_subject_keys (
  product text not null check(product in ('maths','science','english')),
  topic_slug text not null,
  answer_keys integer[] not null,
  option_counts integer[] not null,
  requires_written boolean not null default false,
  primary key(product,topic_slug),
  check(cardinality(answer_keys)=cardinality(option_counts) and cardinality(answer_keys) between 1 and 12)
);
revoke all on private.learning_subject_keys from public,anon,authenticated;

create table public.learning_subject_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null,
  topic_slug text not null,
  mode text not null check(mode in ('practice','race')),
  assignment_id uuid references public.learning_assignments(id) on delete set null,
  started_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz,
  score integer,
  max_score integer not null check(max_score between 1 and 12),
  elapsed_seconds integer,
  race_points integer,
  written_response text check(length(written_response)<=12000),
  draft_answers integer[] not null default '{}',
  question_indices integer[] not null,
  foreign key(product,topic_slug) references private.learning_subject_keys(product,topic_slug),
  check(score is null or (score between 0 and max_score)),
  check((submitted_at is null and score is null) or (submitted_at is not null and score is not null)),
  check(mode<>'race' or product='maths')
);
create index learning_subject_attempts_owner on public.learning_subject_attempts(user_id,product,started_at desc);
create index learning_subject_attempts_assignment on public.learning_subject_attempts(assignment_id) where assignment_id is not null;
alter table public.learning_subject_attempts enable row level security;
revoke all on public.learning_subject_attempts from public,anon,authenticated;
grant select on public.learning_subject_attempts to authenticated;
create policy "own subject attempts" on public.learning_subject_attempts for select to authenticated using(user_id=(select auth.uid()));

create function private.learning_subject_start(p_product text,p_slug text,p_mode text,p_assignment uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare k private.learning_subject_keys; a public.learning_subject_attempts; chosen integer[]; previous integer[];
begin
  if auth.uid() is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_product||p_slug||p_mode||coalesce(p_assignment::text,''),0));
  if p_mode not in ('practice','race') or (p_mode='race' and p_product<>'maths') then raise exception 'invalid'; end if;
  select * into k from private.learning_subject_keys where product=p_product and topic_slug=p_slug;
  if k.product is null then raise exception 'invalid'; end if;
  perform private.learning_record_progress(p_assignment,p_product,p_slug,'started',null,null,null);
  if p_mode='practice' then
    select * into a from public.learning_subject_attempts where user_id=auth.uid() and product=p_product and topic_slug=p_slug and mode=p_mode and assignment_id is not distinct from p_assignment and submitted_at is null and started_at>now()-interval '7 days' order by started_at desc limit 1;
    if a.id is not null then return to_jsonb(a); end if;
  end if;
  if (select count(*) from public.learning_subject_attempts where user_id=auth.uid() and started_at>now()-interval '1 hour')>=60 then raise exception 'rate_limit'; end if;
  select question_indices into previous from public.learning_subject_attempts where user_id=auth.uid() and product=p_product and topic_slug=p_slug and mode=p_mode and submitted_at is not null order by submitted_at desc limit 1;
  select array_agg(idx) into chosen from (select i-1 as idx from generate_series(1,cardinality(k.answer_keys)) i order by (i-1=any(coalesce(previous,'{}'::integer[]))),random() limit case when p_mode='race' then cardinality(k.answer_keys) else least(4,cardinality(k.answer_keys)) end) selected;
  insert into public.learning_subject_attempts(user_id,product,topic_slug,mode,assignment_id,max_score,draft_answers,question_indices)
  values(auth.uid(),p_product,p_slug,p_mode,p_assignment,cardinality(chosen),array_fill(-1,array[cardinality(chosen)]),chosen) returning * into a;
  -- Bring forward the learner's previous written response when revising.
  update public.learning_subject_attempts set written_response=(select written_response from public.learning_subject_attempts where user_id=auth.uid() and product=p_product and topic_slug=p_slug and id<>a.id and written_response is not null order by updated_at desc limit 1) where id=a.id returning * into a;
  return to_jsonb(a);
end; $$;
revoke all on function private.learning_subject_start(text,text,text,uuid) from public,anon;
grant execute on function private.learning_subject_start(text,text,text,uuid) to authenticated;
create function public.learning_subject_start(p_product text,p_slug text,p_mode text default 'practice',p_assignment uuid default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.learning_subject_start(p_product,p_slug,p_mode,p_assignment); $$;
revoke all on function public.learning_subject_start(text,text,text,uuid) from public,anon;
grant execute on function public.learning_subject_start(text,text,text,uuid) to authenticated;

create function private.learning_subject_draft(p_session uuid,p_answers integer[],p_written text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.learning_subject_attempts; k private.learning_subject_keys; i integer;
begin
  if auth.uid() is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into a from public.learning_subject_attempts where id=p_session and user_id=auth.uid() for update;
  if a.id is null or a.submitted_at is not null or a.started_at<now()-interval '7 days' then raise exception 'expired'; end if;
  select * into k from private.learning_subject_keys where product=a.product and topic_slug=a.topic_slug;
  if p_answers is null or cardinality(p_answers)<>a.max_score or p_written is null or length(p_written)>12000 then raise exception 'invalid'; end if;
  for i in 1..a.max_score loop
    if p_answers[i] is null or p_answers[i]<-1 or p_answers[i]>=k.option_counts[a.question_indices[i]+1] then raise exception 'invalid'; end if;
  end loop;
  update public.learning_subject_attempts set draft_answers=p_answers,written_response=nullif(p_written,''),updated_at=clock_timestamp() where id=a.id;
end; $$;
revoke all on function private.learning_subject_draft(uuid,integer[],text) from public,anon;
grant execute on function private.learning_subject_draft(uuid,integer[],text) to authenticated;
create function public.learning_subject_draft(p_session uuid,p_answers integer[],p_written text)
returns void language sql security invoker set search_path='' as $$ select private.learning_subject_draft(p_session,p_answers,p_written); $$;
revoke all on function public.learning_subject_draft(uuid,integer[],text) from public,anon;
grant execute on function public.learning_subject_draft(uuid,integer[],text) to authenticated;

create function private.learning_subject_submit(p_session uuid,p_answers integer[],p_written text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.learning_subject_attempts; k private.learning_subject_keys; i integer; marks integer:=0; elapsed integer;
begin
  if auth.uid() is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into a from public.learning_subject_attempts where id=p_session and user_id=auth.uid() for update;
  if a.id is null then raise exception 'not_allowed'; end if;
  if a.submitted_at is not null then return to_jsonb(a); end if;
  if a.started_at<now()-interval '7 days' then raise exception 'expired'; end if;
  select * into k from private.learning_subject_keys where product=a.product and topic_slug=a.topic_slug;
  if p_answers is null or cardinality(p_answers)<>a.max_score or p_written is null or length(p_written)>12000 then raise exception 'invalid'; end if;
  if a.assignment_id is not null and k.requires_written and length(trim(p_written))<20 then raise exception 'writing_required'; end if;
  for i in 1..a.max_score loop
    if p_answers[i] is null or p_answers[i]<0 or p_answers[i]>=k.option_counts[a.question_indices[i]+1] then raise exception 'invalid'; end if;
    if p_answers[i]=k.answer_keys[a.question_indices[i]+1] then marks:=marks+1; end if;
  end loop;
  elapsed:=greatest(1,floor(extract(epoch from clock_timestamp()-a.started_at))::integer);
  update public.learning_subject_attempts set score=marks,elapsed_seconds=elapsed,
    race_points=case when mode='race' then round(marks::numeric/max_score*100)::integer*1000+greatest(0,999-elapsed) end,
    submitted_at=clock_timestamp(),updated_at=clock_timestamp(),draft_answers=p_answers,written_response=nullif(p_written,'') where id=a.id returning * into a;
  perform private.learning_record_progress(a.assignment_id,a.product,a.topic_slug,'submitted',marks,a.max_score,p_written);
  return to_jsonb(a);
end; $$;
revoke all on function private.learning_subject_submit(uuid,integer[],text) from public,anon;
grant execute on function private.learning_subject_submit(uuid,integer[],text) to authenticated;
create function public.learning_subject_submit(p_session uuid,p_answers integer[],p_written text default '')
returns jsonb language sql security invoker set search_path='' as $$ select private.learning_subject_submit(p_session,p_answers,p_written); $$;
revoke all on function public.learning_subject_submit(uuid,integer[],text) from public,anon;
grant execute on function public.learning_subject_submit(uuid,integer[],text) to authenticated;

-- Seed original question bank keys (public explanations live in versioned source).
insert into private.learning_subject_keys(product,topic_slug,answer_keys,option_counts,requires_written) values
('maths','percentages',array[1,2,2,1,1,1,1,0],array[4,4,4,4,4,4,4,4],false),
('maths','ratio-proportion',array[0,3,2,1,2,1,2,2],array[4,4,4,4,4,4,4,4],false),
('maths','profit-financial-maths',array[0,1,1,1,2,2,2,1],array[4,4,4,4,4,4,4,4],false),
('science','cells-microscopy',array[1,2,2,1,2,3,0,1],array[4,4,4,4,4,4,4,4],false),
('science','particles-materials',array[1,2,2,1,2,2,1,2],array[4,4,4,4,4,4,4,4],false),
('science','electricity-circuits',array[2,2,1,2,2,1,1,2],array[4,4,4,4,4,4,4,4],false),
('english','reading-evidence',array[1,2,0,2,1,2,1,2],array[4,4,4,4,4,4,4,4],true),
('english','language-analysis',array[0,2,1,2,1,0,1,2],array[4,4,4,4,4,4,4,4],true),
('english','writing-audience',array[1,2,2,1,1,0,2,1],array[4,4,4,4,4,4,4,4],true),
('science','inspection-evidence',array[1,2,0,2],array[4,4,4,4],false),
('english','condition-report',array[1,1,2,0],array[4,4,4,4],true);
