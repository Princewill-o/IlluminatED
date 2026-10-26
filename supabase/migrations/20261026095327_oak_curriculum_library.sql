begin;
create table public.oak_imports (
  version text primary key,
  report jsonb not null,
  completed_at timestamptz not null default now()
);
create table public.oak_units (
  unit_id text primary key,
  sequence_slug text not null, unit_slug text not null, title text not null,
  subject text not null, subject_title text not null,
  key_stage text not null check (key_stage in ('ks1','ks2','ks3','ks4')),
  year integer check (year between 1 and 11), position integer not null,
  source_url text not null check (source_url like 'https://www.thenational.academy/%'),
  content jsonb not null, import_version text not null
);
create table public.oak_lessons (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title text not null, unit_slug text not null, unit_title text not null,
  subject text not null, subject_title text not null,
  key_stage text not null check (key_stage in ('ks1','ks2','ks3','ks4')),
  phase text not null check (phase in ('primary','secondary')), years integer[] not null default '{}',
  restricted boolean not null default false,
  source_url text not null check (source_url like 'https://www.thenational.academy/%'),
  content jsonb not null check (not restricted or content = '{}'::jsonb),
  import_version text not null
);
create index oak_lessons_filters on public.oak_lessons(key_stage,subject,unit_slug);
create index oak_lessons_years on public.oak_lessons using gin(years);
create index oak_lessons_search on public.oak_lessons using gin(to_tsvector('english',title || ' ' || unit_title || ' ' || subject_title));
create index oak_units_filters on public.oak_units(key_stage,subject,year);
alter table public.oak_imports enable row level security;
alter table public.oak_units enable row level security;
alter table public.oak_lessons enable row level security;
revoke all on public.oak_imports, public.oak_units, public.oak_lessons from public, anon, authenticated;
grant select on public.oak_imports, public.oak_units, public.oak_lessons to anon, authenticated;
grant all on public.oak_imports, public.oak_units, public.oak_lessons to service_role;
create policy "completed import reports readable" on public.oak_imports for select to anon, authenticated using (true);
create policy "published Oak units readable" on public.oak_units for select to anon, authenticated
  using (exists(select 1 from public.oak_imports i where i.version = import_version));
create policy "published Oak lessons readable" on public.oak_lessons for select to anon, authenticated
  using (exists(select 1 from public.oak_imports i where i.version = import_version));

-- Counts are computed from actual imported rows, never from archive size or duplicate sequence references.
create or replace function public.platform_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'questions', (select count(*) from public.bank_questions where review_status <> 'retired'),
    'practice_sets', (select count(distinct (level, subject, topic)) from public.bank_questions where review_status <> 'retired'),
    'subjects', (select count(distinct (level, subject)) from public.bank_questions where review_status <> 'retired'),
    'game_questions', (select count(*) from private.study_question_bank),
    'homework_set', (select count(*) from public.homework),
    'oak_lessons', (select count(*) from public.oak_lessons l where not restricted and exists(select 1 from public.oak_imports i where i.version=l.import_version)),
    'oak_units', (select count(distinct (subject,key_stage,unit_slug)) from public.oak_units u where exists(select 1 from public.oak_imports i where i.version=u.import_version)),
    'oak_subjects', (select count(distinct subject) from public.oak_lessons l where exists(select 1 from public.oak_imports i where i.version=l.import_version)),
    'oak_key_stages', (select count(distinct key_stage) from public.oak_lessons l where exists(select 1 from public.oak_imports i where i.version=l.import_version))
  );
$$;
revoke all on function public.platform_stats() from public;
grant execute on function public.platform_stats() to anon, authenticated, service_role;
commit;
