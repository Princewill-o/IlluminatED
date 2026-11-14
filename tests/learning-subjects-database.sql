-- Run on a transaction-capable Postgres connection; all fixtures roll back.
begin;
select set_config('request.jwt.claims','{"sub":"f418310b-07f5-4865-aa4c-38cf126a3ef1","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','f418310b-07f5-4865-aa4c-38cf126a3ef1',true);
do $$
declare a jsonb; b jsonb; sid uuid; picked integer[]; correct integer[]; r jsonb; saved text;
begin
  a:=public.learning_subject_start('maths','percentages','practice',null);
  sid:=(a->>'id')::uuid;
  select question_indices into picked from public.learning_subject_attempts where id=sid;
  select array_agg(k.answer_keys[i+1] order by ord) into correct from private.learning_subject_keys k cross join lateral unnest(picked) with ordinality x(i,ord) where k.product='maths' and k.topic_slug='percentages';
  perform public.learning_subject_draft(sid,array[-1,-1,-1,-1],'A saved draft');
  b:=public.learning_subject_start('maths','percentages','practice',null);
  if (b->>'id')::uuid<>sid or b->>'written_response'<>'A saved draft' then raise exception 'draft resume failed'; end if;
  r:=public.learning_subject_submit(sid,correct,'A saved draft');
  if (r->>'score')::integer<>4 or (r->>'max_score')::integer<>4 then raise exception 'grading failed'; end if;
  r:=public.learning_subject_submit(sid,array[0,0,0,0],'tampered');
  if (r->>'score')::integer<>4 or r->>'written_response'<>'A saved draft' then raise exception 'idempotency failed'; end if;
  b:=public.learning_subject_start('maths','percentages','practice',null);
  if exists(select 1 from unnest(picked) i where i=any(array(select jsonb_array_elements_text(b->'question_indices')::integer))) then raise exception 'retry did not use other set'; end if;
  a:=public.learning_subject_start('maths','ratio-proportion','race',null);
  if (a->>'max_score')::integer<>8 then raise exception 'race did not use full bank'; end if;
  begin
    perform public.learning_subject_submit((a->>'id')::uuid,array[999,999,999,999,999,999,999,999],'');
    raise exception 'invalid answers accepted';
  exception when raise_exception then if sqlerrm='invalid answers accepted' then raise; end if; end;
  if has_table_privilege('authenticated','public.learning_subject_attempts','INSERT') or has_table_privilege('authenticated','public.learning_subject_attempts','UPDATE') then raise exception 'direct score mutation grant'; end if;
  if has_table_privilege('anon','public.learning_subject_attempts','SELECT') then raise exception 'anonymous progress exposure'; end if;
  if has_function_privilege('anon','public.learning_subject_submit(uuid,integer[],text)','EXECUTE') then raise exception 'anonymous submit exposure'; end if;
end $$;
rollback;
