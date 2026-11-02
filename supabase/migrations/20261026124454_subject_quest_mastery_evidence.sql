begin;
alter table public.subject_quest_sessions add column submitted_answers integer[];
-- Private helper: exposed only through the existing, authorised board function.
create function private.subject_quest_evidence() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();output jsonb;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed';end if;
 with courses as(select c.course_id,count(*) as topics,bool_or(coalesce((c.content->>'draftPractice')::boolean,false)) as draft
   from public.subject_quest_catalogue c where private.selected_study_subject(c.course_id) group by c.course_id),
 pools as(select c.course_id,count(distinct b.key)::int as available from public.subject_quest_catalogue c join private.study_question_bank b on b.key=any(c.question_keys) where private.selected_study_subject(c.course_id) group by c.course_id),
 daily as(select s.*,row_number() over(partition by s.course_id,(s.completed_at at time zone 'Europe/London')::date order by s.completed_at desc,s.id) as daily_order
   from public.subject_quest_sessions s where s.user_id=uid and s.topic_id is null and s.completed_at>now()-interval '14 days' and private.selected_study_subject(s.course_id)),
 ranked as(select d.*,row_number() over(partition by d.course_id order by d.completed_at desc,d.id) as attempt_order from daily d where daily_order=1),
 last_three as(select * from ranked where attempt_order<=3),
 qualifying as(select * from last_three where cardinality(question_keys)>=10 and (result->>'correct')::int*100 >= 98*(result->>'total')::int),
 totals as(select course_id,count(*)::int as days from qualifying group by course_id),
 samples as(select q.course_id,count(distinct k.key)::int as distinct_questions from qualifying q cross join lateral unnest(q.question_keys) k(key) group by q.course_id),
 answered as(select s.course_id,k.key,s.submitted_answers[k.n] as chosen,b.answer,row_number() over(partition by s.course_id,k.key order by s.completed_at desc,s.id) as latest
   from public.subject_quest_sessions s cross join lateral unnest(s.question_keys) with ordinality k(key,n) join private.study_question_bank b on b.key=k.key
   where s.user_id=uid and s.completed_at>now()-interval '14 days' and s.submitted_answers is not null and private.selected_study_subject(s.course_id)),
 weak as(select a.course_id,jsonb_agg(distinct c.topic_id) as topic_ids from answered a join public.subject_quest_catalogue c on c.course_id=a.course_id and a.key=any(c.question_keys) where a.latest=1 and a.chosen<>a.answer group by a.course_id),
 state as(select c.course_id,bool_and(p.reviewed_at is not null and coalesce(p.passes,0)>=2 and coalesce(p.last_passed_at>now()-interval '14 days',false)) as complete
   from public.subject_quest_catalogue c left join public.subject_quest_progress p on p.course_id=c.course_id and p.topic_id=c.topic_id and p.user_id=uid where private.selected_study_subject(c.course_id) group by c.course_id)
 select coalesce(jsonb_agg(jsonb_build_object('courseId',c.course_id,'availableQuestions',coalesce(p.available,0),'qualifyingDays',coalesce(t.days,0),'distinctQuestions',coalesce(s.distinct_questions,0),'draft',c.draft,'weakTopics',coalesce(w.topic_ids,'[]'::jsonb),
 'targetAchieved',coalesce(t.days=3 and s.distinct_questions>=40 and p.available>=40 and st.complete and not c.draft,false))),'[]'::jsonb) into output
 from courses c left join pools p using(course_id) left join totals t using(course_id) left join samples s using(course_id) left join weak w using(course_id) left join state st using(course_id);
 return output;
end;$$;
revoke all on function private.subject_quest_evidence() from public,anon,authenticated;
create or replace function private.subject_quest_board() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed';end if;
 return jsonb_build_object('evidence',private.subject_quest_evidence(),'quests',coalesce((select jsonb_agg(jsonb_build_object(
   'courseId',c.course_id,'topicId',c.topic_id,'courseTitle',c.course_title,'title',c.title,'questionCount',cardinality(c.question_keys),
   'reviewed',p.reviewed_at is not null,'passes',coalesce(p.passes,0),'bestScore',coalesce(p.best_score,0),
   'recent',p.last_passed_at>now()-interval '14 days','active',s.course_id=c.course_id and s.topic_id=c.topic_id
 ) order by c.course_title,c.title) from public.subject_quest_catalogue c
 left join public.subject_quest_progress p on p.user_id=uid and p.course_id=c.course_id and p.topic_id=c.topic_id
 left join public.subject_quest_selection s on s.user_id=uid where private.selected_study_subject(c.course_id)),'[]'::jsonb),
 'exams',coalesce((select jsonb_agg(jsonb_build_object('courseId',e.course_id,'bestScore',e.best_score,'passed',e.last_passed_at>now()-interval '14 days')) from public.subject_exam_progress e where e.user_id=uid and private.selected_study_subject(e.course_id)),'[]'::jsonb));
end;$$;


-- Balance practice checkpoints across available topics before adding extra questions.
create or replace function private.subject_quest_start(p_course text,p_topic text default null) returns jsonb
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
  -- Prefer unseen items within each topic, preserving topic balance.
  with seen as(select k.key,max(s.completed_at) as last_seen from public.subject_quest_sessions s cross join lateral unnest(s.question_keys) k(key) where s.user_id=uid and s.completed_at>now()-interval '14 days' group by k.key),
  pool as(select b.key,min(c.topic_id) as topic_id from private.study_question_bank b join public.subject_quest_catalogue c on b.key=any(c.question_keys) where c.course_id=p_course group by b.key),
  ranked as(select b.key,seen.last_seen,row_number() over(partition by b.topic_id order by seen.last_seen nulls first,random()) as topic_order from pool b left join seen on seen.key=b.key)
  select array_agg(key) into keys from(select key from ranked order by topic_order,last_seen nulls first,random() limit 20)x;
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


create or replace function private.subject_quest_submit(p_session uuid,p_answers integer[]) returns jsonb
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
 update public.subject_quest_sessions set completed_at=now(),result=output,submitted_answers=p_answers where id=s.id;
 return output;
end;$$;


commit;
