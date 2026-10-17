-- School-scoped access. Roles and paid status are assigned only by a platform admin.
begin;
create table public.school_licences (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 2 and 100),
 seats integer not null check (seats between 1 and 100000),
 status text not null default 'pending' check (status in ('pending','active','suspended')),
 expires_at timestamptz not null,
 agreement_reference text not null check (length(agreement_reference) between 3 and 200),
 payment_approved_at timestamptz,
 approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table public.school_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 school_id uuid not null references public.school_licences(id) on delete cascade,
 role text not null check(role in ('student','teacher')),
 joined_at timestamptz not null default now()
);
create index school_memberships_school_role on public.school_memberships(school_id,role);
alter table public.school_licences enable row level security;
alter table public.school_memberships enable row level security;
grant select,insert,update,delete on public.school_licences to authenticated;
grant select on public.school_memberships to authenticated;
create policy "platform admins manage licences" on public.school_licences for all to authenticated using(private.is_platform_admin()) with check(private.is_platform_admin());
create policy "own school membership or platform admin" on public.school_memberships for select to authenticated using(user_id=(select auth.uid()) or private.is_platform_admin());
alter table public.access_invites add column school_id uuid references public.school_licences(id) on delete restrict;
alter table public.access_invites add column school_role text check(school_role in ('student','teacher'));
alter table public.access_invites add constraint school_invite_role check((school_id is null) = (school_role is null));
alter table public.classes add column school_id uuid references public.school_licences(id) on delete restrict;
create index classes_school on public.classes(school_id) where school_id is not null;

create function private.school_access_ok(p_school uuid,p_role text default null) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.school_memberships m join public.school_licences s on s.id=m.school_id
 where m.user_id=(select auth.uid()) and s.id=p_school and (p_role is null or m.role=p_role)
 and s.status='active' and s.payment_approved_at is not null and s.expires_at>now());
$$;
revoke all on function private.school_access_ok(uuid,text) from public,anon;
grant execute on function private.school_access_ok(uuid,text) to authenticated;

-- A verified email accepts its pre-approved role; client metadata never grants teaching rights.
create function public.school_access() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); inv public.access_invites; member public.school_memberships; school public.school_licences; mail text; confirmed timestamptz;
begin
 if u is null then return null; end if;
 select lower(email),email_confirmed_at into mail,confirmed from auth.users where id=u;
 select * into member from public.school_memberships where user_id=u;
 if member.user_id is null then
  select * into inv from public.access_invites where email=mail and school_id is not null;
  if inv.school_id is null then return null; end if;
  select * into school from public.school_licences where id=inv.school_id for update;
  if confirmed is not null and school.status='active' and school.payment_approved_at is not null and school.expires_at>now() then
   if inv.school_role='student' and (select count(*) from public.school_memberships where school_id=school.id and role='student')>=school.seats then
    return jsonb_build_object('id',school.id,'name',school.name,'role',inv.school_role,'active',false,'status','full','expiresAt',school.expires_at);
   end if;
   insert into public.school_memberships(user_id,school_id,role) values(u,school.id,inv.school_role) on conflict do nothing;
   select * into member from public.school_memberships where user_id=u;
   insert into public.private_school(user_id,school_name,updated_at) values(u,school.name,now()) on conflict(user_id) do update set school_name=excluded.school_name,updated_at=excluded.updated_at;
  else
   return jsonb_build_object('id',school.id,'name',school.name,'role',inv.school_role,'active',false,'status',case when confirmed is null then 'verify-email' else school.status end,'expiresAt',school.expires_at);
  end if;
 end if;
 select * into school from public.school_licences where id=member.school_id;
 return jsonb_build_object('id',school.id,'name',school.name,'role',member.role,'active',private.school_access_ok(school.id,member.role),'status',school.status,'expiresAt',school.expires_at);
end;
$$;
revoke all on function public.school_access() from public,anon;
grant execute on function public.school_access() to authenticated;

create function private.bind_school_class() returns trigger
language plpgsql security definer set search_path='' as $$
declare school uuid;
begin
 if private.is_platform_admin() then return new; end if;
 select school_id into school from public.school_memberships where user_id=(select auth.uid()) and role='teacher';
 if school is null or not private.school_access_ok(school,'teacher') then raise exception 'school_licence_required'; end if;
 new.school_id:=school;
 select name into new.school from public.school_licences where id=school;
 return new;
end;
$$;
create trigger bind_school_class before insert on public.classes for each row execute function private.bind_school_class();

create function private.guard_school_join() returns trigger
language plpgsql security definer set search_path='' as $$
declare school uuid;
begin
 select school_id into school from public.classes where id=new.class_id;
 if school is not null and (new.user_id<>(select auth.uid()) or not private.school_access_ok(school,'student')) then raise exception 'school_licence_required'; end if;
 return new;
end;
$$;
create trigger guard_school_join before insert on public.class_members for each row execute function private.guard_school_join();

create or replace function private.owns_class(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.classes where id=c and owner_id=(select auth.uid()) and (school_id is null or private.school_access_ok(school_id,'teacher')));
$$;
create or replace function private.in_class(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.class_members m join public.classes cl on cl.id=m.class_id where m.class_id=c and m.user_id=(select auth.uid()) and (cl.school_id is null or private.school_access_ok(cl.school_id,'student')));
$$;
drop policy "teacher or member reads class" on public.classes;
create policy "teacher or member reads class" on public.classes for select to authenticated using(private.owns_class(id) or private.in_class(id));

-- Serialize submissions so simultaneous first attempts cannot award Clout twice.
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
  perform 1 from public.homework where id=p_homework for update;
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

commit;
