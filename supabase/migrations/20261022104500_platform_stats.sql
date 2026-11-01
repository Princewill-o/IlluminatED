-- Public platform totals for the landing page counters. Counts only; no
-- question content is exposed. Safe for logged-out visitors (anon).
create or replace function public.platform_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'questions', (select count(*) from public.bank_questions where review_status <> 'retired'),
    'practice_sets', (select count(distinct (level, subject, topic)) from public.bank_questions where review_status <> 'retired'),
    'subjects', (select count(distinct (level, subject)) from public.bank_questions where review_status <> 'retired'),
    'game_questions', (select count(*) from private.study_question_bank),
    'homework_set', (select count(*) from public.homework)
  );
$$;
grant execute on function public.platform_stats() to anon, authenticated;
