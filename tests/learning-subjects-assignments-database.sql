-- Supply test.learning_teacher (active platform admin), test.learning_pupil,
-- test.learning_outsider as for learning-school-database.sql. Rollback only.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.learning_teacher'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.learning_teacher'),true);
do $$
declare c uuid; a uuid;
begin
  if not private.is_platform_admin() then raise exception 'admin_fixture_required'; end if;
  if current_setting('test.learning_teacher')=current_setting('test.learning_pupil') then raise exception 'distinct_fixtures_required'; end if;
  insert into public.classes(owner_id,name,subject,code) values(auth.uid(),'Subject grading fixture','English','S' || upper(substr(md5(random()::text),1,5))) returning id into c;
  insert into public.class_members(class_id,user_id) values(c,current_setting('test.learning_pupil')::uuid);
  a:=public.learning_assignment_create(c,'english','writing-audience','Draft a reading-room proposal',null);
  perform set_config('test.subject_assignment',a::text,true);
end $$;

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.learning_pupil'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.learning_pupil'),true);
do $$
declare a uuid:=current_setting('test.subject_assignment')::uuid; session jsonb; result jsonb; picked integer[]; correct integer[]; response text:='I propose a four-week reading-room trial. We should first agree staff supervision, then collect attendance and pupil feedback before deciding whether it should continue.';
begin
  begin
    perform public.learning_subject_start('maths','percentages','practice',a);
    raise exception 'mismatched_product_accepted';
  exception when others then if sqlerrm not like '%assignment_mismatch%' then raise; end if; end;
  session:=public.learning_subject_start('english','writing-audience','practice',a);
  perform set_config('test.subject_session',session->>'id',true);
  if not exists(select 1 from public.learning_assignment_progress where assignment_id=a and user_id=auth.uid() and status='started' and score is null) then raise exception 'assignment_not_started'; end if;
  select question_indices into picked from public.learning_subject_attempts where id=(session->>'id')::uuid;
  select array_agg(k.answer_keys[i+1] order by ord) into correct from private.learning_subject_keys k cross join lateral unnest(picked) with ordinality x(i,ord) where k.product='english' and k.topic_slug='writing-audience';
  begin
    perform public.learning_subject_submit((session->>'id')::uuid,correct,'');
    raise exception 'missing_written_response_accepted';
  exception when others then if sqlerrm not like '%writing_required%' then raise; end if; end;
  perform public.learning_subject_draft((session->>'id')::uuid,correct,response);
  result:=public.learning_subject_submit((session->>'id')::uuid,correct,response);
  if (result->>'score')::integer<>4 then raise exception 'assigned_grading_failed'; end if;
  if not exists(select 1 from public.learning_assignment_progress where assignment_id=a and user_id=auth.uid() and status='submitted' and score=4 and max_score=4 and written_response=response and submitted_at is not null) then raise exception 'assignment_score_or_writing_not_recorded'; end if;
end $$;
set local role authenticated;
do $$ begin
  begin
    update public.learning_subject_attempts set score=4 where id=current_setting('test.subject_session')::uuid;
    raise exception 'direct_attempt_score_write_accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.learning_assignment_progress set score=4 where assignment_id=current_setting('test.subject_assignment')::uuid;
    raise exception 'direct_assignment_score_write_accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.learning_outsider'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.learning_outsider'),true);
do $$ begin
  begin
    perform public.learning_subject_start('english','writing-audience','practice',current_setting('test.subject_assignment')::uuid);
    raise exception 'outsider_started_assigned_topic';
  exception when others then if sqlerrm not like '%assignment_mismatch%' then raise; end if; end;
end $$;
select jsonb_build_object('assigned_subject_checks_passed',true,'fixtures','rolled back');
rollback;
