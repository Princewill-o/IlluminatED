-- Illumed GCSE and A-level question bank (draft seed, 3,344 items).
-- review_status: ai_verified (answer re-solved by scripts/review-question-bank.py),
-- ai_checked (read and corrected in review), retired (never served), or
-- needs_subject_expert_review. publish_ready stays false until a teacher signs off.
-- The app shows drafts with a clear "draft, not yet reviewed" label until a
-- subject expert approves them by setting publish_ready = true.

create table if not exists public.bank_questions (
  id text primary key,
  level text not null check (level in ('GCSE', 'A-level')),
  subject text not null,
  topic text not null,
  question_type text not null check (question_type in ('short_answer', 'calculation', 'evaluation', 'constructed_response', 'multiple_choice')),
  question text not null,
  answer text not null,
  explanation text not null default '',
  marks smallint not null default 1,
  difficulty text not null default 'ungraded',
  source text not null,
  licence text not null,
  review_status text not null default 'needs_subject_expert_review',
  exam_board text not null default 'generic',
  official_past_paper boolean not null default false,
  board_alignment_status text not null default 'NOT_VERIFIED',
  exam_board_targets text[] not null default '{}',
  curriculum_tags text[] not null default '{}',
  publish_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bank_questions_level_subject on public.bank_questions (level, subject);
create index if not exists bank_questions_topic on public.bank_questions (level, subject, topic);

alter table public.bank_questions enable row level security;

-- Signed-in learners can read the bank. Only the service role (admin tools,
-- imports) can write, because no insert/update/delete policies exist.
drop policy if exists "bank questions are readable by members" on public.bank_questions;
create policy "bank questions are readable by members" on public.bank_questions
  for select to authenticated using (true);

-- A random practice set. Auto-markable types by default; reviewed items first.
create or replace function public.bank_sample(
  p_level text default null,
  p_subject text default null,
  p_topic text default null,
  p_types text[] default array['short_answer', 'calculation', 'multiple_choice'],
  p_limit int default 10,
  p_reviewed_only boolean default false
) returns setof public.bank_questions
language sql stable security invoker set search_path = '' as $$
  select q.* from public.bank_questions q
  where (p_level is null or q.level = p_level)
    and (p_subject is null or q.subject = p_subject)
    and (p_topic is null or q.topic = p_topic)
    and q.question_type = any (p_types)
    and q.review_status <> 'retired' and q.review_status <> 'flagged_needs_fix'
    and (not p_reviewed_only or q.publish_ready)
  order by q.publish_ready desc, (q.review_status = 'ai_verified') desc, random()
  limit least(greatest(p_limit, 1), 50);
$$;
revoke all on function public.bank_sample(text, text, text, text[], int, boolean) from public, anon;
grant execute on function public.bank_sample(text, text, text, text[], int, boolean) to authenticated;

-- Subjects and topics with counts, for menus.
create or replace view public.bank_topics with (security_invoker = true) as
  select level, subject, topic, count(*)::int as questions, count(*) filter (where publish_ready)::int as reviewed
  from public.bank_questions where review_status <> 'retired' group by level, subject, topic;
grant select on public.bank_topics to authenticated;
