-- A pending/full school invitation must not fall back to an individual game account.
create or replace function private.is_active_member() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and not p.banned)
 and not exists(select 1 from public.school_memberships m where m.user_id=(select auth.uid()) and not private.school_access_ok(m.school_id,m.role))
 and (exists(select 1 from public.school_memberships m where m.user_id=(select auth.uid()) and private.school_access_ok(m.school_id,m.role))
 or not exists(select 1 from auth.users u join public.access_invites i on i.email=lower(u.email) where u.id=(select auth.uid()) and i.school_id is not null));
$$;
