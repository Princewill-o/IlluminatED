-- Shared publisher metadata is public; learner choices and revision ticks are private.
begin;
create table public.education_catalogue (
  course_id text primary key check (course_id ~ '^[a-z0-9-]{1,80}$'),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 2000000),
  updated_at timestamptz not null default now()
);
create table public.education_source_snapshots (
  id text primary key check (id in ('opportunities')),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 10000000),
  updated_at timestamptz not null default now()
);
create table public.education_learner_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  namespace text not null check (namespace ~ '^(career|saved-opportunities|syllabus:[a-z0-9-]{1,80})$'),
  value jsonb not null default '{}'::jsonb check (jsonb_typeof(value) = 'object' and octet_length(value::text) <= 1000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, namespace)
);
alter table public.education_catalogue enable row level security;
alter table public.education_source_snapshots enable row level security;
alter table public.education_learner_state enable row level security;
revoke all on public.education_catalogue, public.education_source_snapshots, public.education_learner_state from anon, authenticated;
grant select on public.education_catalogue, public.education_source_snapshots to anon, authenticated;
grant select, insert, update, delete on public.education_learner_state to authenticated;
grant all on public.education_catalogue, public.education_source_snapshots, public.education_learner_state to service_role;
create policy "published curriculum readable" on public.education_catalogue for select to anon, authenticated using (true);
create policy "published snapshots readable" on public.education_source_snapshots for select to anon, authenticated using (true);
create policy "read own education state" on public.education_learner_state for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own education state" on public.education_learner_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own education state" on public.education_learner_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own education state" on public.education_learner_state for delete to authenticated using (user_id = (select auth.uid()));
-- Atomic per-item merge avoids losing unrelated checkmarks from another device.
create function public.set_education_state_item(p_namespace text, p_item text, p_value jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'sign_in_required'; end if;
  if p_namespace is null or p_namespace !~ '^(career|saved-opportunities|syllabus:[a-z0-9-]{1,80})$'
    or p_item is null or char_length(p_item) not between 1 and 1200 or p_value is null then
    raise exception 'invalid_state';
  end if;
  if p_namespace = 'career' then
    if not ((p_item = 'route' and p_value in ('"university"'::jsonb, '"apprenticeship"'::jsonb, '"both"'::jsonb, '"unsure"'::jsonb))
      or (p_item = 'year' and p_value in ('"year-9"'::jsonb, '"year-10"'::jsonb, '"year-11"'::jsonb, '"year-12"'::jsonb, '"year-13"'::jsonb, '"college"'::jsonb, '"adult"'::jsonb, '"other"'::jsonb))) then
      raise exception 'invalid_state';
    end if;
  elsif jsonb_typeof(p_value) != 'boolean' then raise exception 'invalid_state'; end if;
  insert into public.education_learner_state (user_id,namespace,value)
    values ((select auth.uid()),p_namespace,jsonb_build_object(p_item,p_value))
  on conflict (user_id,namespace) do update set
    value = public.education_learner_state.value || jsonb_build_object(p_item,p_value), updated_at = now()
  returning value into result;
  return result;
end;
$$;
revoke all on function public.set_education_state_item(text,text,jsonb) from public, anon;
grant execute on function public.set_education_state_item(text,text,jsonb) to authenticated;
commit;
