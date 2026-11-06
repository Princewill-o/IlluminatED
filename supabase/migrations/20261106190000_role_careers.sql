-- Practical role jobs (src/game/core/roles.ts): per-role career XP and verified, server-paid jobs.
-- A job is claimed with role_job_start (server time recorded), then finished once with role_job_finish.
-- The server sets the pay from the role's range, the job's size and the accuracy, enforces a minimum
-- working time per step, rejects duplicate claims and caps daily earnings.

create table if not exists public.role_careers (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role ~ '^[a-z-]{2,30}$'),
  xp integer not null default 0 check (xp >= 0),
  jobs integer not null default 0 check (jobs >= 0),
  clout_earned integer not null default 0,
  best_accuracy numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.role_careers enable row level security;
create policy "read own role careers" on public.role_careers for select to authenticated using (user_id = (select auth.uid()));

create table if not exists private.role_pay (
  role text primary key,
  min_pay integer not null,
  max_pay integer not null
);
insert into private.role_pay (role, min_pay, max_pay) values
  ('pizza-chef', 25, 40), ('delivery-driver', 35, 60), ('cashier', 15, 25), ('stocker', 10, 30),
  ('mechanic', 50, 100), ('doctor', 40, 90), ('nurse', 20, 50), ('police', 30, 90),
  ('firefighter', 50, 100), ('builder', 75, 150), ('cleaner', 10, 20), ('barber', 25, 50),
  ('teacher', 30, 60), ('bus-driver', 40, 80), ('taxi-driver', 25, 60), ('gardener', 20, 60),
  ('warehouse', 20, 50), ('waiter', 15, 40), ('fisher', 15, 70), ('security', 20, 60)
on conflict (role) do update set min_pay = excluded.min_pay, max_pay = excluded.max_pay;

create table if not exists private.role_job_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  pay integer,
  xp integer
);
create index if not exists role_job_claims_user_time on private.role_job_claims (user_id, started_at desc);

create or replace function public.role_job_start(p_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); claim uuid; recent integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if not exists (select 1 from private.role_pay where role = p_role) then raise exception 'unknown_role'; end if;
  select count(*) into recent from private.role_job_claims where user_id = uid and started_at > now() - interval '1 minute';
  if recent >= 6 then raise exception 'rate_limited'; end if;
  insert into private.role_job_claims (user_id, role) values (uid, p_role) returning id into claim;
  return claim;
end;
$$;

create or replace function public.role_job_finish(p_claim uuid, p_steps integer, p_accuracy numeric) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  c private.role_job_claims;
  rp private.role_pay;
  acc numeric;
  size numeric;
  v_pay integer;
  v_xp integer;
  today integer;
  rc public.role_careers;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 719));
  select * into c from private.role_job_claims where id = p_claim and user_id = uid for update;
  if not found then raise exception 'invalid'; end if;
  if c.finished_at is not null then raise exception 'already_claimed'; end if;
  if c.started_at < now() - interval '2 hours' then raise exception 'expired'; end if;
  if p_steps is null or p_steps not between 3 and 14 then raise exception 'invalid'; end if;
  -- Real work takes time: at least three seconds per step.
  if now() - c.started_at < make_interval(secs => p_steps * 3) then raise exception 'too_fast'; end if;
  select * into rp from private.role_pay where role = c.role;
  acc := greatest(0, least(1, coalesce(p_accuracy, 0)));
  size := least(1, greatest(0, (p_steps - 3)::numeric / 9));
  v_pay := case when acc < 0.4 then round(rp.min_pay * acc) else round(rp.min_pay + (rp.max_pay - rp.min_pay) * acc * (0.45 + 0.55 * size)) end;
  v_xp := 8 + round(14 * acc) + p_steps;
  select coalesce(sum(cl.pay), 0) into today from private.role_job_claims cl where cl.user_id = uid and cl.finished_at > now() - interval '1 day';
  if today >= 1200 then v_pay := 0; elsif today + v_pay > 1200 then v_pay := 1200 - today; end if;
  update private.role_job_claims set finished_at = now(), pay = v_pay, xp = v_xp where id = c.id;
  insert into public.role_careers (user_id, role, xp, jobs, clout_earned, best_accuracy)
  values (uid, c.role, v_xp, 1, v_pay, acc)
  on conflict (user_id, role) do update set xp = public.role_careers.xp + excluded.xp, jobs = public.role_careers.jobs + 1,
    clout_earned = public.role_careers.clout_earned + excluded.clout_earned,
    best_accuracy = greatest(public.role_careers.best_accuracy, excluded.best_accuracy), updated_at = now()
  returning * into rc;
  if v_pay > 0 then
    insert into public.player_stats (user_id, clout) values (uid, v_pay)
    on conflict (user_id) do update set clout = public.player_stats.clout + excluded.clout, updated_at = now();
  end if;
  return jsonb_build_object('pay', v_pay, 'xp', v_xp, 'total_xp', rc.xp, 'jobs', rc.jobs, 'capped', today >= 1200);
end;
$$;

revoke all on function public.role_job_start(text) from public, anon;
revoke all on function public.role_job_finish(uuid, integer, numeric) from public, anon;
grant execute on function public.role_job_start(text) to authenticated;
grant execute on function public.role_job_finish(uuid, integer, numeric) to authenticated;
