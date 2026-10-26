begin;
create table public.illumed_lesson_questions (
  id text primary key,
  lesson_slug text not null references public.oak_lessons(slug) on delete cascade,
  kind text not null check (kind in ('keyword','cloze','misconception')),
  question text not null, answer text not null, explanation text not null,
  version text not null
);
create index illumed_lesson_questions_lesson on public.illumed_lesson_questions(lesson_slug);
alter table public.illumed_lesson_questions enable row level security;
revoke all on public.illumed_lesson_questions from public, anon, authenticated;
grant select on public.illumed_lesson_questions to anon, authenticated;
grant all on public.illumed_lesson_questions to service_role;
create policy "unrestricted lesson recall readable" on public.illumed_lesson_questions for select to anon, authenticated
  using (exists(select 1 from public.oak_lessons l where l.slug=lesson_slug and not l.restricted));

-- Preserve the existing counters and extend them with the separate self-check bank.
alter function public.platform_stats() rename to platform_stats_before_lesson_recall;
revoke all on function public.platform_stats_before_lesson_recall() from public, anon, authenticated;
create function public.platform_stats() returns jsonb
language sql stable security definer set search_path='' as $$
  select public.platform_stats_before_lesson_recall() || jsonb_build_object('lesson_recall_questions',
    (select count(*) from public.illumed_lesson_questions q join public.oak_lessons l on l.slug=q.lesson_slug where not l.restricted));
$$;
revoke all on function public.platform_stats() from public;
grant execute on function public.platform_stats() to anon, authenticated, service_role;
-- Swimming units marked "All years" are relevant to every primary year.
update public.oak_lessons l set years=array[1,2,3,4,5,6]
where phase='primary' and exists (select 1 from public.oak_units u where u.content->>'year'='All years'
  and exists(select 1 from jsonb_array_elements(u.content->'unitLessons') x where x->>'lessonSlug'=l.slug));
commit;
