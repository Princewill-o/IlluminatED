-- Careers and homes: real jobs in IlluminatED London, wages in Clout, a skills
-- ledger for CVs, and homes you can buy and furnish. Additive only.
-- Design: src/game/core/careers.ts and src/game/core/homes.ts (rates and prices
-- here must match; tests/game-core.test.mjs checks).

-- ── Catalogue (read-only for players) ──────────────────────────────────────
create table public.career_roles (
  workplace text not null,
  role      text not null,
  rank      smallint not null check (rank between 1 and 3),
  pay       integer not null check (pay between 1 and 1000),
  primary key (workplace, role),
  unique (workplace, rank)
);
insert into public.career_roles (workplace, role, rank, pay) values
  ('pizzazz', 'crew', 1, 60),
  ('pizzazz', 'shift-lead', 2, 90),
  ('pizzazz', 'manager', 3, 135),
  ('goggle', 'junior-dev', 1, 80),
  ('goggle', 'developer', 2, 120),
  ('goggle', 'eng-manager', 3, 176),
  ('macrosoft', 'it-tech', 1, 70),
  ('macrosoft', 'sysadmin', 2, 105),
  ('macrosoft', 'it-manager', 3, 160),
  ('barklays', 'teller', 1, 70),
  ('barklays', 'analyst', 2, 110),
  ('barklays', 'branch-manager', 3, 165),
  ('st-plasters', 'receptionist', 1, 65),
  ('st-plasters', 'hca', 2, 98),
  ('st-plasters', 'ward-manager', 3, 150),
  ('tescow', 'cashier', 1, 60),
  ('tescow', 'stock-controller', 2, 90),
  ('tescow', 'store-manager', 3, 140),
  ('lawz', 'legal-admin', 1, 70),
  ('lawz', 'paralegal', 2, 110),
  ('lawz', 'practice-manager', 3, 165),
  ('netflics', 'social-assistant', 1, 65),
  ('netflics', 'marketing-exec', 2, 100),
  ('netflics', 'marketing-manager', 3, 155);

create table public.home_types (
  id    text primary key,
  price integer not null check (price >= 0)
);
insert into public.home_types (id, price) values
  ('studio', 0),
  ('terrace', 2500),
  ('loft', 8000);

create table public.furniture_items (
  id      text primary key,
  price   integer not null check (price >= 0),
  w       smallint not null check (w between 1 and 6),
  h       smallint not null check (h between 1 and 6),
  starter boolean not null default false
);
insert into public.furniture_items (id, price, w, h, starter) values
  ('bed', 0, 4, 4, true),
  ('wardrobe', 0, 3, 1, true),
  ('shelf', 0, 3, 1, true),
  ('desk', 0, 4, 2, true),
  ('tv', 0, 4, 1, true),
  ('sofa', 0, 4, 2, true),
  ('table', 0, 3, 2, true),
  ('petbed', 0, 2, 2, true),
  ('plant', 0, 1, 1, true),
  ('lamp', 0, 1, 1, true),
  ('armchair', 300, 2, 2, false),
  ('beanbag', 250, 2, 2, false),
  ('rug', 200, 3, 3, false),
  ('fridge', 500, 2, 1, false),
  ('fishtank', 800, 3, 1, false),
  ('gaming', 900, 3, 2, false),
  ('telescope', 1200, 1, 1, false),
  ('trophies', 1500, 3, 1, false),
  ('piano', 2500, 3, 2, false),
  ('arcade', 3000, 2, 1, false);

alter table public.career_roles enable row level security;
alter table public.home_types enable row level security;
alter table public.furniture_items enable row level security;
revoke all on public.career_roles, public.home_types, public.furniture_items from public, anon, authenticated;
grant select on public.career_roles, public.home_types, public.furniture_items to anon, authenticated;
create policy "catalogue readable" on public.career_roles for select using (true);
create policy "catalogue readable" on public.home_types for select using (true);
create policy "catalogue readable" on public.furniture_items for select using (true);

-- ── Jobs, shifts and skills ─────────────────────────────────────────────────
create table public.career_jobs (
  user_id        uuid not null references auth.users (id) on delete cascade,
  workplace      text not null,
  role           text not null,
  rank           smallint not null default 1 check (rank between 1 and 3),
  status         text not null default 'active' check (status in ('active', 'left')),
  shifts         integer not null default 0,
  correct        integer not null default 0,
  total          integer not null default 0,
  rank_shifts    integer not null default 0,
  rank_correct   integer not null default 0,
  rank_total     integer not null default 0,
  hired_at       timestamptz not null default now(),
  last_shift_at  timestamptz,
  primary key (user_id, workplace),
  foreign key (workplace, role) references public.career_roles (workplace, role)
);
create unique index career_one_active_job on public.career_jobs (user_id) where status = 'active';

create table public.career_shifts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  workplace   text not null,
  role        text not null,
  seed        integer not null,
  correct     smallint not null,
  total       smallint not null,
  pay         integer not null,
  duration_ms integer not null,
  created_at  timestamptz not null default now()
);
create index career_shifts_user on public.career_shifts (user_id, created_at desc);

create table public.career_skills (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill   text not null check (skill ~ '^[a-z-]{2,40}$'),
  correct integer not null default 0,
  total   integer not null default 0,
  primary key (user_id, skill)
);

create table public.career_interviews (
  user_id    uuid not null references auth.users (id) on delete cascade,
  workplace  text not null,
  passed     boolean not null,
  created_at timestamptz not null default now()
);
create index career_interviews_user on public.career_interviews (user_id, workplace, created_at desc);

alter table public.career_jobs enable row level security;
alter table public.career_shifts enable row level security;
alter table public.career_skills enable row level security;
alter table public.career_interviews enable row level security;
revoke all on public.career_jobs, public.career_shifts, public.career_skills, public.career_interviews from public, anon, authenticated;
grant select on public.career_jobs, public.career_shifts, public.career_skills, public.career_interviews to authenticated;
create policy "own jobs" on public.career_jobs for select to authenticated using (user_id = (select auth.uid()));
create policy "own shifts" on public.career_shifts for select to authenticated using (user_id = (select auth.uid()));
create policy "own skills" on public.career_skills for select to authenticated using (user_id = (select auth.uid()));
create policy "own interviews" on public.career_interviews for select to authenticated using (user_id = (select auth.uid()));

-- Interview: scored in the browser (3 questions), checked for sanity here.
create or replace function public.career_interview(p_workplace text, p_correct integer, p_duration_ms integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  r public.career_roles;
  passed boolean;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into r from public.career_roles where workplace = p_workplace and rank = 1;
  if not found then raise exception 'unknown_workplace'; end if;
  if p_correct is null or p_correct not between 0 and 3 or p_duration_ms is null or p_duration_ms < 6000 then raise exception 'invalid'; end if;
  if exists (select 1 from public.career_interviews i where i.user_id = uid and i.workplace = p_workplace and not i.passed and i.created_at > now() - interval '10 minutes') then
    raise exception 'cooldown';
  end if;
  if exists (select 1 from public.career_jobs j where j.user_id = uid and j.workplace = p_workplace and j.status = 'active') then raise exception 'already_hired'; end if;
  passed := p_correct >= 2;
  insert into public.career_interviews (user_id, workplace, passed) values (uid, p_workplace, passed);
  if passed then
    -- One job at a time: hand in your notice at the old one.
    update public.career_jobs set status = 'left' where user_id = uid and status = 'active';
    insert into public.career_jobs (user_id, workplace, role, rank) values (uid, p_workplace, r.role, 1)
    on conflict (user_id, workplace) do update set status = 'active', hired_at = now();
  end if;
  return jsonb_build_object('passed', passed, 'role', r.role);
end;
$$;

-- A shift: pay is recomputed here from the role's rate; promotion is automatic.
create or replace function public.career_finish_shift(p_seed integer, p_correct integer, p_total integer, p_duration_ms integer, p_skills jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  j public.career_jobs;
  r public.career_roles;
  nxt public.career_roles;
  pay integer;
  score numeric;
  today_count integer;
  k text;
  v jsonb;
  promoted boolean := false;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into j from public.career_jobs where user_id = uid and status = 'active' for update;
  if not found then raise exception 'no_job'; end if;
  if p_total <> 5 or p_correct is null or p_correct not between 0 and p_total then raise exception 'invalid'; end if;
  if p_duration_ms is null or p_duration_ms < 15000 then raise exception 'too_fast'; end if;
  if j.last_shift_at is not null and j.last_shift_at > now() - interval '45 seconds' then raise exception 'rate_limited'; end if;
  select count(*) into today_count from public.career_shifts s where s.user_id = uid and s.created_at > now() - interval '1 day';
  select * into r from public.career_roles where workplace = j.workplace and role = j.role;
  score := p_correct::numeric / p_total;
  pay := case when score < 0.4 then round(r.pay * 0.25) when score >= 1 then round(r.pay * 1.2) else round(r.pay * score) end;
  if today_count >= 30 then pay := 0; end if; -- still counts as experience, no more wages today
  insert into public.career_shifts (user_id, workplace, role, seed, correct, total, pay, duration_ms)
  values (uid, j.workplace, j.role, p_seed, p_correct, p_total, pay, p_duration_ms);
  update public.career_jobs set shifts = shifts + 1, correct = correct + p_correct, total = total + p_total,
    rank_shifts = rank_shifts + 1, rank_correct = rank_correct + p_correct, rank_total = rank_total + p_total, last_shift_at = now()
  where user_id = uid and workplace = j.workplace returning * into j;
  -- Skills ledger: { "debugging": [correct, total], ... } capped to this shift.
  if jsonb_typeof(p_skills) = 'object' then
    for k, v in select key, value from jsonb_each(p_skills) loop
      if k ~ '^[a-z-]{2,40}$' and jsonb_typeof(v) = 'array' and (v->>1)::int between 1 and 5 and (v->>0)::int between 0 and (v->>1)::int then
        insert into public.career_skills (user_id, skill, correct, total) values (uid, k, (v->>0)::int, (v->>1)::int)
        on conflict (user_id, skill) do update set correct = public.career_skills.correct + excluded.correct, total = public.career_skills.total + excluded.total;
      end if;
    end loop;
  end if;
  insert into public.player_stats (user_id, clout) values (uid, pay)
  on conflict (user_id) do update set clout = public.player_stats.clout + excluded.clout, updated_at = now();
  -- Promotion: 5 shifts at 70%+ to rank 2, 12 at 80%+ to rank 3.
  if (j.rank = 1 and j.rank_shifts >= 5 and j.rank_correct::numeric / greatest(j.rank_total, 1) >= 0.7)
     or (j.rank = 2 and j.rank_shifts >= 12 and j.rank_correct::numeric / greatest(j.rank_total, 1) >= 0.8) then
    select * into nxt from public.career_roles where workplace = j.workplace and rank = j.rank + 1;
    if found then
      update public.career_jobs set rank = nxt.rank, role = nxt.role, rank_shifts = 0, rank_correct = 0, rank_total = 0
      where user_id = uid and workplace = j.workplace;
      promoted := true;
    end if;
  end if;
  return jsonb_build_object('pay', pay, 'promoted', promoted, 'role', coalesce(nxt.role, j.role), 'shifts', j.shifts);
end;
$$;

create or replace function public.career_quit() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_allowed'; end if;
  update public.career_jobs set status = 'left' where user_id = (select auth.uid()) and status = 'active';
end;
$$;

-- ── Homes ───────────────────────────────────────────────────────────────────
create table public.player_homes (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  owned     text[] not null default array['studio'],
  current   text not null default 'studio',
  layout    jsonb,
  furniture jsonb not null default '{}'::jsonb check (jsonb_typeof(furniture) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.player_homes enable row level security;
revoke all on public.player_homes from public, anon, authenticated;
grant select on public.player_homes to authenticated;
create policy "own home" on public.player_homes for select to authenticated using (user_id = (select auth.uid()));

create or replace function private.spend_clout(uid uuid, amount integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.player_stats set clout = clout - amount, updated_at = now() where user_id = uid and clout >= amount;
  if not found then raise exception 'not_enough_clout'; end if;
end;
$$;
revoke all on function private.spend_clout(uuid, integer) from public;

create or replace function public.home_buy(p_home text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  h public.home_types;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into h from public.home_types where id = p_home;
  if not found then raise exception 'unknown_home'; end if;
  insert into public.player_homes (user_id) values (uid) on conflict do nothing;
  if exists (select 1 from public.player_homes where user_id = uid and p_home = any(owned)) then
    update public.player_homes set current = p_home, updated_at = now() where user_id = uid;
    return;
  end if;
  if h.price > 0 then perform private.spend_clout(uid, h.price); end if;
  update public.player_homes set owned = array_append(owned, p_home), current = p_home, updated_at = now() where user_id = uid;
end;
$$;

create or replace function public.furniture_buy(p_item text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  f public.furniture_items;
  have integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into f from public.furniture_items where id = p_item;
  if not found or f.starter then raise exception 'unknown_item'; end if;
  insert into public.player_homes (user_id) values (uid) on conflict do nothing;
  select coalesce((furniture->>p_item)::int, 0) into have from public.player_homes where user_id = uid for update;
  if have >= 5 then raise exception 'too_many'; end if;
  perform private.spend_clout(uid, f.price);
  update public.player_homes set furniture = jsonb_set(furniture, array[p_item], to_jsonb(have + 1)), updated_at = now() where user_id = uid;
end;
$$;

-- Saves where everything is. Each item must be owned (starter pieces come free,
-- once each, or twice for plants), inside the room, and the layout capped at 40.
create or replace function public.home_save_layout(p_layout jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  e jsonb;
  f public.furniture_items;
  counts jsonb := '{}'::jsonb;
  owned jsonb;
  n integer;
  allow integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if jsonb_typeof(p_layout) <> 'array' or jsonb_array_length(p_layout) > 40 or octet_length(p_layout::text) > 8000 then raise exception 'invalid'; end if;
  insert into public.player_homes (user_id) values (uid) on conflict do nothing;
  select furniture into owned from public.player_homes where user_id = uid;
  for e in select * from jsonb_array_elements(p_layout) loop
    select * into f from public.furniture_items where id = e->>'item';
    if not found then raise exception 'unknown_item'; end if;
    if jsonb_typeof(e->'x') <> 'number' or jsonb_typeof(e->'y') <> 'number' then raise exception 'invalid'; end if;
    if (e->>'x')::int < 1 or (e->>'y')::int < 2 or (e->>'x')::int + f.w > 19 or (e->>'y')::int + f.h > 13 then raise exception 'out_of_room'; end if;
    n := coalesce((counts->>f.id)::int, 0) + 1;
    counts := jsonb_set(counts, array[f.id], to_jsonb(n));
    allow := coalesce((owned->>f.id)::int, 0) + case when f.starter then (case when f.id = 'plant' then 2 else 1 end) else 0 end;
    if n > allow then raise exception 'not_owned'; end if;
  end loop;
  update public.player_homes set layout = p_layout, updated_at = now() where user_id = uid;
end;
$$;

revoke all on function public.career_interview(text, integer, integer), public.career_finish_shift(integer, integer, integer, integer, jsonb),
  public.career_quit(), public.home_buy(text), public.furniture_buy(text), public.home_save_layout(jsonb) from public, anon;
grant execute on function public.career_interview(text, integer, integer), public.career_finish_shift(integer, integer, integer, integer, jsonb),
  public.career_quit(), public.home_buy(text), public.furniture_buy(text), public.home_save_layout(jsonb) to authenticated;
