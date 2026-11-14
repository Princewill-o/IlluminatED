-- Set test.illumworld_user to an existing active platform admin/member.
-- Every project/class change is rolled back. No user balances are touched.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.illumworld_user'),'role','authenticated')::text,true);
do $$
declare
  uid uuid:=auth.uid(); result jsonb; pid uuid; cid uuid; aid uuid; failed boolean;
  answers jsonb:='{"devices":[{"id":"raven-r4","profit":"30","decision":"decline","reason":"The battery remains uncertain and extra repair could remove the profit margin."},{"id":"kite-k2","profit":"40","decision":"repair","reason":"The quoted socket repair leaves forty pounds before other costs and the other checks passed."},{"id":"ember-e3","profit":"-15","decision":"decline","reason":"The repair would lose fifteen pounds even if it succeeds and the inspection cannot confirm success."}],"reportDevice":"raven-r4","report":"The display has a crack in its lower-right corner. Touch worked during this short inspection. The battery charge fell during inspection, but this does not confirm a fault. A standardised test is required before a final repair quote."}'::jsonb;
begin
  -- Isolate an existing independent draft without affecting it after rollback.
  delete from public.learning_world_projects where user_id=uid and assignment_id is null;
  result:=public.save_learning_world_project(null,answers,true); pid:=(result->>'id')::uuid;
  if result->>'status'<>'submitted' or (result->>'score')::int<>3 then raise exception 'Incorrect server marking'; end if;
  result:=public.save_learning_world_project(null,answers,false);
  if result->>'status'<>'draft' then raise exception 'Independent project cannot be revised'; end if;
  failed:=false;
  begin perform public.review_learning_world_project(pid,'approved','Strong reasoning and accurate report.'); exception when others then failed:=true; end;
  if not failed then raise exception 'Independent project was certified'; end if;
  -- A caller cannot insert a browser-fabricated certificate or directly update approval.
  if has_table_privilege('authenticated','public.learning_world_projects','INSERT')
     or has_table_privilege('authenticated','public.learning_world_projects','UPDATE')
     or has_function_privilege('anon','public.save_learning_world_project(uuid,jsonb,boolean)','EXECUTE')
     or has_function_privilege('anon','public.review_learning_world_project(uuid,text,text)','EXECUTE') then raise exception 'Unsafe grant'; end if;
  failed:=false;
  begin perform public.save_learning_world_project(null,jsonb_set(answers,'{devices,2,id}','"raven-r4"'),false); exception when others then failed:=true; end;
  if not failed then raise exception 'Duplicate devices accepted'; end if;
  -- Existing classes support the same owner and member only for this fixture.
  insert into public.classes(owner_id,name,subject,code) values(uid,'IllumWorld rollback fixture','Work experience','IW'||upper(substr(md5(random()::text),1,4))) returning id into cid;
  insert into public.class_members(class_id,user_id) values(cid,uid);
  insert into public.learning_assignments(class_id,product,resource_slug,title,created_by)
    values(cid,'world','tech-repair-trainee','Repair fixture',uid) returning id into aid;
  result:=public.save_learning_world_project(aid,answers,true); pid:=(result->>'id')::uuid;
  failed:=false;
  begin perform public.save_learning_world_project(aid,answers,false); exception when others then failed:=true; end;
  if not failed then raise exception 'Submitted assignment remained editable'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  failed:=false;
  begin perform public.review_learning_world_project(pid,'approved','Spoofed teacher approval'); exception when others then failed:=true; end;
  if not failed then raise exception 'Another user approved the project'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  perform public.review_learning_world_project(pid,'changes_requested','Explain the battery uncertainty more clearly.');
  result:=public.save_learning_world_project(aid,answers,true);
  if (result->>'revision')::int<>2 then raise exception 'Resubmission version was not incremented'; end if;
  perform public.review_learning_world_project(pid,'approved','Evidence, reasoning and report meet the project rubric.');
  if not exists(select 1 from public.learning_world_projects where id=pid and status='approved' and approved_at is not null) then raise exception 'Approval missing'; end if;
  if not exists(select 1 from public.learning_assignment_progress where assignment_id=aid and user_id=uid and status='approved' and score=3) then raise exception 'Class progress not updated'; end if;
end; $$;
select jsonb_build_object('illumworld_repair_checks_passed',true,'fixture_changes','rolled back');
rollback;
