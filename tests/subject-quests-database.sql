-- Run with a real existing member's UUID in test.subject_quest_user. Every change rolls back.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.subject_quest_user'),'role','authenticated')::text,true);
do $$
declare uid uuid:=auth.uid();topic text;board jsonb;session jsonb;result jsonb;sid uuid;answers integer[];before_clout integer;after_clout integer;i integer;
begin
 if uid is null then raise exception 'Supply test.subject_quest_user';end if;
 update public.learner_details set subjects='[{"courseId":"gcse-maths","board":"aqa"}]'::jsonb where user_id=uid;
 delete from public.subject_quest_sessions where user_id=uid;
 delete from public.subject_quest_progress where user_id=uid;
 delete from public.subject_exam_progress where user_id=uid;
 board:=public.subject_quest_board();
 if jsonb_array_length(board->'quests')<2 then raise exception 'Missing maths quests';end if;
 if exists(select 1 from jsonb_array_elements(board->'quests') q where q->>'courseId'<>'gcse-maths') then raise exception 'Leaked unselected subject';end if;
 select topic_id into topic from public.subject_quest_catalogue where course_id='gcse-maths' and topic_id='gcse-maths-percentages';
 begin perform public.subject_quest_choose('gcse-chemistry',topic,false);raise exception 'selection_bypass';exception when others then if sqlerrm not like '%subject_not_selected%' then raise;end if;end;
 begin perform public.subject_quest_start('gcse-maths',topic);raise exception 'review_bypass';exception when others then if sqlerrm not like '%review_first%' then raise;end if;end;
 begin perform public.subject_quest_start('gcse-maths',null);raise exception 'exam_bypass';exception when others then if sqlerrm not like '%quests_incomplete%' then raise;end if;end;
 perform public.subject_quest_choose('gcse-maths',topic,true);
 select clout into before_clout from public.player_stats where user_id=uid;
 for i in 1..2 loop
  session:=public.subject_quest_start('gcse-maths',topic);sid:=(session->>'id')::uuid;
  if (session->'questions'->0)?'answer' then raise exception 'Answers leaked before submission';end if;
  select array_agg(b.answer order by k.n) into answers from public.subject_quest_sessions s,unnest(s.question_keys) with ordinality k(key,n) join private.study_question_bank b on b.key=k.key where s.id=sid;
  if i=1 then
   begin perform public.subject_quest_submit(sid,answers);raise exception 'speed_bypass';exception when others then if sqlerrm not like '%take_your_time%' then raise;end if;end;
  end if;
  update public.subject_quest_sessions set created_at=now()-interval '1 minute' where id=sid;
  result:=public.subject_quest_submit(sid,answers);
  if (result->>'score')::int<>100 or (result->>'passes')::int<>i then raise exception 'Incorrect quest scoring';end if;
  if (result->>'clout')::int<>(case when i=2 then 20 else 0 end) then raise exception 'Incorrect first-completion reward';end if;
  perform public.subject_quest_submit(sid,answers);
 end loop;
 select clout into after_clout from public.player_stats where user_id=uid;
 if after_clout-before_clout<>20 then raise exception 'Duplicate reward';end if;
 -- Remaining topic prerequisites are supplied as a fixture, not as a learner action.
 insert into public.subject_quest_progress(user_id,course_id,topic_id,reviewed_at,passes,last_passed_at)
 select uid,course_id,topic_id,now(),2,now() from public.subject_quest_catalogue where course_id='gcse-maths'
 on conflict(user_id,course_id,topic_id) do update set reviewed_at=now(),passes=2,last_passed_at=now();
 update public.subject_quest_progress set last_passed_at=now()-interval '15 days' where user_id=uid and course_id='gcse-maths' and topic_id=topic;
 begin perform public.subject_quest_start('gcse-maths',null);raise exception 'stale_evidence_bypass';exception when others then if sqlerrm not like '%quests_incomplete%' then raise;end if;end;
 update public.subject_quest_progress set last_passed_at=now() where user_id=uid and course_id='gcse-maths';
 session:=public.subject_quest_start('gcse-maths',null);sid:=(session->>'id')::uuid;
 if jsonb_array_length(session->'questions')>20 then raise exception 'Exam too large';end if;
 if (select count(distinct c.topic_id) from public.subject_quest_sessions s,unnest(s.question_keys)k join public.subject_quest_catalogue c on k=any(c.question_keys) where s.id=sid and c.course_id='gcse-maths') < (select count(*) from public.subject_quest_catalogue where course_id='gcse-maths') then raise exception 'Checkpoint omitted a topic';end if;
 select array_agg(b.answer order by k.n) into answers from public.subject_quest_sessions s,unnest(s.question_keys) with ordinality k(key,n) join private.study_question_bank b on b.key=k.key where s.id=sid;
 update public.subject_quest_sessions set created_at=now()-interval '2 minutes' where id=sid;
 result:=public.subject_quest_submit(sid,answers);
 if (result->>'clout')::int<>50 or (result->>'score')::int<>100 then raise exception 'Incorrect checkpoint reward';end if;
 perform public.subject_quest_submit(sid,answers);
 select clout into after_clout from public.player_stats where user_id=uid;
 if after_clout-before_clout<>70 then raise exception 'Duplicate exam reward';end if;
 session:=public.subject_quest_start('gcse-maths',topic);sid:=(session->>'id')::uuid;
 update public.learner_details set subjects='[]'::jsonb where user_id=uid;
 begin perform public.subject_quest_submit(sid,answers);raise exception 'removed_subject_bypass';exception when others then if sqlerrm not like '%session_unavailable%' then raise;end if;end;
 if has_table_privilege('authenticated','public.subject_quest_progress','update') or has_table_privilege('anon','public.subject_quest_sessions','select') then raise exception 'Unsafe quest grants';end if;
end;$$;
select jsonb_build_object('subject_quest_checks_passed',true,'all_fixture_changes','rolled back after this result');
rollback;
