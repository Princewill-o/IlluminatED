-- The signed-in learner's current plan, for the plan badge next to the logo:
-- 'plus_experience' | 'plus' | 'schools' | 'free'. A paid tier only counts while
-- its subscription is live; school access comes from an active school membership.
create or replace function public.my_plan() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when (select auth.uid()) is null then null
    when exists (select 1 from public.billing_accounts b where b.user_id = (select auth.uid()) and b.tier = 'plus_experience'
                 and b.status in ('active','trialing','past_due') and (b.period_end is null or b.period_end > now())) then 'plus_experience'
    when exists (select 1 from public.billing_accounts b where b.user_id = (select auth.uid()) and b.tier = 'plus'
                 and b.status in ('active','trialing','past_due') and (b.period_end is null or b.period_end > now())) then 'plus'
    when exists (select 1 from public.school_memberships m where m.user_id = (select auth.uid()) and private.school_access_ok(m.school_id, m.role)) then 'schools'
    else 'free' end;
$$;
grant execute on function public.my_plan() to authenticated;
