-- Hiring for practical roles: a structured panel interview (src/game/core/interview.ts),
-- an offer the player accepts, then the role is theirs. The server issues the seed,
-- enforces a realistic minimum interview length, a cooldown after an unsuccessful one,
-- and only lets you work a role you've been hired for (or already worked before hiring
-- existed).
create table if not exists public.role_hires (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  hired_at timestamptz not null default now(),
  score numeric,
  primary key (user_id, role)
);
alter table public.role_hires enable row level security;
create policy "read own role hires" on public.role_hires for select to authenticated using (user_id = (select auth.uid()));

create table if not exists private.role_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  seed integer not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  passed boolean,
  average numeric,
  accepted_at timestamptz
);
create index if not exists role_interviews_user_time on private.role_interviews (user_id, started_at desc);

create or replace function public.role_interview_start(p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); v_seed integer; v_id uuid;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if not exists (select 1 from private.role_pay where role = p_role) then raise exception 'unknown_role'; end if;
  if exists (select 1 from public.role_hires where user_id = uid and role = p_role) then raise exception 'already_hired'; end if;
  if exists (select 1 from private.role_interviews where user_id = uid and role = p_role and passed = false and finished_at > now() - interval '10 minutes') then raise exception 'cooldown'; end if;
  if (select count(*) from private.role_interviews where user_id = uid and started_at > now() - interval '1 hour') >= 8 then raise exception 'rate_limited'; end if;
  v_seed := 1 + floor(random() * 2000000000)::integer;
  insert into private.role_interviews (user_id, role, seed) values (uid, p_role, v_seed) returning id into v_id;
  return jsonb_build_object('claim', v_id, 'seed', v_seed);
end;
$$;

create or replace function public.role_interview_finish(p_claim uuid, p_seed integer, p_passed boolean, p_average numeric) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c private.role_interviews;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into c from private.role_interviews where id = p_claim and user_id = uid for update;
  if not found or c.seed <> p_seed or p_passed is null then raise exception 'invalid'; end if;
  if c.finished_at is not null then raise exception 'already_claimed'; end if;
  if c.started_at < now() - interval '1 hour' then raise exception 'expired'; end if;
  -- A real interview takes time: at least a minute from signing in.
  if now() - c.started_at < interval '60 seconds' then raise exception 'too_fast'; end if;
  update private.role_interviews set finished_at = now(), passed = p_passed, average = greatest(1, least(7, coalesce(p_average, 1))) where id = c.id;
  return jsonb_build_object('passed', p_passed);
end;
$$;

create or replace function public.role_offer_accept(p_claim uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c private.role_interviews;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into c from private.role_interviews where id = p_claim and user_id = uid for update;
  if not found or c.passed is not true then raise exception 'invalid'; end if;
  if c.finished_at < now() - interval '1 day' then raise exception 'expired'; end if;
  update private.role_interviews set accepted_at = coalesce(accepted_at, now()) where id = c.id;
  insert into public.role_hires (user_id, role, score) values (uid, c.role, c.average)
  on conflict (user_id, role) do update set score = greatest(public.role_hires.score, excluded.score);
  return jsonb_build_object('role', c.role);
end;
$$;

-- You can only clock in for a role you've been hired for (players who already worked
-- a role before interviews existed keep it).
create or replace function public.role_job_start(p_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); claim uuid; recent integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if not exists (select 1 from private.role_pay where role = p_role) then raise exception 'unknown_role'; end if;
  if not exists (select 1 from public.role_hires where user_id = uid and role = p_role)
     and not exists (select 1 from public.role_careers where user_id = uid and role = p_role) then raise exception 'not_hired'; end if;
  select count(*) into recent from private.role_job_claims where user_id = uid and started_at > now() - interval '1 minute';
  if recent >= 6 then raise exception 'rate_limited'; end if;
  insert into private.role_job_claims (user_id, role) values (uid, p_role) returning id into claim;
  return claim;
end;
$$;

revoke all on function public.role_interview_start(text) from public, anon;
revoke all on function public.role_interview_finish(uuid, integer, boolean, numeric) from public, anon;
revoke all on function public.role_offer_accept(uuid) from public, anon;
grant execute on function public.role_interview_start(text) to authenticated;
grant execute on function public.role_interview_finish(uuid, integer, boolean, numeric) to authenticated;
grant execute on function public.role_offer_accept(uuid) to authenticated;
