-- Arcade mini-games bought with Clout, referrals, and creator video submissions.

-- ── Arcade ───────────────────────────────────────────────
create table if not exists public.arcade_games (
  id text primary key,
  price integer not null check (price >= 0)
);
insert into public.arcade_games (id, price) values
  ('times-tables', 0), ('element-match', 400), ('binary-blitz', 600), ('key-terms', 800), ('unit-rush', 1000)
on conflict (id) do update set price = excluded.price;
alter table public.arcade_games enable row level security;
create policy "arcade catalogue readable" on public.arcade_games for select using (true);

create table if not exists public.player_arcade (
  user_id uuid not null references auth.users (id) on delete cascade,
  game text not null references public.arcade_games (id),
  best integer not null default 0,
  plays integer not null default 0,
  last_played timestamptz,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, game)
);
alter table public.player_arcade enable row level security;
create policy "own arcade" on public.player_arcade for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.arcade_rounds (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game text not null,
  score integer not null,
  reward integer not null,
  created_at timestamptz not null default now()
);
create index if not exists arcade_rounds_user_day on public.arcade_rounds (user_id, created_at);
alter table public.arcade_rounds enable row level security;
create policy "own arcade rounds" on public.arcade_rounds for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.arcade_buy(p_game text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g public.arcade_games;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into g from public.arcade_games where id = p_game;
  if not found then raise exception 'unknown_item'; end if;
  if exists (select 1 from public.player_arcade where user_id = uid and game = p_game) then raise exception 'already_owned'; end if;
  if g.price > 0 then perform private.spend_clout(uid, g.price); end if;
  insert into public.player_arcade (user_id, game) values (uid, p_game);
end;
$$;
revoke all on function public.arcade_buy(text) from public;
grant execute on function public.arcade_buy(text) to authenticated;

-- One 60-second round. Pays half the score in Clout, up to 150 a day across the arcade.
create or replace function public.arcade_finish(p_game text, p_score integer, p_duration_ms integer)
returns table (reward integer, best integer)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  today integer;
  pay integer;
  last timestamptz;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_score < 0 or p_score > 60 then raise exception 'invalid'; end if;
  if p_duration_ms < 55000 then raise exception 'too_fast'; end if;
  select last_played into last from public.player_arcade where user_id = uid and game = p_game;
  if not found then
    -- The free game unlocks itself the first time.
    if exists (select 1 from public.arcade_games where id = p_game and price = 0) then
      insert into public.player_arcade (user_id, game) values (uid, p_game);
    else
      raise exception 'not_owned';
    end if;
  end if;
  if last is not null and last > now() - interval '50 seconds' then raise exception 'too_fast'; end if;
  select coalesce(sum(r.reward), 0) into today from public.arcade_rounds r where r.user_id = uid and r.created_at > now() - interval '1 day';
  pay := greatest(0, least(p_score / 2, 150 - today));
  insert into public.arcade_rounds (user_id, game, score, reward) values (uid, p_game, p_score, pay);
  update public.player_arcade a set best = greatest(a.best, p_score), plays = a.plays + 1, last_played = now()
    where a.user_id = uid and a.game = p_game;
  if pay > 0 then
    insert into public.player_stats (user_id, clout) values (uid, pay)
    on conflict (user_id) do update set clout = public.player_stats.clout + excluded.clout, updated_at = now();
  end if;
  return query select pay, (select a.best from public.player_arcade a where a.user_id = uid and a.game = p_game);
end;
$$;
revoke all on function public.arcade_finish(text, integer, integer) from public;
grant execute on function public.arcade_finish(text, integer, integer) to authenticated;

-- ── Referrals ────────────────────────────────────────────
create table if not exists public.referrals (
  referred_id uuid primary key references auth.users (id) on delete cascade,
  referrer_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (referred_id <> referrer_id)
);
create index if not exists referrals_referrer on public.referrals (referrer_id);
alter table public.referrals enable row level security;
create policy "see your referrals" on public.referrals for select to authenticated
  using (referrer_id = (select auth.uid()) or referred_id = (select auth.uid()));

-- Called once by a new player with the code from the link they arrived on.
-- Only accounts made in the last 7 days can be referred, and only once. The referrer gets 150 Clout.
create or replace function public.claim_referral(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  ref uuid;
  joined timestamptz;
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.referrals where referred_id = uid) then return false; end if;
  select created_at into joined from auth.users where id = uid;
  if joined is null or joined < now() - interval '7 days' then return false; end if;
  select id into ref from public.profiles where lower(username) = lower(p_code);
  if ref is null or ref = uid then return false; end if;
  insert into public.referrals (referred_id, referrer_id) values (uid, ref);
  insert into public.player_stats (user_id, clout) values (ref, 150)
  on conflict (user_id) do update set clout = public.player_stats.clout + 150, updated_at = now();
  return true;
end;
$$;
revoke all on function public.claim_referral(text) from public;
grant execute on function public.claim_referral(text) to authenticated;

-- ── Creator video submissions ────────────────────────────
create table if not exists public.creator_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube', 'x', 'snapchat', 'other')),
  url text not null check (url ~ '^https://' and length(url) <= 500),
  note text check (length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists creator_submissions_user on public.creator_submissions (user_id, created_at);
alter table public.creator_submissions enable row level security;
create policy "own submissions" on public.creator_submissions for select to authenticated using (user_id = (select auth.uid()));
create policy "submit your own" on public.creator_submissions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
