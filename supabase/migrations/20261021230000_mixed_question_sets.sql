-- Mixed ("All subjects") question sets, in and out of game.
--
-- Out of game: /practice already passes null level/subject to public.bank_sample,
-- which then samples the whole bank; the UI now offers "All levels" / "All subjects".
--
-- In game: the Study Quarter gains a special course id 'all' that draws five random
-- questions from every subject in private.study_question_bank. The game bank is also
-- topped up from the checked question bank (public.bank_questions / question_bank):
--   * every checked multiple-choice question (with its four options), and
--   * whole-number calculations, turned into multiple choice with three numeric
--     distractors (binary and logic-gate answers are left out).

-- 1. Study Quarter: support p_course = 'all'.
create or replace function private.study_start_session(p_course text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare uid uuid := auth.uid(); keys text[]; sid uuid; questions jsonb;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  -- Serialize starts per player so concurrent requests cannot bypass rate limits.
  insert into public.player_stats(user_id) values(uid) on conflict do nothing;
  perform 1 from public.player_stats where user_id=uid for update;
  if (select count(*) from public.study_sessions where user_id=uid and created_at > now()-interval '1 hour') >= 60 then
    raise exception 'rate_limited';
  end if;
  -- 'all' mixes every subject; otherwise draw from the chosen course only.
  select array_agg(key) into keys from (
    select key from private.study_question_bank
    where p_course = 'all' or course_id = p_course
    order by random() limit 5) q;
  if coalesce(cardinality(keys),0) <> 5 then raise exception 'unknown_course'; end if;
  insert into public.study_sessions(user_id,course_id,question_keys) values(uid,p_course,keys) returning id into sid;
  select jsonb_agg(jsonb_build_object('key',b.key,'prompt',b.prompt,'options',b.options) order by k.n)
    into questions from unnest(keys) with ordinality k(key,n) join private.study_question_bank b on b.key=k.key;
  return jsonb_build_object('id',sid,'courseId',p_course,'questions',questions);
end $function$;

-- 2. Map bank subjects to course ids ('mixed' when there is no matching course).
create or replace function private.bank_course_id(p_level text, p_subject text) returns text
language sql immutable set search_path = '' as $$
  select case p_level || '|' || p_subject
    when 'GCSE|Mathematics' then 'gcse-maths'
    when 'GCSE|English Language' then 'gcse-english-language'
    when 'GCSE|English Literature' then 'gcse-english-literature'
    when 'GCSE|Biology' then 'gcse-biology'
    when 'GCSE|Chemistry' then 'gcse-chemistry'
    when 'GCSE|Physics' then 'gcse-physics'
    when 'GCSE|Combined Science' then 'gcse-combined-science'
    when 'GCSE|History' then 'gcse-history'
    when 'GCSE|Geography' then 'gcse-geography'
    when 'GCSE|Computer Science' then 'gcse-computer-science'
    when 'A-level|Economics' then 'alevel-economics'
    when 'BTEC|BTEC Applied Science' then 'btec-applied-science'
    when 'T Level|T Level Digital' then 'tlevel-digital-support'
    else 'mixed' end $$;

-- 3a. Checked multiple-choice questions.
insert into private.study_question_bank (key, course_id, prompt, options, answer, explain)
select 'qb-' || q.id, private.bank_course_id(q.level, q.subject), q.question, q.options,
       (select o.n - 1 from jsonb_array_elements_text(q.options) with ordinality o(v, n) where o.v = q.answer limit 1)::int,
       coalesce(nullif(q.explanation, ''), 'The correct answer is ' || q.answer || '.')
from public.question_bank q
where q.options is not null and jsonb_array_length(q.options) between 2 and 8
  and exists (select 1 from jsonb_array_elements_text(q.options) o(v) where o.v = q.answer)
on conflict (key) do nothing;

-- 3b. Whole-number calculations as multiple choice.
with calc as (
  select b.id, b.level, b.subject, b.question, b.explanation, b.answer::numeric a,
         greatest(1, round(abs(b.answer::numeric) / 10))::numeric k
  from public.bank_questions b
  where b.question_type = 'calculation' and b.answer ~ '^-?\d{1,9}$'
    and b.review_status = 'ai_verified'
    and b.topic not in ('Binary', 'Boolean logic', 'Logic')
    and b.question not ilike '%binary%' and b.question not ilike '%AND gate%'
), opts as (
  select c.*, array[c.a, c.a + c.k, case when c.a - c.k >= 0 or c.a < 0 then c.a - c.k else c.a + 3 * c.k end, c.a + 2 * c.k] vals
  from calc c
), shuffled as (
  select o.*, (select array_agg(v::text order by md5(o.id || v::text)) from unnest(o.vals) v) opt
  from opts o
)
insert into private.study_question_bank (key, course_id, prompt, options, answer, explain)
select 'qb-' || s.id, private.bank_course_id(s.level, s.subject), s.question, to_jsonb(s.opt),
       array_position(s.opt, s.a::text) - 1,
       coalesce(nullif(s.explanation, ''), 'The answer is ' || s.a::text || '.')
from shuffled s
where (select count(distinct v) from unnest(s.opt) v) = 4
on conflict (key) do nothing;
