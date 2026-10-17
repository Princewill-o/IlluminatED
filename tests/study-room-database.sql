-- Integration checks use disposable fixtures and roll back every change.
begin;
insert into auth.users (id) values ('77777777-7777-4777-8777-777777777771'), ('77777777-7777-4777-8777-777777777772');
insert into public.profiles (id, username) values ('77777777-7777-4777-8777-777777777771', 'study_test_a'), ('77777777-7777-4777-8777-777777777772', 'study_test_b');
create temporary table study_test (id uuid, answers integer[]);
grant all on study_test to authenticated;
set local role anon;
do $$ begin
  begin perform public.study_start_session('gcse-maths'); raise exception 'Anonymous start permitted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777771', true);
do $$ declare s jsonb; begin
  s := public.study_start_session('gcse-maths');
  if jsonb_array_length(s->'questions') <> 5 then raise exception 'Wrong round size'; end if;
  if (s->'questions'->0) ? 'answer' or (s->'questions'->0) ? 'explain' then raise exception 'Answers leaked'; end if;
  insert into study_test (id) values ((s->>'id')::uuid);
  begin perform * from private.study_question_bank; raise exception 'Answer bank readable';
  exception when insufficient_privilege then null; end;
  begin update public.study_progress set correct = 999; raise exception 'Progress forgeable';
  exception when insufficient_privilege then null; end;
  begin perform public.study_submit_session((s->>'id')::uuid, array[0,0]); raise exception 'Incomplete answers accepted';
  exception when raise_exception then if sqlerrm <> 'invalid_answers' then raise; end if; end;
end $$;
reset role;
update study_test t set answers = (select array_agg(b.answer order by q.n) from public.study_sessions s, unnest(s.question_keys) with ordinality q(key,n) join private.study_question_bank b on b.key = q.key where s.id=t.id);
set local role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777772', true);
do $$ begin
  if exists (select 1 from public.study_sessions) then raise exception 'Session isolation failed'; end if;
  begin perform public.study_submit_session((select id from study_test), array[0,0,0,0,0]); raise exception 'Other user submitted session';
  exception when raise_exception then if sqlerrm <> 'session_unavailable' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777771', true);
do $$ declare r jsonb; xp_before integer; begin
  r := public.study_submit_session((select id from study_test), (select answers from study_test));
  if (r->>'correct')::integer <> 5 or (r->>'xp')::integer <> 35 or (r->>'clout')::integer <> 25 then raise exception 'Server scoring/rewards incorrect'; end if;
  if jsonb_array_length(r->'answers') <> 5 then raise exception 'Review missing'; end if;
  select xp into xp_before from public.player_stats where user_id=auth.uid();
  perform public.study_submit_session((select id from study_test), (select answers from study_test));
  if (select xp from public.player_stats where user_id=auth.uid()) <> xp_before then raise exception 'Replay awarded twice'; end if;
  if (select sessions from public.study_progress where user_id=auth.uid()) <> 1 then raise exception 'Replay counted twice'; end if;
end $$;
reset role;
-- Reward cap still permits learning and records completed rounds.
update public.study_progress set rewarded_today=10, reward_day=private.london_today() where user_id='77777777-7777-4777-8777-777777777771';
set local role authenticated;
do $$ declare s jsonb; r jsonb; begin
  s := public.study_start_session('gcse-maths');
  r := public.study_submit_session((s->>'id')::uuid, array[0,0,0,0,0]);
  if (r->>'xp')::integer <> 0 or (r->>'clout')::integer <> 0 then raise exception 'Daily cap ignored'; end if;
  if (select sessions from public.study_progress where user_id=auth.uid()) <> 2 then raise exception 'Practice not recorded'; end if;
end $$;
reset role;
update public.profiles set banned=true where id='77777777-7777-4777-8777-777777777771';
set local role authenticated;
do $$ begin
  begin perform public.study_start_session('gcse-maths'); raise exception 'Banned user allowed';
  exception when raise_exception then if sqlerrm <> 'not_allowed' then raise; end if; end;
end $$;
reset role;
rollback;
