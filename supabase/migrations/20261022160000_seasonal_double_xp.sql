-- Seasonal events: double XP during every seasonal/holiday event window.
-- Mirrors src/game/core/seasonal-events.ts (London calendar dates, inclusive).
create or replace function private.event_xp_multiplier(p_at timestamptz default now())
returns integer language sql stable set search_path = '' as $$
  with d as (select (p_at at time zone 'Europe/London')::date as day),
  k as (select day, extract(month from day)::int * 100 + extract(day from day)::int as md from d),
  lunar(day) as (values ('2026-02-17'::date), ('2027-02-06'), ('2028-01-26'), ('2029-02-13'), ('2030-02-03'), ('2031-01-23'), ('2032-02-11'))
  select case when
       k.md >= 1212 or k.md <= 104      -- Winter Wonderland
    or k.md between 320 and 412         -- Spring Bloom
    or k.md between 504 and 524         -- Exam Power-Up
    or k.md between 720 and 816         -- Summer Festival
    or k.md between 901 and 914         -- Back to School
    or k.md between 922 and 1012        -- Autumn Harvest
    or k.md between 1018 and 1102       -- Fright Night (Halloween)
    or k.md between 1103 and 1109       -- Bonfire Night
    or exists (select 1 from lunar where k.day between lunar.day - 1 and lunar.day + 13)  -- Lunar New Year
  then 2 else 1 end
  from k;
$$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.world_xp(text)'::regprocedure);
  if position('event_xp_multiplier' in d) = 0 then
    d := replace(d, 'gain integer := case p_kind', 'gain integer := private.event_xp_multiplier() * case p_kind');
    if position('event_xp_multiplier' in d) = 0 then raise exception 'world_xp patch failed'; end if;
    execute d;
  end if;
  d := pg_get_functiondef('public.game_finish_run(text,integer,integer,integer,integer,integer,integer,boolean,text)'::regprocedure);
  if position('event_xp_multiplier' in d) = 0 then
    d := replace(d, 'v_xp := 10 + p_correct * 20 + v_rank * 10;', 'v_xp := (10 + p_correct * 20 + v_rank * 10) * private.event_xp_multiplier();');
    if position('event_xp_multiplier' in d) = 0 then raise exception 'game_finish_run patch failed'; end if;
    execute d;
  end if;
end $$;
