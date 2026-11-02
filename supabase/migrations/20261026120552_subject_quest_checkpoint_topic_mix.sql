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
  -- Take one question from each topic first, then fill the paper with a random mix.
  with pool as(select b.key,min(c.topic_id) as topic_id from private.study_question_bank b join public.subject_quest_catalogue c on b.key=any(c.question_keys) where c.course_id=p_course group by b.key),
  ranked as(select b.key,row_number() over(partition by b.topic_id order by random()) as topic_order from pool b)
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

