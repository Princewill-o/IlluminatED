-- Supply an existing platform admin UUID in test.learning_teacher. All writes roll back.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.learning_teacher'),'role','authenticated')::text,true);
do $$
declare visible uuid; hidden uuid; question uuid;
begin
  if not private.is_platform_admin() then raise exception 'admin_fixture_required'; end if;
  insert into public.learning_content_review(product,kind,title,topic,body,exam_board,board_verified,status,created_by,reviewed_by,reviewed_at,review_notes)
  values('maths','resource','Public resource fixture','Profit','A reviewed supporting guide for the profit calculation.','Unverified board',false,'reviewed',auth.uid(),auth.uid(),now(),'Private editorial note') returning id into visible;
  insert into public.learning_content_review(product,kind,title,topic,body,status,created_by)
  values('maths','resource','Draft fixture','Profit','This draft must remain hidden from learners.','draft',auth.uid()) returning id into hidden;
  insert into public.learning_content_review(product,kind,title,topic,body,answer_explanation,status,created_by,reviewed_by,reviewed_at)
  values('maths','question','Question fixture','Profit','What is the profit in this fixture?','A private question answer key.','reviewed',auth.uid(),auth.uid(),now()) returning id into question;
  perform set_config('test.learning_resource',visible::text,true);
  perform set_config('test.learning_hidden_resource',hidden::text,true);
  perform set_config('test.learning_question',question::text,true);
  if exists(select 1 from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname in ('learning_assignment_create','learning_assignment_start','learning_review_subject','learning_reviewed_resources') and p.prosecdef) then raise exception 'public_definer_endpoint'; end if;
end; $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  if (select count(*) from public.learning_reviewed_resources(null,current_setting('test.learning_resource')::uuid))<>1 then raise exception 'reviewed_resource_not_public'; end if;
  if exists(select 1 from public.learning_reviewed_resources(null,current_setting('test.learning_hidden_resource')::uuid)) then raise exception 'draft_resource_leaked'; end if;
  if exists(select 1 from public.learning_reviewed_resources(null,current_setting('test.learning_question')::uuid)) then raise exception 'question_answer_leaked'; end if;
  if exists(select 1 from public.learning_reviewed_resources('english',current_setting('test.learning_resource')::uuid)) then raise exception 'product_filter_ignored'; end if;
  if exists(select 1 from public.learning_reviewed_resources(null,current_setting('test.learning_resource')::uuid) where exam_board is not null) then raise exception 'unverified_board_claim'; end if;
  if has_table_privilege('anon','public.learning_content_review','select') then raise exception 'direct_editorial_access'; end if;
end; $$;
reset role;
select jsonb_build_object('learning_resource_checks_passed',true,'fixture_changes','rolled back');
rollback;
