-- Expired school membership cannot call game/homework RPCs as an active member.
create or replace function private.is_active_member() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and not p.banned)
 and not exists(select 1 from public.school_memberships m where m.user_id=(select auth.uid()) and not private.school_access_ok(m.school_id,m.role));
$$;
create or replace function private.owns_class(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_active_member() and exists(select 1 from public.classes where id=c and owner_id=(select auth.uid()) and (school_id is null or private.school_access_ok(school_id,'teacher')));
$$;
create or replace function private.in_class(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_active_member() and exists(select 1 from public.class_members m join public.classes cl on cl.id=m.class_id where m.class_id=c and m.user_id=(select auth.uid()) and (cl.school_id is null or private.school_access_ok(cl.school_id,'student')));
$$;
revoke all on function private.bind_school_class(),private.guard_school_join() from public,anon,authenticated;
revoke all on public.classes, public.class_members, public.homework, public.homework_submissions from anon;
grant select on public.classes, public.class_members, public.homework, public.homework_submissions to authenticated;
