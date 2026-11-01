-- In-game quick quizzes (police checks, interviews, airport security, prison
-- study, bus revision, Scary Bots) drawn from the question bank: each question
-- becomes multiple choice with three distractors from the same subject.
create or replace function public.game_quiz(p_count integer default 1, p_subjects text[] default null)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  result jsonb := '[]'::jsonb;
  q record;
  wrong text[];
  opts text[];
  slot integer;
  n integer := least(greatest(coalesce(p_count, 1), 1), 10);
begin
  if (select auth.uid()) is null then raise exception 'not_allowed'; end if;
  for q in
    select b.* from public.bank_questions b
    where b.review_status not in ('retired', 'flagged_needs_fix')
      and b.question_type in ('short_answer', 'calculation', 'multiple_choice')
      and char_length(b.answer) between 1 and 60
      and char_length(b.question) <= 220
      and (p_subjects is null or cardinality(p_subjects) = 0 or b.subject = any (p_subjects))
    order by random()
    limit n * 3
  loop
    exit when jsonb_array_length(result) >= n;
    select array_agg(a) into wrong from (
      select s.a from (
        select min(d.answer) as a, bool_or(d.topic = q.topic) as same_topic
        from public.bank_questions d
        where d.subject = q.subject and d.id <> q.id
          and lower(trim(d.answer)) <> lower(trim(q.answer))
          and char_length(d.answer) between 1 and 60
          and d.question_type = q.question_type
          and d.review_status not in ('retired', 'flagged_needs_fix')
        group by lower(trim(d.answer))
      ) s
      order by s.same_topic desc, abs(char_length(s.a) - char_length(q.answer)), random()
      limit 3
    ) picked;
    continue when coalesce(cardinality(wrong), 0) < 3;
    slot := floor(random() * 4)::int;
    opts := wrong[1:slot] || array[q.answer] || wrong[slot + 1:3];
    result := result || jsonb_build_array(jsonb_build_object(
      'id', q.id, 'prompt', q.question, 'options', to_jsonb(opts), 'answer', slot,
      'explain', coalesce(nullif(q.explanation, ''), 'The answer is ' || q.answer || '.'),
      'subject', q.subject, 'topic', q.topic, 'level', q.level));
  end loop;
  if jsonb_array_length(result) = 0 and p_subjects is not null and cardinality(p_subjects) > 0 then
    return public.game_quiz(p_count, null);
  end if;
  return result;
end;
$$;
revoke all on function public.game_quiz(integer, text[]) from public, anon;
grant execute on function public.game_quiz(integer, text[]) to authenticated;
