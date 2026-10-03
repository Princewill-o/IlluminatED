-- Optional school/college is private account data. Never join it into public profiles.
create table if not exists public.private_school (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  school_name text not null check (char_length(school_name) between 2 and 100),
  updated_at timestamptz not null default now()
);

alter table public.private_school enable row level security;
create policy "read own school" on public.private_school for select to authenticated
  using (user_id = (select auth.uid()));
create policy "add own school" on public.private_school for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "edit own school" on public.private_school for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own school" on public.private_school for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.private_school from anon;
grant select, insert, update, delete on public.private_school to authenticated;
