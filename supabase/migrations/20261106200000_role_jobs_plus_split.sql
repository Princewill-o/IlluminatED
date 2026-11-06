-- Local and automotive roles are free for every member; professional roles need Plus Experience,
-- like the workplace careers.
alter table private.role_pay add column if not exists plus boolean not null default false;
update private.role_pay set plus = role in ('doctor', 'nurse', 'police', 'firefighter', 'builder', 'teacher');

create or replace function private.has_plus_experience(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.billing_accounts b
    where b.user_id = p_user and b.tier = 'plus_experience' and b.status in ('active', 'trialing', 'past_due')
      and (b.period_end is null or b.period_end > now())
  );
$$;

create or replace function public.role_job_start(p_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); claim uuid; recent integer; rp private.role_pay;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into rp from private.role_pay where role = p_role;
  if not found then raise exception 'unknown_role'; end if;
  if rp.plus and not private.has_plus_experience(uid) then raise exception 'plus_required'; end if;
  select count(*) into recent from private.role_job_claims where user_id = uid and started_at > now() - interval '1 minute';
  if recent >= 6 then raise exception 'rate_limited'; end if;
  insert into private.role_job_claims (user_id, role) values (uid, p_role) returning id into claim;
  return claim;
end;
$$;
revoke all on function public.role_job_start(text) from public, anon;
grant execute on function public.role_job_start(text) to authenticated;
