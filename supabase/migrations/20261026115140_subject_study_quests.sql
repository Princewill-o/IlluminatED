begin;
create table public.subject_quest_catalogue (
  course_id text not null, topic_id text not null, course_title text not null, title text not null,
  content jsonb not null, question_keys text[] not null, version text not null,
  primary key(course_id,topic_id)
);
create table public.subject_quest_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null, topic_id text not null,
  reviewed_at timestamptz, passes integer not null default 0 check(passes between 0 and 2),
  best_score integer not null default 0 check(best_score between 0 and 100),
  last_passed_at timestamptz, rewarded_at timestamptz,
  primary key(user_id,course_id,topic_id),
  foreign key(course_id,topic_id) references public.subject_quest_catalogue(course_id,topic_id)
);
create index subject_quest_progress_topic on public.subject_quest_progress(course_id,topic_id);
create table public.subject_quest_selection (
  user_id uuid primary key references auth.users(id) on delete cascade,
  course_id text not null, topic_id text not null, updated_at timestamptz not null default now(),
  foreign key(course_id,topic_id) references public.subject_quest_catalogue(course_id,topic_id)
);
create index subject_quest_selection_topic on public.subject_quest_selection(course_id,topic_id);
create table public.subject_exam_progress (
  user_id uuid not null references auth.users(id) on delete cascade, course_id text not null,
  best_score integer not null default 0, last_passed_at timestamptz, rewarded_at timestamptz,
  primary key(user_id,course_id)
);
create table public.subject_quest_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null, topic_id text, question_keys text[] not null check(cardinality(question_keys) between 1 and 20),
  created_at timestamptz not null default now(), completed_at timestamptz, result jsonb
);
create index subject_quest_session_owner on public.subject_quest_sessions(user_id,created_at desc);
alter table public.subject_quest_catalogue enable row level security;
alter table public.subject_quest_progress enable row level security;
alter table public.subject_quest_selection enable row level security;
alter table public.subject_exam_progress enable row level security;
alter table public.subject_quest_sessions enable row level security;
revoke all on public.subject_quest_catalogue,public.subject_quest_progress,public.subject_quest_selection,public.subject_exam_progress,public.subject_quest_sessions from public,anon,authenticated;
grant select on public.subject_quest_catalogue to authenticated;
grant select on public.subject_quest_progress,public.subject_quest_selection,public.subject_exam_progress,public.subject_quest_sessions to authenticated;
grant all on public.subject_quest_catalogue,public.subject_quest_progress,public.subject_quest_selection,public.subject_exam_progress,public.subject_quest_sessions to service_role;
create policy "quest catalogue readable" on public.subject_quest_catalogue for select to authenticated using(true);
create policy "own subject quests" on public.subject_quest_progress for select to authenticated using(user_id=(select auth.uid()));
create policy "own selected quest" on public.subject_quest_selection for select to authenticated using(user_id=(select auth.uid()));
create policy "own exam practice" on public.subject_exam_progress for select to authenticated using(user_id=(select auth.uid()));
create policy "own quest attempts" on public.subject_quest_sessions for select to authenticated using(user_id=(select auth.uid()));

create function private.selected_study_subject(p_course text) returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.learner_details l,jsonb_array_elements(l.subjects) s where l.user_id=auth.uid() and s->>'courseId'=p_course);
$$;
revoke all on function private.selected_study_subject(text) from public,anon,authenticated;

create function private.subject_quest_board() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed';end if;
 return jsonb_build_object('quests',coalesce((select jsonb_agg(jsonb_build_object(
   'courseId',c.course_id,'topicId',c.topic_id,'courseTitle',c.course_title,'title',c.title,'questionCount',cardinality(c.question_keys),
   'reviewed',p.reviewed_at is not null,'passes',coalesce(p.passes,0),'bestScore',coalesce(p.best_score,0),
   'recent',p.last_passed_at>now()-interval '14 days','active',s.course_id=c.course_id and s.topic_id=c.topic_id
 ) order by c.course_title,c.title) from public.subject_quest_catalogue c
 left join public.subject_quest_progress p on p.user_id=uid and p.course_id=c.course_id and p.topic_id=c.topic_id
 left join public.subject_quest_selection s on s.user_id=uid where private.selected_study_subject(c.course_id)),'[]'::jsonb),
 'exams',coalesce((select jsonb_agg(jsonb_build_object('courseId',e.course_id,'bestScore',e.best_score,'passed',e.last_passed_at>now()-interval '14 days')) from public.subject_exam_progress e where e.user_id=uid and private.selected_study_subject(e.course_id)),'[]'::jsonb));
end;$$;

create function private.subject_quest_choose(p_course text,p_topic text,p_review boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();lesson jsonb;
begin
 if uid is null or not private.is_active_member() or not private.selected_study_subject(p_course) then raise exception 'subject_not_selected';end if;
 select content into lesson from public.subject_quest_catalogue where course_id=p_course and topic_id=p_topic;
 if lesson is null then raise exception 'unknown_quest';end if;
 insert into public.subject_quest_selection(user_id,course_id,topic_id) values(uid,p_course,p_topic)
 on conflict(user_id) do update set course_id=excluded.course_id,topic_id=excluded.topic_id,updated_at=now();
 if p_review then
  insert into public.subject_quest_progress(user_id,course_id,topic_id,reviewed_at) values(uid,p_course,p_topic,now())
  on conflict(user_id,course_id,topic_id) do update set reviewed_at=coalesce(subject_quest_progress.reviewed_at,now());
 end if;
 return lesson;
end;$$;

create function private.subject_quest_start(p_course text,p_topic text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();keys text[];sid uuid;questions jsonb;
begin
 if uid is null or not private.is_active_member() or not private.selected_study_subject(p_course) then raise exception 'subject_not_selected';end if;
 insert into public.player_stats(user_id) values(uid) on conflict do nothing;
 perform 1 from public.player_stats where user_id=uid for update;
 if (select count(*) from public.subject_quest_sessions where user_id=uid and created_at>now()-interval '1 hour')>=60 then raise exception 'rate_limited';end if;
 if p_topic is null then
  if not exists(select 1 from public.subject_quest_catalogue where course_id=p_course) or exists(
   select 1 from public.subject_quest_catalogue c left join public.subject_quest_progress p on p.user_id=uid and p.course_id=c.course_id and p.topic_id=c.topic_id
   where c.course_id=p_course and (cardinality(c.question_keys)=0 or coalesce(p.passes,0)<2 or p.reviewed_at is null or p.last_passed_at is null or p.last_passed_at<=now()-interval '14 days')
  ) then raise exception 'quests_incomplete';end if;
  -- Take one question from each topic first, then fill the paper with a random mix.
  with pool as(select distinct b.key,b.course_id from private.study_question_bank b join public.subject_quest_catalogue c on b.key=any(c.question_keys) where c.course_id=p_course),
  ranked as(select b.key,row_number() over(partition by split_part(b.key,':',1) order by random()) as topic_order from pool b)
  select array_agg(key) into keys from(select key from ranked order by topic_order,random() limit 20)x;
 else
  if not exists(select 1 from public.subject_quest_progress where user_id=uid and course_id=p_course and topic_id=p_topic and reviewed_at is not null) then raise exception 'review_first';end if;
  select array_agg(key) into keys from(select b.key from private.study_question_bank b join public.subject_quest_catalogue c on b.key=any(c.question_keys) where c.course_id=p_course and c.topic_id=p_topic order by random() limit 5)x;
 end if;
 if coalesce(cardinality(keys),0)=0 then raise exception 'no_questions';end if;
 insert into public.subject_quest_sessions(user_id,course_id,topic_id,question_keys) values(uid,p_course,p_topic,keys) returning id into sid;
 select jsonb_agg(jsonb_build_object('key',b.key,'prompt',b.prompt,'options',b.options) order by k.n) into questions
 from unnest(keys) with ordinality k(key,n) join private.study_question_bank b on b.key=k.key;
 return jsonb_build_object('id',sid,'courseId',p_course,'topicId',p_topic,'questions',questions);
end;$$;

create function private.subject_quest_submit(p_session uuid,p_answers integer[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();s public.subject_quest_sessions%rowtype;p public.subject_quest_progress%rowtype;
 n integer;q_total integer;score integer;review jsonb;output jsonb;xp_gain integer:=0;clout_gain integer:=0;first_reward boolean:=false;new_passes integer:=0;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed';end if;
 -- Match the start lock order; retries and parallel completions cannot double-pay.
 perform 1 from public.player_stats where user_id=uid for update;
 select * into s from public.subject_quest_sessions where id=p_session and user_id=uid for update;
 if not found or not private.selected_study_subject(s.course_id) then raise exception 'session_unavailable';end if;
 if s.completed_at is not null then return s.result;end if;
 q_total:=cardinality(s.question_keys);
 if s.created_at<now()-interval '24 hours' then raise exception 'session_unavailable';end if;
 if s.created_at>now()-make_interval(secs=>q_total*2) then raise exception 'take_your_time';end if;
 if p_answers is null or cardinality(p_answers)<>q_total or array_ndims(p_answers)<>1 or array_lower(p_answers,1)<>1 or exists(
  select 1 from unnest(s.question_keys) with ordinality k(key,i) join private.study_question_bank b on b.key=k.key
  where p_answers[k.i] is null or p_answers[k.i]<0 or p_answers[k.i]>=jsonb_array_length(b.options)
 ) then raise exception 'invalid_answers';end if;
 select count(*) filter(where b.answer=p_answers[k.i]),jsonb_agg(jsonb_build_object('answer',b.answer,'explain',b.explain) order by k.i)
 into n,review from unnest(s.question_keys) with ordinality k(key,i) join private.study_question_bank b on b.key=k.key;
 score:=round(n*100.0/q_total);
 if s.topic_id is not null then
  insert into public.subject_quest_progress(user_id,course_id,topic_id) values(uid,s.course_id,s.topic_id) on conflict do nothing;
  select * into p from public.subject_quest_progress where user_id=uid and course_id=s.course_id and topic_id=s.topic_id for update;
  new_passes:=least(2,p.passes+case when score>=80 then 1 else 0 end);
  first_reward:=new_passes=2 and p.reviewed_at is not null and p.rewarded_at is null;
  if first_reward then xp_gain:=40;clout_gain:=20;end if;
  update public.subject_quest_progress set passes=new_passes,best_score=greatest(best_score,score),
   last_passed_at=case when score>=80 then now() else last_passed_at end,rewarded_at=case when first_reward then now() else rewarded_at end
   where user_id=uid and course_id=s.course_id and topic_id=s.topic_id;
 else
  insert into public.subject_exam_progress(user_id,course_id) values(uid,s.course_id) on conflict do nothing;
  if score>=80 then
   update public.subject_exam_progress set best_score=greatest(best_score,score),last_passed_at=now(),rewarded_at=coalesce(rewarded_at,now())
    where user_id=uid and course_id=s.course_id and rewarded_at is null;
   first_reward:=found;if first_reward then xp_gain:=100;clout_gain:=50;end if;
  end if;
  update public.subject_exam_progress set best_score=greatest(best_score,score),last_passed_at=case when score>=80 then now() else last_passed_at end where user_id=uid and course_id=s.course_id;
 end if;
 update public.player_stats set xp=xp+xp_gain,clout=clout+clout_gain,
  level=greatest(1,floor((1+sqrt(1+0.08*(xp+xp_gain)))/2)::integer),updated_at=now() where user_id=uid;
 insert into public.study_progress(user_id,sessions,correct,total,courses,last_studied_at) values(uid,1,n,q_total,array[s.course_id],now())
 on conflict(user_id) do update set sessions=study_progress.sessions+1,correct=study_progress.correct+n,total=study_progress.total+q_total,
  courses=case when s.course_id=any(study_progress.courses) then study_progress.courses else array_append(study_progress.courses,s.course_id) end,last_studied_at=now();
 output:=jsonb_build_object('correct',n,'total',q_total,'score',score,'passed',score>=80,'passes',new_passes,'xp',xp_gain,'clout',clout_gain,'answers',review);
 update public.subject_quest_sessions set completed_at=now(),result=output where id=s.id;
 return output;
end;$$;

create function public.subject_quest_board() returns jsonb language sql security invoker set search_path='' as $$select private.subject_quest_board();$$;
create function public.subject_quest_choose(p_course text,p_topic text,p_review boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.subject_quest_choose(p_course,p_topic,p_review);$$;
create function public.subject_quest_start(p_course text,p_topic text default null) returns jsonb language sql security invoker set search_path='' as $$select private.subject_quest_start(p_course,p_topic);$$;
create function public.subject_quest_submit(p_session uuid,p_answers integer[]) returns jsonb language sql security invoker set search_path='' as $$select private.subject_quest_submit(p_session,p_answers);$$;
revoke all on function private.subject_quest_board(),private.subject_quest_choose(text,text,boolean),private.subject_quest_start(text,text),private.subject_quest_submit(uuid,integer[]),public.subject_quest_board(),public.subject_quest_choose(text,text,boolean),public.subject_quest_start(text,text),public.subject_quest_submit(uuid,integer[]) from public,anon,authenticated;
grant execute on function private.subject_quest_board(),private.subject_quest_choose(text,text,boolean),private.subject_quest_start(text,text),private.subject_quest_submit(uuid,integer[]),public.subject_quest_board(),public.subject_quest_choose(text,text,boolean),public.subject_quest_start(text,text),public.subject_quest_submit(uuid,integer[]) to authenticated;
commit;
