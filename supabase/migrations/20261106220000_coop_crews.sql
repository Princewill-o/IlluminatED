-- Co-op jobs: up to four players form a crew for one practical role. Each member's own jobs are
-- still paid by role_job_finish; a finished job can then be credited to the crew once. When the crew
-- has at least two members who each did a job, and has done two jobs per member, every member who
-- contributed gets a team bonus once. Credits only count claims the server already paid, finished
-- after the crew was formed, for the crew's role, so contributions can't be faked.
create table if not exists private.coop_crews (
  id uuid primary key default gen_random_uuid(),
  role text not null references private.role_pay (role),
  host uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create table if not exists private.coop_members (
  crew uuid not null references private.coop_crews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  jobs integer not null default 0,
  bonus integer not null default 0,
  primary key (crew, user_id)
);
create table if not exists private.coop_credits (
  claim uuid primary key references private.role_job_claims (id) on delete cascade,
  crew uuid not null references private.coop_crews (id) on delete cascade
);
create index if not exists coop_members_user on private.coop_members (user_id, joined_at desc);

create or replace function private.coop_status(p_crew uuid, p_uid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'crew', c.id, 'role', c.role, 'paid', c.paid_at is not null,
    'members', (select count(*) from private.coop_members m where m.crew = c.id),
    'jobs', (select coalesce(sum(m.jobs), 0) from private.coop_members m where m.crew = c.id),
    'target', greatest(2, (select count(*) from private.coop_members m where m.crew = c.id)) * 2,
    'mine', (select m.jobs from private.coop_members m where m.crew = c.id and m.user_id = p_uid),
    'bonus', (select m.bonus from private.coop_members m where m.crew = c.id and m.user_id = p_uid),
    'open', c.paid_at is null and c.created_at > now() - interval '45 minutes'
  ) from private.coop_crews c where c.id = p_crew;
$$;
revoke all on function private.coop_status(uuid, uuid) from public, anon, authenticated;

create or replace function public.coop_create(p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); rp private.role_pay; crew uuid;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into rp from private.role_pay where role = p_role;
  if not found then raise exception 'unknown_role'; end if;
  if rp.plus and not private.has_plus_experience(uid) then raise exception 'plus_required'; end if;
  if (select count(*) from private.coop_crews where host = uid and created_at > now() - interval '10 minutes') >= 3 then raise exception 'rate_limited'; end if;
  insert into private.coop_crews (role, host) values (p_role, uid) returning id into crew;
  insert into private.coop_members (crew, user_id) values (crew, uid);
  return private.coop_status(crew, uid);
end;
$$;

create or replace function public.coop_join(p_crew uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c private.coop_crews; rp private.role_pay;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_crew::text, 733));
  select * into c from private.coop_crews where id = p_crew;
  if not found or c.paid_at is not null or c.created_at < now() - interval '45 minutes' then raise exception 'crew_closed'; end if;
  select * into rp from private.role_pay where role = c.role;
  if rp.plus and not private.has_plus_experience(uid) then raise exception 'plus_required'; end if;
  if not exists (select 1 from private.coop_members where crew = c.id and user_id = uid) then
    if (select count(*) from private.coop_members where crew = c.id) >= 4 then raise exception 'crew_full'; end if;
    insert into private.coop_members (crew, user_id) values (c.id, uid);
  end if;
  return private.coop_status(c.id, uid);
end;
$$;

-- Credit one of your paid jobs to your crew. Pays the team bonus once when the crew target is met.
create or replace function public.coop_credit(p_crew uuid, p_claim uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid()); c private.coop_crews; cl private.role_job_claims;
  members integer; workers integer; total integer; v_bonus integer; rp private.role_pay; m record;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_crew::text, 733));
  select * into c from private.coop_crews where id = p_crew for update;
  if not found or not exists (select 1 from private.coop_members where crew = c.id and user_id = uid) then raise exception 'invalid'; end if;
  select * into cl from private.role_job_claims where id = p_claim and user_id = uid;
  if not found or cl.finished_at is null or cl.role <> c.role or cl.finished_at < c.created_at then raise exception 'invalid'; end if;
  if c.paid_at is null and c.created_at > now() - interval '45 minutes'
     and not exists (select 1 from private.coop_credits where claim = cl.id) then
    insert into private.coop_credits (claim, crew) values (cl.id, c.id);
    update private.coop_members set jobs = jobs + 1 where crew = c.id and user_id = uid;
    select count(*), count(*) filter (where jobs > 0), coalesce(sum(jobs), 0) into members, workers, total from private.coop_members where crew = c.id;
    if members >= 2 and workers >= 2 and total >= greatest(2, members) * 2 then
      select * into rp from private.role_pay where role = c.role;
      v_bonus := round(rp.min_pay * 0.6 + 10);
      update private.coop_crews set paid_at = now() where id = c.id;
      for m in select user_id from private.coop_members where crew = c.id and jobs > 0 loop
        update private.coop_members set bonus = v_bonus where crew = c.id and user_id = m.user_id;
        insert into public.player_stats (user_id, clout) values (m.user_id, v_bonus)
        on conflict (user_id) do update set clout = public.player_stats.clout + excluded.clout, updated_at = now();
        insert into public.role_careers (user_id, role, xp) values (m.user_id, c.role, 15)
        on conflict (user_id, role) do update set xp = public.role_careers.xp + 15, updated_at = now();
      end loop;
    end if;
  end if;
  return private.coop_status(c.id, uid);
end;
$$;

create or replace function public.coop_get(p_crew uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not exists (select 1 from private.coop_members where crew = p_crew and user_id = uid) then raise exception 'invalid'; end if;
  return private.coop_status(p_crew, uid);
end;
$$;

revoke all on function public.coop_create(text) from public, anon;
revoke all on function public.coop_join(uuid) from public, anon;
revoke all on function public.coop_credit(uuid, uuid) from public, anon;
revoke all on function public.coop_get(uuid) from public, anon;
grant execute on function public.coop_create(text) to authenticated;
grant execute on function public.coop_join(uuid) to authenticated;
grant execute on function public.coop_credit(uuid, uuid) to authenticated;
grant execute on function public.coop_get(uuid) to authenticated;
