-- IlluminatED: Ask Tiggy (AI study helper) and Premium subscriptions.
-- Run after 0005_tutoring_flow.sql. Safe to run more than once.
--
-- Nothing here stores what learners type to Tiggy. We keep only:
--   * how many messages each person has sent today (for the daily limit), and
--   * a category-only safeguarding flag when a message suggests someone may be at risk.
--
-- As in 0005, the app never uses the service role key. The Stripe webhook writes
-- subscriptions through public.set_subscription, which checks the shared secret in
-- private.app_secrets ('payment_callback_secret', the same value as PAYMENT_CALLBACK_SECRET).

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

-- Daily limits reset at midnight UK time.
create or replace function private.london_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/London')::date;
$$;

-- ─────────────────────────────────────────────────────────────
-- Subscriptions (one row per member; written only by the Stripe webhook)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.subscriptions (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  plan                    text not null default 'free' check (plan in ('free', 'premium')),
  status                  text not null default 'inactive' check (char_length(status) between 1 and 40),
  stripe_customer_id      text check (stripe_customer_id is null or char_length(stripe_customer_id) <= 255),
  stripe_subscription_id  text check (stripe_subscription_id is null or char_length(stripe_subscription_id) <= 255),
  current_period_end      timestamptz,
  updated_at              timestamptz not null default now()
);
create index if not exists subscriptions_stripe_sub on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.subscriptions enable row level security;
drop policy if exists "own subscription readable" on public.subscriptions;
create policy "own subscription readable" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
-- No insert, update or delete for anyone but the owner role: browsers can only read their own row.
revoke all on public.subscriptions from public, anon, authenticated;
grant select on public.subscriptions to authenticated;

-- The plan a member is on right now, decided only from the subscriptions table.
-- past_due keeps Premium during Stripe's retry period; a short grace covers webhook delays.
create or replace function private.tiggy_plan(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when exists (
    select 1 from public.subscriptions s
     where s.user_id = uid
       and s.plan = 'premium'
       and s.status in ('active', 'trialing', 'past_due')
       and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')
  ) then 'premium' else 'free' end;
$$;

create or replace function private.tiggy_limit(plan text) returns integer
language sql immutable set search_path = '' as $$
  select case when plan = 'premium' then 200 else 15 end;
$$;

revoke all on function private.london_today(), private.tiggy_plan(uuid), private.tiggy_limit(text)
  from public, anon, authenticated;

-- Called by the Stripe webhook (no user session). Only valid with the shared secret.
-- Returns true if the row was written.
create or replace function public.set_subscription(
  user_id uuid, plan text, status text, customer text, sub_id text, period_end timestamptz, secret text
) returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
begin
  if not private.callback_secret_ok(secret) then raise exception 'forbidden'; end if;
  if user_id is null or plan is null or plan not in ('free', 'premium') then raise exception 'invalid_plan'; end if;
  if status is null or char_length(status) not between 1 and 40 then raise exception 'invalid_status'; end if;
  if char_length(coalesce(customer, '')) > 255 or char_length(coalesce(sub_id, '')) > 255 then
    raise exception 'invalid_reference';
  end if;
  if not exists (select 1 from auth.users u where u.id = user_id) then return false; end if;

  -- A late event about an old subscription must not switch off a newer, active one.
  if plan <> 'premium' and exists (
    select 1 from public.subscriptions s
     where s.user_id = user_id
       and s.stripe_subscription_id is distinct from sub_id
       and s.plan = 'premium'
       and s.status in ('active', 'trialing', 'past_due')
  ) then
    return false;
  end if;

  insert into public.subscriptions as s
         (user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
  values (user_id, plan, status, nullif(customer, ''), nullif(sub_id, ''), period_end, now())
  on conflict on constraint subscriptions_pkey do update
     set plan = excluded.plan,
         status = excluded.status,
         stripe_customer_id = coalesce(excluded.stripe_customer_id, s.stripe_customer_id),
         stripe_subscription_id = coalesce(excluded.stripe_subscription_id, s.stripe_subscription_id),
         current_period_end = excluded.current_period_end,
         updated_at = now();
  return true;
end;
$$;
revoke all on function public.set_subscription(uuid, text, text, text, text, timestamptz, text) from public;
grant execute on function public.set_subscription(uuid, text, text, text, text, timestamptz, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Daily message counts
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tiggy_usage (
  user_id   uuid not null references auth.users (id) on delete cascade,
  day       date not null,
  messages  integer not null default 0 check (messages >= 0),
  primary key (user_id, day)
);
create index if not exists tiggy_usage_day on public.tiggy_usage (day);

alter table public.tiggy_usage enable row level security;
drop policy if exists "own usage readable" on public.tiggy_usage;
create policy "own usage readable" on public.tiggy_usage for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.tiggy_usage from public, anon, authenticated;
grant select on public.tiggy_usage to authenticated;

-- An earlier draft took the limit from the caller. The limit now always comes from the plan.
drop function if exists public.tiggy_consume(integer);

-- Uses one of today's messages. Returns how many are left, or raises 'limit_reached'.
-- The plan and its limit are worked out here, never taken from the browser.
create or replace function public.tiggy_consume() returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  today date := private.london_today();
  lim   integer;
  used  integer;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not private.is_active_member() then raise exception 'not_allowed'; end if;
  lim := private.tiggy_limit(private.tiggy_plan(uid));

  insert into tiggy_usage as u (user_id, day, messages) values (uid, today, 1)
  on conflict (user_id, day) do update set messages = u.messages + 1
   where u.messages < lim
  returning u.messages into used;

  if used is null or used > lim then raise exception 'limit_reached'; end if;

  -- Old counts aren't needed once the day is over. Clear out anything older than a week
  -- (everyone's), once per member per day.
  if used = 1 then
    delete from tiggy_usage where day < today - 7;
  end if;
  return lim - used;
end;
$$;
revoke all on function public.tiggy_consume() from public, anon;
grant execute on function public.tiggy_consume() to authenticated;

-- The caller's plan and today's usage, for the usage meter.
create or replace function public.tiggy_status()
returns table (plan text, used integer, max_per_day integer, remaining integer)
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p   text;
  n   integer;
begin
  if uid is null then return; end if;
  p := private.tiggy_plan(uid);
  select coalesce((select t.messages from tiggy_usage t where t.user_id = uid and t.day = private.london_today()), 0)
    into n;
  return query select p, n, private.tiggy_limit(p), greatest(private.tiggy_limit(p) - n, 0);
end;
$$;
revoke all on function public.tiggy_status() from public, anon;
grant execute on function public.tiggy_status() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Safeguarding flags (category only, never the message text)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tiggy_flags (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  category    text not null check (category in ('self-harm', 'abuse', 'danger', 'crisis'))
);
create index if not exists tiggy_flags_recent on public.tiggy_flags (created_at desc);
create index if not exists tiggy_flags_user on public.tiggy_flags (user_id, created_at desc);

alter table public.tiggy_flags enable row level security;
drop policy if exists "moderators read flags" on public.tiggy_flags;
create policy "moderators read flags" on public.tiggy_flags for select to authenticated
  using ((select private.is_moderator()));
revoke all on public.tiggy_flags from public, anon, authenticated;
grant select on public.tiggy_flags to authenticated;

-- Records a flag for the signed-in caller. At most one per category per hour, and 10 a day,
-- so a repeated message doesn't flood the moderators. Returns true if a new flag was recorded.
create or replace function public.tiggy_flag(category text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if category is null or category not in ('self-harm', 'abuse', 'danger', 'crisis') then
    raise exception 'invalid_category';
  end if;
  if exists (
    select 1 from tiggy_flags f
     where f.user_id = uid and f.category = tiggy_flag.category and f.created_at > now() - interval '1 hour'
  ) or (
    select count(*) from tiggy_flags f where f.user_id = uid and f.created_at > now() - interval '1 day'
  ) >= 10 then
    return false;
  end if;
  insert into tiggy_flags (user_id, category) values (uid, tiggy_flag.category);
  -- Flags are kept for 12 months (see the privacy policy).
  delete from tiggy_flags where created_at < now() - interval '12 months';
  return true;
end;
$$;
revoke all on function public.tiggy_flag(text) from public, anon;
grant execute on function public.tiggy_flag(text) to authenticated;
