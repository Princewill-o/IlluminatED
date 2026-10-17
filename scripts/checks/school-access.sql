-- Runs entirely in a rolled-back transaction. No test accounts or scores are retained.
begin;
create temporary table school_test_context(key text primary key,value uuid);
grant select on school_test_context to authenticated;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();u uuid;kind text;
begin
 insert into public.school_licences(id,name,seats,status,expires_at,agreement_reference,payment_approved_at)
 values(a,'QA School A',1,'active',now()+interval '1 day','rolled-back test',now()),(b,'QA School B',10,'active',now()+interval '1 day','rolled-back test',now());
 insert into school_test_context values('school-a',a),('school-b',b);
 foreach kind in array array['teacher','student','overflow','outsider'] loop
  u:=gen_random_uuid();
  insert into school_test_context values(kind,u);
  insert into public.access_invites(email,school_id,school_role) values(u::text||'@school-test.invalid',case when kind='outsider' then b else a end,case when kind='teacher' then 'teacher' else 'student' end);
  insert into auth.users(id,email,email_confirmed_at,aud,role) values(u,u::text||'@school-test.invalid',now(),'authenticated','authenticated');
  insert into public.profiles(id,username) values(u,'qa_'||substr(replace(u::text,'-',''),1,12));
 end loop;
end $$;
set local role authenticated;
do $$
declare teacher uuid;student uuid;outsider uuid;overflow uuid;class_code text;cid uuid;hw uuid;access jsonb;paid integer;rejected boolean;
begin
 select value into teacher from school_test_context where key='teacher';select value into student from school_test_context where key='student';select value into outsider from school_test_context where key='outsider';select value into overflow from school_test_context where key='overflow';
 perform set_config('request.jwt.claim.sub',teacher::text,true);
 access:=public.school_access();if access->>'role'<>'teacher' or not (access->>'active')::boolean then raise exception 'teacher activation failed';end if;
 class_code:=public.class_create('QA maths','Maths','Ignored spoofed school');select id into cid from public.classes where classes.code=class_code;
 if cid is null then raise exception 'teacher cannot read own class';end if;
 hw:=public.homework_create(cid,'QA homework','',now()+interval '1 hour','[{"key":"qa","q":"2+2?","options":["3","4"]}]'::jsonb,array[1],array['2+2=4']);
 perform set_config('request.jwt.claim.sub',student::text,true);access:=public.school_access();if not (access->>'active')::boolean then raise exception 'student activation failed';end if;
 perform public.class_join(class_code);
 select reward into paid from public.homework_submit(hw,array[1]);if paid<>10 then raise exception 'first submission reward wrong';end if;
 select reward into paid from public.homework_submit(hw,array[1]);if paid<>0 then raise exception 'repeat submission paid twice';end if;
 rejected:=false;begin perform public.class_create('Forged class','Maths','');exception when others then rejected:=true;end;if not rejected then raise exception 'student can create teacher class';end if;
 if exists(select 1 from public.school_licences) then raise exception 'student sees private licence records';end if;
 perform set_config('request.jwt.claim.sub',overflow::text,true);access:=public.school_access();if access->>'status'<>'full' or (access->>'active')::boolean then raise exception 'seat cap bypass';end if;
 if private.is_active_member() then raise exception 'full school falls back to individual access';end if;
 perform set_config('request.jwt.claim.sub',outsider::text,true);perform public.school_access();
 rejected:=false;begin perform public.class_join(class_code);exception when others then rejected:=true;end;if not rejected then raise exception 'cross-school class join succeeded';end if;
 if exists(select 1 from public.homework where id=hw) then raise exception 'cross-school homework read succeeded';end if;
 perform set_config('request.jwt.claim.sub',teacher::text,true);if (select count(*) from public.class_roster(cid))<>1 then raise exception 'teacher roster incorrect';end if;
end $$;
reset role;
update public.school_licences set status='suspended' where id=(select value from school_test_context where key='school-a');
set local role authenticated;
do $$
declare access jsonb;uid uuid;
begin
 select value into uid from school_test_context where key='student';perform set_config('request.jwt.claim.sub',uid::text,true);
 access:=public.school_access();if (access->>'active')::boolean or private.is_active_member() then raise exception 'suspended licence still permits access';end if;
 if exists(select 1 from public.homework) then raise exception 'suspended student still reads homework';end if;
end $$;
reset role;
rollback;
select 'PASS: teacher/student roles, seat caps, school isolation, private records, marked homework, one-time rewards and suspended access; all fixtures rolled back' as verification;
