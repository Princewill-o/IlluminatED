-- Platform owners receive Premium access without creating a fake Stripe charge.
-- Their allowlist row is private and managed by the database, never by the client.
create or replace function private.tiggy_plan(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when exists (
    select 1 from private.platform_admins a where a.user_id = uid
  ) or exists (
    select 1 from public.subscriptions s
     where s.user_id = uid
       and s.plan = 'premium'
       and s.status in ('active', 'trialing', 'past_due')
       and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')
  ) then 'premium' else 'free' end;
$$;
