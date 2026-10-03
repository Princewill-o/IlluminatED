begin;
create function private.billing_secret_ok(secret text) returns boolean language sql stable security definer set search_path = '' as $$
 select secret is not null and length(secret)>=32 and secret=private.app_setting('billing_callback_secret');
$$;
revoke all on function private.billing_secret_ok(text) from public,anon,authenticated;
-- Owner access is a private allowlist, never an editable profile/email claim.
create table private.platform_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table private.platform_admins enable row level security;
revoke all on private.platform_admins from public, anon, authenticated;
create function private.is_platform_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from private.platform_admins where user_id = auth.uid());
$$;
revoke all on function private.is_platform_admin() from public, anon;
grant execute on function private.is_platform_admin() to authenticated;
create function public.platform_admin_status() returns boolean language sql stable security invoker set search_path = '' as $$ select private.is_platform_admin(); $$;
revoke all on function public.platform_admin_status() from public, anon;
grant execute on function public.platform_admin_status() to authenticated;

-- Sandbox records cannot alter production subscription entitlements.
create table public.billing_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  livemode boolean not null,
  customer_id text,
  subscription_id text,
  status text not null default 'inactive',
  period_end timestamptz,
  trial_end timestamptz,
  trial_used boolean not null default false,
  cancel_at_period_end boolean not null default false,
  last_paid_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id, livemode),
  unique(customer_id, livemode)
);
alter table public.billing_accounts enable row level security;
revoke all on public.billing_accounts from public, anon, authenticated;
grant select on public.billing_accounts to authenticated;
create policy "own billing readable" on public.billing_accounts for select to authenticated using (user_id = (select auth.uid()));
insert into public.billing_accounts(user_id,livemode,customer_id,subscription_id,status,period_end,trial_used)
  select user_id,true,stripe_customer_id,stripe_subscription_id,status,current_period_end,stripe_subscription_id is not null from public.subscriptions;

create table private.checkout_attempts (
 user_id uuid references auth.users(id) on delete cascade,
 livemode boolean not null,
 attempt_id uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now(),
 trial boolean not null,
 primary key(user_id,livemode)
);
alter table private.checkout_attempts enable row level security;
revoke all on private.checkout_attempts from public,anon,authenticated;
create function public.reserve_premium_checkout(p_live boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); a private.checkout_attempts; b public.billing_accounts;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 select * into b from public.billing_accounts where user_id=uid and livemode=p_live;
 if b.status in ('active','trialing','past_due','unpaid','paused','incomplete') then raise exception 'existing_subscription'; end if;
 select * into a from private.checkout_attempts where user_id=uid and livemode=p_live;
 if a.attempt_id is null or a.created_at < now()-interval '31 minutes' then
  insert into private.checkout_attempts(user_id,livemode,trial) values(uid,p_live,
    now() < '2026-10-15 23:00:00+00'::timestamptz and not coalesce(b.trial_used,false) and b.subscription_id is null)
  on conflict(user_id,livemode) do update set attempt_id=gen_random_uuid(),created_at=now(),trial=excluded.trial returning * into a;
 end if;
 return jsonb_build_object('id',a.attempt_id,'createdAt',a.created_at,'trial',a.trial);
end;
$$;
revoke all on function public.reserve_premium_checkout(boolean) from public,anon;
grant execute on function public.reserve_premium_checkout(boolean) to authenticated;

create function public.billing_set_customer(p_user uuid,p_live boolean,p_customer text,p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not coalesce(private.billing_secret_ok(p_secret),false) then raise exception 'forbidden'; end if;
 if p_customer is null or p_customer !~ '^cus_[A-Za-z0-9]+$' then raise exception 'invalid_customer'; end if;
 insert into public.billing_accounts(user_id,livemode,customer_id) values(p_user,p_live,p_customer)
 on conflict(user_id,livemode) do update set customer_id=coalesce(public.billing_accounts.customer_id,excluded.customer_id);
end;
$$;
revoke all on function public.billing_set_customer(uuid,boolean,text,text) from public;
grant execute on function public.billing_set_customer(uuid,boolean,text,text) to anon,authenticated;

create function public.sync_billing_account(p_user uuid,p_live boolean,p_customer text,p_subscription text,p_status text,p_end timestamptz,p_trial_end timestamptz,p_cancel boolean,p_paid_at timestamptz,p_secret text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare b public.billing_accounts;
begin
 if not coalesce(private.billing_secret_ok(p_secret),false) then raise exception 'forbidden'; end if;
 if p_status not in ('active','trialing','past_due','unpaid','paused','incomplete','incomplete_expired','canceled') then raise exception 'invalid_status'; end if;
 perform pg_advisory_xact_lock(hashtext(p_user::text));
 select * into b from public.billing_accounts where user_id=p_user and livemode=p_live for update;
 if b.customer_id is distinct from p_customer then raise exception 'customer_mismatch'; end if;
 if b.subscription_id is not null and b.subscription_id <> p_subscription and b.status in ('active','trialing','past_due','unpaid','paused','incomplete') then return false; end if;
 update public.billing_accounts set subscription_id=p_subscription,status=p_status,period_end=p_end,trial_end=p_trial_end,
  trial_used=trial_used or p_trial_end is not null,cancel_at_period_end=p_cancel,
  last_paid_at=greatest(last_paid_at,p_paid_at),updated_at=now() where user_id=p_user and livemode=p_live;
 if p_live then
  insert into public.subscriptions(user_id,plan,status,stripe_customer_id,stripe_subscription_id,current_period_end)
  values(p_user,case when p_status in ('active','trialing','past_due') then 'premium' else 'free' end,p_status,p_customer,p_subscription,p_end)
  on conflict(user_id) do update set plan=excluded.plan,status=excluded.status,stripe_customer_id=excluded.stripe_customer_id,
   stripe_subscription_id=excluded.stripe_subscription_id,current_period_end=excluded.current_period_end,updated_at=now();
 end if;
 return true;
end;
$$;
revoke all on function public.sync_billing_account(uuid,boolean,text,text,text,timestamptz,timestamptz,boolean,timestamptz,text) from public;
grant execute on function public.sync_billing_account(uuid,boolean,text,text,text,timestamptz,timestamptz,boolean,timestamptz,text) to anon,authenticated;

-- Read subscription ownership through the trusted webhook boundary, not user metadata.
create function public.billing_owner(p_customer text,p_live boolean,p_secret text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
 if not coalesce(private.billing_secret_ok(p_secret),false) then raise exception 'forbidden'; end if;
 return (select user_id from public.billing_accounts where customer_id=p_customer and livemode=p_live);
end;
$$;
revoke all on function public.billing_owner(text,boolean,text) from public;
grant execute on function public.billing_owner(text,boolean,text) to anon,authenticated;

create table public.feature_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null default current_date,
 feature text not null check(feature in ('courses','quizzes','flashcards','revision','resources','tiggy','jobs','next-steps','premium','billing','social')),
 views integer not null default 1 check(views between 1 and 1000),
 last_at timestamptz not null default now(),
 primary key(user_id,day,feature)
);
create index feature_usage_recent on public.feature_usage(day);
alter table public.feature_usage enable row level security;
revoke all on public.feature_usage from public,anon,authenticated;
grant select on public.feature_usage to authenticated;
create policy "own feature counts" on public.feature_usage for select to authenticated using(user_id=(select auth.uid()));
create function public.record_feature_use(p_feature text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 insert into public.feature_usage(user_id,day,feature) values(auth.uid(),private.london_today(),p_feature)
 on conflict(user_id,day,feature) do update set views=public.feature_usage.views+1,last_at=now()
 where public.feature_usage.last_at<now()-interval '1 minute' and public.feature_usage.views<1000;
 delete from public.feature_usage where day<current_date-90;
end;
$$;
revoke all on function public.record_feature_use(text) from public,anon;
grant execute on function public.record_feature_use(text) to authenticated;

alter table public.contact_messages drop constraint contact_messages_topic_check;
alter table public.contact_messages add constraint contact_messages_topic_check check(topic in ('general','account','correction','safeguarding','tutoring','privacy','billing'));
create function public.platform_admin_overview(p_page integer default 0,p_search text default '') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not private.is_platform_admin() then raise exception 'forbidden'; end if;
 if p_page<0 or p_page>100000 or char_length(p_search)>100 then raise exception 'invalid_filter'; end if;
 select jsonb_build_object(
 'totals',(select jsonb_build_object('users',count(*),'premium',count(*) filter(where private.tiggy_plan(u.id)='premium'),
  'trial',count(*) filter(where b.status='trialing'),'paying',count(*) filter(where b.status='active' and b.last_paid_at is not null),
  'paymentIssues',count(*) filter(where b.status in ('past_due','unpaid')),'new30',count(*) filter(where u.created_at>now()-interval '30 days'))
  from auth.users u left join public.billing_accounts b on b.user_id=u.id and b.livemode),
 'users',coalesce((select jsonb_agg(x) from (select u.id,u.email,u.created_at,p.username,
  private.tiggy_plan(u.id) as plan,coalesce(b.status,'inactive') as billing_status,b.trial_end,b.last_paid_at,
  (select coalesce(sum(q.seen),0) from public.question_progress q where q.user_id=u.id) as answers,
  (select case when sum(q.seen)>0 then round(100.0*sum(q.correct)/sum(q.seen)) else null end from public.question_progress q where q.user_id=u.id) as accuracy
  from auth.users u left join public.profiles p on p.id=u.id left join public.billing_accounts b on b.user_id=u.id and b.livemode
  where p_search='' or u.email ilike '%'||p_search||'%' or p.username ilike '%'||p_search||'%'
  order by u.created_at desc,u.id limit 50 offset p_page*50) x),'[]'::jsonb),
 'features',coalesce((select jsonb_agg(x) from (select feature,sum(views) as views,count(distinct user_id) as users from public.feature_usage where day>=current_date-30 group by feature order by sum(views) desc) x),'[]'::jsonb),
 'courses',coalesce((select jsonb_agg(x) from (select course_id,count(distinct user_id) as users,sum(seen) as answers,case when sum(seen)>0 then round(100.0*sum(correct)/sum(seen)) else null end as accuracy from public.question_progress group by course_id) x),'[]'::jsonb),
 'support',coalesce((select jsonb_agg(x) from (select id,created_at,email,topic,message,status from public.contact_messages where topic='billing' order by created_at desc limit 50) x),'[]'::jsonb),
 'sandboxSubscriptions',(select count(*) from public.billing_accounts where not livemode and subscription_id is not null),
 'usageSince',(select min(day) from public.feature_usage),
 'quizRounds30',(select count(*) from public.quiz_rounds where created_at>now()-interval '30 days'),
 'tiggyMessages7',(select coalesce(sum(messages),0) from public.tiggy_usage where day>=current_date-7)
 ) into result;
 return result;
end;
$$;
revoke all on function public.platform_admin_overview(integer,text) from public,anon;
grant execute on function public.platform_admin_overview(integer,text) to authenticated;
create function public.platform_resolve_support(p_id bigint) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not private.is_platform_admin() then raise exception 'forbidden'; end if;
 update public.contact_messages set status='handled',handled_by=auth.uid() where id=p_id and topic='billing';
end;
$$;
revoke all on function public.platform_resolve_support(bigint) from public,anon;
grant execute on function public.platform_resolve_support(bigint) to authenticated;
commit;
