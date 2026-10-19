-- Consumer tiers sit on the existing Stripe billing boundary. A simulation
-- subscription is not a promise of a real placement or employer partnership.
alter table public.billing_accounts add column if not exists tier text not null default 'free'
  check (tier in ('free','plus','plus_experience','schools'));
update public.billing_accounts set tier='plus'
where status in ('active','trialing','past_due') and subscription_id is not null and tier='free';

alter table private.checkout_attempts add column if not exists tier text;
alter table private.checkout_attempts add column if not exists cadence text;

create or replace function public.reserve_subscription_checkout(p_live boolean,p_tier text,p_cadence text,p_trial_days integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); a private.checkout_attempts; b public.billing_accounts;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 if p_tier is null or p_cadence is null or p_trial_days is null or p_tier not in ('plus','plus_experience') or p_cadence not in ('month','year') or p_trial_days not in (0,7) or (p_tier='plus' and p_trial_days<>0) then raise exception 'invalid_plan'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 select * into b from public.billing_accounts where user_id=uid and livemode=p_live for update;
 if b.status in ('active','trialing','past_due','unpaid','paused','incomplete') then raise exception 'existing_subscription'; end if;
 select * into a from private.checkout_attempts where user_id=uid and livemode=p_live for update;
 if a.attempt_id is null or a.created_at < now()-interval '31 minutes' or a.tier is distinct from p_tier or a.cadence is distinct from p_cadence then
   insert into private.checkout_attempts(user_id,livemode,trial,tier,cadence)
   values(uid,p_live,p_trial_days=7 and not coalesce(b.trial_used,false) and b.subscription_id is null,p_tier,p_cadence)
   on conflict(user_id,livemode) do update set attempt_id=gen_random_uuid(),created_at=now(),trial=excluded.trial,tier=excluded.tier,cadence=excluded.cadence returning * into a;
 end if;
 if p_trial_days=7 and not a.trial then raise exception 'trial_unavailable'; end if;
 return jsonb_build_object('id',a.attempt_id,'trial',a.trial);
end;
$$;
revoke all on function public.reserve_subscription_checkout(boolean,text,text,integer) from public,anon;
grant execute on function public.reserve_subscription_checkout(boolean,text,text,integer) to authenticated;

-- New webhook signature records the specific paid tier while preserving the
-- existing premium flag consumed by legacy features.
create or replace function public.sync_billing_account(p_user uuid,p_live boolean,p_customer text,p_subscription text,p_status text,p_end timestamptz,p_trial_end timestamptz,p_cancel boolean,p_paid_at timestamptz,p_tier text,p_secret text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare b public.billing_accounts;
begin
 if not coalesce(private.billing_secret_ok(p_secret),false) then raise exception 'forbidden'; end if;
 if p_status not in ('active','trialing','past_due','unpaid','paused','incomplete','incomplete_expired','canceled') then raise exception 'invalid_status'; end if;
 if p_tier is null or p_tier not in ('plus','plus_experience') then raise exception 'invalid_tier'; end if;
 perform pg_advisory_xact_lock(hashtext(p_user::text));
 select * into b from public.billing_accounts where user_id=p_user and livemode=p_live for update;
 if b.customer_id is distinct from p_customer then raise exception 'customer_mismatch'; end if;
 if b.subscription_id is not null and b.subscription_id <> p_subscription and b.status in ('active','trialing','past_due','unpaid','paused','incomplete') then return false; end if;
 update public.billing_accounts set subscription_id=p_subscription,status=p_status,period_end=p_end,trial_end=p_trial_end,
  trial_used=trial_used or p_trial_end is not null,cancel_at_period_end=p_cancel,
  last_paid_at=greatest(last_paid_at,p_paid_at),tier=case when p_status in ('active','trialing','past_due') then p_tier else 'free' end,updated_at=now()
  where user_id=p_user and livemode=p_live;
 if p_live then
  insert into public.subscriptions(user_id,plan,status,stripe_customer_id,stripe_subscription_id,current_period_end)
  values(p_user,case when p_status in ('active','trialing','past_due') then 'premium' else 'free' end,p_status,p_customer,p_subscription,p_end)
  on conflict(user_id) do update set plan=excluded.plan,status=excluded.status,stripe_customer_id=excluded.stripe_customer_id,
   stripe_subscription_id=excluded.stripe_subscription_id,current_period_end=excluded.current_period_end,updated_at=now();
 end if;
 return true;
end;
$$;
revoke all on function public.sync_billing_account(uuid,boolean,text,text,text,timestamptz,timestamptz,boolean,timestamptz,text,text) from public;
grant execute on function public.sync_billing_account(uuid,boolean,text,text,text,timestamptz,timestamptz,boolean,timestamptz,text,text) to anon,authenticated;

-- Keep workplace simulations visible for everyone, but require Plus+ Experience
-- (including its seven-day trial) before a learner can apply or earn a record.
create or replace function private.require_career_experience() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if not exists (
   select 1 from public.billing_accounts b
   where b.user_id=coalesce(new.user_id,(select auth.uid())) and b.livemode
     and b.tier='plus_experience' and b.status in ('active','trialing','past_due')
     and (b.period_end is null or b.period_end>now())
 ) then raise exception 'career_subscription_required'; end if;
 return new;
end;
$$;
revoke all on function private.require_career_experience() from public,anon,authenticated;
drop trigger if exists career_interviews_subscription on public.career_interviews;
create trigger career_interviews_subscription before insert on public.career_interviews
for each row execute function private.require_career_experience();
drop trigger if exists career_shifts_subscription on public.career_shifts;
create trigger career_shifts_subscription before insert on public.career_shifts
for each row execute function private.require_career_experience();
