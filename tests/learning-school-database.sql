-- Supply existing active account UUIDs in test.learning_teacher (platform admin),
-- test.learning_pupil and test.learning_outsider. Everything rolls back.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.learning_teacher'),'role','authenticated')::text,true);
do $$
declare c uuid; a uuid; u uuid:=current_setting('test.learning_pupil')::uuid;
begin
  if not private.is_platform_admin() then raise exception 'teacher_fixture_must_be_platform_admin'; end if;
  if u=auth.uid() or u=current_setting('test.learning_outsider')::uuid or auth.uid()=current_setting('test.learning_outsider')::uuid then raise exception 'three_distinct_fixtures_required'; end if;
  insert into public.classes(owner_id,name,subject,code) values(auth.uid(),'Learning security fixture','Cross product','TST' || upper(substr(md5(random()::text),1,3))) returning id into c;
  insert into public.class_members(class_id,user_id) values(c,u);
  a:=public.learning_assignment_create(c,'maths','percentages','Percentage fixture',null);
  perform set_config('test.learning_assignment',a::text,true);
  perform set_config('test.learning_class',c::text,true);
  begin
    perform public.learning_assignment_create(c,'maths','tech-repair-trainee','Wrong product',null);
    raise exception 'cross_product_resource_allowed';
  exception when others then if sqlerrm not like '%invalid_resource%' then raise; end if; end;
  if has_table_privilege('authenticated','public.learning_assignment_progress','insert') or
     has_table_privilege('authenticated','public.learning_assignment_progress','update') or
     has_table_privilege('anon','public.learning_assignments','select') or
     has_function_privilege('authenticated','private.learning_record_progress(uuid,text,text,text,integer,integer,text)','execute') then
    raise exception 'unsafe_grants';
  end if;
end; $$;

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.learning_pupil'),'role','authenticated')::text,true);
do $$
declare a uuid:=current_setting('test.learning_assignment')::uuid;
begin
  perform public.learning_assignment_start(a);
  perform private.learning_record_progress(a,'maths','percentages','submitted',4,6,'A written explanation saved with this attempt.');
  perform public.learning_assignment_start(a);
  if not exists(select 1 from public.learning_assignment_progress where assignment_id=a and user_id=auth.uid() and status='submitted' and score=4 and max_score=6 and written_response is not null) then raise exception 'start_reset_submission'; end if;
  perform private.learning_record_progress(a,'maths','percentages','submitted',5,6,null);
  if not exists(select 1 from public.learning_assignment_progress where assignment_id=a and user_id=auth.uid() and score=5 and written_response is not null) then raise exception 'retry_lost_written_work'; end if;
  begin perform private.learning_record_progress(a,'english','percentages','submitted',1,1,null); raise exception 'product_mismatch_allowed'; exception when others then if sqlerrm not like '%assignment_mismatch%' then raise; end if; end;
  begin perform public.learning_review_subject(a,auth.uid(),'completed','Self approval'); raise exception 'self_review_allowed'; exception when others then if sqlerrm not like '%not_allowed%' then raise; end if; end;
end; $$;
set local role authenticated;
do $$ begin
  if (select count(*) from public.learning_assignments where id=current_setting('test.learning_assignment')::uuid)<>1 then raise exception 'pupil_cannot_read_assignment'; end if;
  if (select count(*) from public.learning_assignment_progress where assignment_id=current_setting('test.learning_assignment')::uuid)<>1 then raise exception 'pupil_cannot_read_own_progress'; end if;
end; $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.learning_outsider'),'role','authenticated')::text,true);
do $$ begin
  begin perform public.learning_assignment_start(current_setting('test.learning_assignment')::uuid); raise exception 'outsider_started_assignment'; exception when others then if sqlerrm not like '%assignment_mismatch%' then raise; end if; end;
end; $$;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.learning_assignments where id=current_setting('test.learning_assignment')::uuid) or exists(select 1 from public.learning_assignment_progress where assignment_id=current_setting('test.learning_assignment')::uuid) then raise exception 'outsider_reads_class_work'; end if;
  if exists(select 1 from public.learning_content_review) then raise exception 'nonadmin_reads_editorial_drafts'; end if;
end; $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.learning_teacher'),'role','authenticated')::text,true);
do $$ begin
  perform public.learning_review_subject(current_setting('test.learning_assignment')::uuid,current_setting('test.learning_pupil')::uuid,'changes_requested','Explain how you found the percentage.');
  if not exists(select 1 from public.learning_assignment_progress where assignment_id=current_setting('test.learning_assignment')::uuid and status='changes_requested' and feedback='Explain how you found the percentage.') then raise exception 'teacher_feedback_missing'; end if;
end; $$;
select jsonb_build_object('learning_school_checks_passed',true,'fixture_changes','rolled back');
rollback;
