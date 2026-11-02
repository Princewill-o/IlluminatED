-- Isolated fixtures using an existing member; nothing survives the rollback.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.subject_quest_user'),'role','authenticated')::text,true);
do $$
declare uid uuid:=auth.uid();keys text[];ev jsonb;sid uuid;attempt jsonb;answers integer[];i integer;
begin
 update public.learner_details set subjects='[{"courseId":"gcse-maths","board":"aqa"}]'::jsonb where user_id=uid;
 delete from public.subject_quest_sessions where user_id=uid;
 delete from public.subject_quest_progress where user_id=uid;
 -- Simulate editorial approval exclusively within this rolled-back fixture.
 update public.subject_quest_catalogue set content=jsonb_set(content,'{draftPractice}','false') where course_id='gcse-maths';
 insert into public.subject_quest_progress(user_id,course_id,topic_id,reviewed_at,passes,last_passed_at)
 select uid,course_id,topic_id,now(),2,now() from public.subject_quest_catalogue where course_id='gcse-maths';
 select array_agg(key order by key) into keys from (select distinct b.key from public.subject_quest_catalogue c join private.study_question_bank b on b.key=any(c.question_keys) where c.course_id='gcse-maths') q;
 for i in 0..2 loop
  insert into public.subject_quest_sessions(user_id,course_id,topic_id,question_keys,created_at,completed_at,result)
  values(uid,'gcse-maths',null,keys[1+i*20:20+i*20],now()-make_interval(days=>i+1)-interval '1 hour',now()-make_interval(days=>i+1),'{"correct":20,"total":20,"score":100}');
 end loop;
 select e into ev from jsonb_array_elements(public.subject_quest_board()->'evidence') e where e->>'courseId'='gcse-maths';
 if not (ev->>'targetAchieved')::boolean or (ev->>'distinctQuestions')::int<>60 then raise exception 'Broad spaced success was not recognised: %',ev;end if;
 -- A later failed daily attempt must replace the high score, not hide behind it.
 insert into public.subject_quest_sessions(user_id,course_id,topic_id,question_keys,created_at,completed_at,result)
 values(uid,'gcse-maths',null,keys[1:20],now()-interval '1 hour',now(),'{"correct":19,"total":20,"score":95}');
 select e into ev from jsonb_array_elements(public.subject_quest_board()->'evidence') e where e->>'courseId'='gcse-maths';
 if (ev->>'targetAchieved')::boolean or (ev->>'qualifyingDays')::int<>2 then raise exception 'Ignored recent lower result';end if;
 delete from public.subject_quest_sessions where user_id=uid and completed_at=now();
 -- Replaying the same small question set on different days is insufficient.
 update public.subject_quest_sessions set question_keys=keys[1:20] where user_id=uid;
 select e into ev from jsonb_array_elements(public.subject_quest_board()->'evidence') e where e->>'courseId'='gcse-maths';
 if (ev->>'targetAchieved')::boolean then raise exception 'Repeated 20-item sample passed';end if;
 -- Draft material must never claim the mastery milestone.
 update public.subject_quest_catalogue set content=jsonb_set(content,'{draftPractice}','true') where course_id='gcse-maths';
 select e into ev from jsonb_array_elements(public.subject_quest_board()->'evidence') e where e->>'courseId'='gcse-maths';
 if not (ev->>'draft')::boolean or (ev->>'targetAchieved')::boolean then raise exception 'Draft bank certified';end if;
 -- Actual submissions store server-marked answers and feed revision suggestions.
 attempt:=public.subject_quest_start('gcse-maths','gcse-maths-percentages');sid:=(attempt->>'id')::uuid;
 select array_agg((b.answer+1)%jsonb_array_length(b.options) order by k.n) into answers
 from public.subject_quest_sessions s,unnest(s.question_keys) with ordinality k(key,n) join private.study_question_bank b on b.key=k.key where s.id=sid;
 update public.subject_quest_sessions set created_at=now()-interval '2 minutes' where id=sid;
 perform public.subject_quest_submit(sid,answers);
 if not exists(select 1 from public.subject_quest_sessions where id=sid and submitted_answers=answers) then raise exception 'Answers were not saved';end if;
 select e into ev from jsonb_array_elements(public.subject_quest_board()->'evidence') e where e->>'courseId'='gcse-maths';
 if not (ev->'weakTopics')?'gcse-maths-percentages' then raise exception 'Missing revision mission';end if;
 update public.learner_details set subjects='[]'::jsonb where user_id=uid;
 if jsonb_array_length(public.subject_quest_board()->'evidence')<>0 then raise exception 'Unselected subject evidence leaked';end if;
 if has_function_privilege('authenticated','private.subject_quest_evidence()','execute') or has_function_privilege('anon','public.subject_quest_board()','execute') then raise exception 'Unsafe grants';end if;
end;$$;
select jsonb_build_object('mastery_checks_passed',true,'fixture_changes','rolled back');
rollback;
