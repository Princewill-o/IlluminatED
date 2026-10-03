-- Run against an isolated Postgres database with the migration already applied.
-- Caller supplies anon/authenticated roles and an auth.uid() test stub.
begin;
insert into auth.users(id) values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
insert into public.education_catalogue(course_id,content) values ('test-course','{"course":{"id":"test-course"}}');
set local role anon;
do $$ begin
  if not exists (select 1 from public.education_catalogue where course_id='test-course') then raise exception 'Public catalogue unreadable'; end if;
  begin
    perform * from public.education_learner_state;
    raise exception 'Anonymous learner access allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.education_catalogue(course_id,content) values ('poisoned','{}');
    raise exception 'Anonymous catalogue write allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_education_state_item('career','route','"both"');
    raise exception 'Anonymous mutation allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
select public.set_education_state_item('career','route','"both"');
select public.set_education_state_item('career','year','"year-12"');
select public.set_education_state_item('syllabus:test-course','topic-a','true');
select public.set_education_state_item('syllabus:test-course','topic-b','true');
do $$ begin
  if (select value from public.education_learner_state where namespace = 'syllabus:test-course') <> '{"topic-a":true,"topic-b":true}'::jsonb then raise exception 'Atomic merge lost state'; end if;
  begin
    perform public.set_education_state_item('career','route','"invalid"');
    raise exception 'Invalid choice allowed';
  exception when raise_exception then if sqlerrm != 'invalid_state' then raise; end if; end;
  begin
    update public.education_learner_state set user_id='22222222-2222-2222-2222-222222222222';
    raise exception 'Ownership reassignment allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
do $$ begin
  if exists (select 1 from public.education_learner_state) then raise exception 'Another user can read private state'; end if;
end $$;
select public.set_education_state_item('career','route','"university"');
reset role;
do $$ begin
  if (select count(*) from public.education_learner_state where namespace='career') <> 2 then raise exception 'Accounts were not separated'; end if;
  if exists (select 1 from pg_class where relname in ('education_catalogue','education_source_snapshots','education_learner_state') and not relrowsecurity) then raise exception 'RLS not enabled'; end if;
end $$;
rollback;
