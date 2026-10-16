-- Teacher classes and homework.
-- Privacy by design: students join with a class code, teachers only ever see
-- usernames (never emails or real names), answer keys live in a private table
-- and marking happens inside the database, so nobody can fake a score.

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(name) between 2 and 60),
  subject text not null check (length(subject) between 2 and 60),
  school text check (length(school) <= 80),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);
create index if not exists classes_owner on public.classes (owner_id);

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index if not exists class_members_user on public.class_members (user_id);

create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (length(title) between 2 and 80),
  instructions text check (length(instructions) <= 500),
  -- [{ "key": "...", "q": "...", "options": [...], "topic": "..." }] with no answers.
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 30),
  due_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists homework_class on public.homework (class_id, due_at);

create table if not exists private.homework_keys (
  homework_id uuid primary key references public.homework (id) on delete cascade,
  answers integer[] not null,
  explains text[] not null
);

create table if not exists public.homework_submissions (
  homework_id uuid not null references public.homework (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  answers integer[] not null,
  correct integer not null,
  total integer not null,
  attempts integer not null default 1,
  submitted_at timestamptz not null default now(),
  primary key (homework_id, user_id)
);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.homework enable row level security;
alter table public.homework_submissions enable row level security;

create or replace function private.owns_class(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes where id = c and owner_id = (select auth.uid()));
$$;
create or replace function private.in_class(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_members where class_id = c and user_id = (select auth.uid()));
$$;

create policy "teacher or member reads class" on public.classes for select to authenticated
  using (owner_id = (select auth.uid()) or private.in_class(id));
create policy "teacher sees members, you see yourself" on public.class_members for select to authenticated
  using (user_id = (select auth.uid()) or private.owns_class(class_id));
create policy "teacher or member reads homework" on public.homework for select to authenticated
  using (private.owns_class(class_id) or private.in_class(class_id));
create policy "own or your class's submissions" on public.homework_submissions for select to authenticated
  using (user_id = (select auth.uid()) or private.owns_class((select h.class_id from public.homework h where h.id = homework_id)));

-- Usernames of a class's students, for its teacher only.
create or replace function public.class_roster(p_class uuid)
returns table (user_id uuid, username text, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.username, m.joined_at
  from public.class_members m left join public.profiles p on p.id = m.user_id
  where m.class_id = p_class and private.owns_class(p_class)
  order by p.username;
$$;
grant execute on function public.class_roster(uuid) to authenticated;

create or replace function public.class_create(p_name text, p_subject text, p_school text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  c text;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if (select count(*) from public.classes where owner_id = uid) >= 30 then raise exception 'too_many'; end if;
  loop
    c := upper(substr(translate(md5(random()::text || clock_timestamp()::text), '01', ''), 1, 6));
    exit when length(c) = 6 and not exists (select 1 from public.classes where code = c);
  end loop;
  insert into public.classes (owner_id, name, subject, school, code) values (uid, trim(p_name), trim(p_subject), nullif(trim(p_school), ''), c);
  return c;
end;
$$;
grant execute on function public.class_create(text, text, text) to authenticated;

create or replace function public.class_join(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  cid uuid;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select id into cid from public.classes where code = upper(trim(p_code));
  if cid is null then raise exception 'no_class'; end if;
  if exists (select 1 from public.classes where id = cid and owner_id = uid) then raise exception 'own_class'; end if;
  if (select count(*) from public.class_members where class_id = cid) >= 60 then raise exception 'class_full'; end if;
  insert into public.class_members (class_id, user_id) values (cid, uid) on conflict do nothing;
  return cid;
end;
$$;
grant execute on function public.class_join(text) to authenticated;

-- Leaving a class removes you and every homework answer you gave in it.
create or replace function public.class_leave(p_class uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  delete from public.homework_submissions s using public.homework h
    where s.homework_id = h.id and h.class_id = p_class and s.user_id = uid;
  delete from public.class_members where class_id = p_class and user_id = uid;
end;
$$;
grant execute on function public.class_leave(uuid) to authenticated;

create or replace function public.class_remove_student(p_class uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.owns_class(p_class) then raise exception 'not_allowed'; end if;
  delete from public.homework_submissions s using public.homework h
    where s.homework_id = h.id and h.class_id = p_class and s.user_id = p_user;
  delete from public.class_members where class_id = p_class and user_id = p_user;
end;
$$;
grant execute on function public.class_remove_student(uuid, uuid) to authenticated;

create or replace function public.class_delete(p_class uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.owns_class(p_class) then raise exception 'not_allowed'; end if;
  delete from public.classes where id = p_class;
end;
$$;
grant execute on function public.class_delete(uuid) to authenticated;

create or replace function public.homework_create(p_class uuid, p_title text, p_instructions text, p_due timestamptz, p_questions jsonb, p_answers integer[], p_explains text[])
returns uuid
language plpgsql security definer set search_path = '' as $$
declare hid uuid;
begin
  if not private.owns_class(p_class) then raise exception 'not_allowed'; end if;
  if jsonb_array_length(p_questions) <> coalesce(array_length(p_answers, 1), 0) or array_length(p_answers, 1) <> array_length(p_explains, 1) then raise exception 'invalid'; end if;
  if p_due < now() then raise exception 'due_past'; end if;
  insert into public.homework (class_id, title, instructions, questions, due_at) values (p_class, trim(p_title), nullif(trim(p_instructions), ''), p_questions, p_due) returning id into hid;
  insert into private.homework_keys values (hid, p_answers, p_explains);
  return hid;
end;
$$;
grant execute on function public.homework_create(uuid, text, text, timestamptz, jsonb, integer[], text[]) to authenticated;

create or replace function public.homework_delete(p_homework uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.owns_class((select class_id from public.homework where id = p_homework)) then raise exception 'not_allowed'; end if;
  delete from public.homework where id = p_homework;
end;
$$;
grant execute on function public.homework_delete(uuid) to authenticated;

-- Marks your answers. First attempt pays 10 Clout per right answer. Returns the key and explanations.
create or replace function public.homework_submit(p_homework uuid, p_answers integer[])
returns table (correct integer, total integer, answers integer[], explains text[], reward integer)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  k private.homework_keys;
  c integer := 0;
  n integer;
  first boolean;
  pay integer := 0;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if not private.in_class((select class_id from public.homework where id = p_homework)) then raise exception 'not_allowed'; end if;
  select * into k from private.homework_keys where homework_id = p_homework;
  n := array_length(k.answers, 1);
  if coalesce(array_length(p_answers, 1), 0) <> n then raise exception 'invalid'; end if;
  for i in 1..n loop
    if p_answers[i] = k.answers[i] then c := c + 1; end if;
  end loop;
  first := not exists (select 1 from public.homework_submissions s where s.homework_id = p_homework and s.user_id = uid);
  insert into public.homework_submissions (homework_id, user_id, answers, correct, total)
  values (p_homework, uid, p_answers, c, n)
  on conflict (homework_id, user_id) do update
    set answers = excluded.answers, correct = greatest(public.homework_submissions.correct, excluded.correct),
        attempts = public.homework_submissions.attempts + 1, submitted_at = now();
  if first then
    pay := c * 10;
    insert into public.player_stats (user_id, clout) values (uid, pay)
    on conflict (user_id) do update set clout = public.player_stats.clout + excluded.clout, updated_at = now();
  end if;
  return query select c, n, k.answers, k.explains, pay;
end;
$$;
grant execute on function public.homework_submit(uuid, integer[]) to authenticated;

revoke all on function private.owns_class(uuid), private.in_class(uuid) from public;
grant execute on function private.owns_class(uuid), private.in_class(uuid) to authenticated;
revoke all on table private.homework_keys from public, anon, authenticated;

-- Retention: homework answers are kept for one academic year. Run yearly (e.g. 1 September)
-- or from a scheduled job: removes submissions over 13 months old and classes idle that long.
create or replace function private.purge_school_data() returns void
language sql security definer set search_path = '' as $$
  delete from public.homework_submissions where submitted_at < now() - interval '13 months';
  delete from public.homework where due_at < now() - interval '13 months';
  delete from public.classes c where c.created_at < now() - interval '13 months'
    and not exists (select 1 from public.homework h where h.class_id = c.id);
$$;
revoke all on function private.purge_school_data() from public, anon, authenticated;
