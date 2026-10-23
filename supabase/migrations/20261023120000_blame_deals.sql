-- Interview room deals: a player the police aren't sure about can offer another
-- player Clout to take the blame. Nothing happens without the other player's
-- say-so: the offer waits in their inbox, and Clout moves only when they accept.
-- Offers expire after 60 seconds and are rate limited. RPC access only.
create table if not exists public.blame_deals (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  charge text not null check (char_length(charge) between 1 and 160),
  stars integer not null check (stars between 1 and 5),
  clout integer not null check (clout between 10 and 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  check (from_user <> to_user)
);
create index if not exists blame_deals_inbox on public.blame_deals (to_user, status, created_at desc);
create index if not exists blame_deals_outbox on public.blame_deals (from_user, created_at desc);
alter table public.blame_deals enable row level security;
-- No table policies: every read and write goes through the functions below.

create or replace function public.blame_offer(p_to uuid, p_charge text, p_stars integer, p_clout integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  wallet integer;
  deal uuid;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_to is null or p_to = uid then raise exception 'pick_someone_else'; end if;
  if p_clout is null or p_clout < 10 or p_clout > 500 then raise exception 'bad_amount'; end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then raise exception 'bad_charge'; end if;
  if not exists (select 1 from public.player_stats where user_id = p_to) then raise exception 'unknown_player'; end if;
  select clout into wallet from public.player_stats where user_id = uid;
  if coalesce(wallet, 0) < p_clout then raise exception 'not_enough_clout'; end if;
  -- One live offer at a time, and at most six offers in ten minutes.
  if (select count(*) from public.blame_deals where from_user = uid and created_at > now() - interval '10 minutes') >= 6 then
    raise exception 'too_many_offers';
  end if;
  update public.blame_deals set status = 'cancelled', answered_at = now() where from_user = uid and status = 'pending';
  insert into public.blame_deals (from_user, to_user, charge, stars, clout)
  values (uid, p_to, left(p_charge, 160), p_stars, p_clout) returning id into deal;
  return deal;
end;
$$;

-- Offers waiting for me (the last minute only).
create or replace function public.blame_inbox()
returns table (id uuid, from_username text, charge text, stars integer, clout integer, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select d.id, p.username::text, d.charge, d.stars, d.clout, d.created_at
  from public.blame_deals d join public.profiles p on p.id = d.from_user
  where d.to_user = (select auth.uid()) and d.status = 'pending' and d.created_at > now() - interval '60 seconds'
  order by d.created_at desc limit 3;
$$;

-- Accept or decline. Accepting moves the Clout from the offerer to me, atomically.
create or replace function public.blame_answer(p_deal uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  d public.blame_deals%rowtype;
  balance integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into d from public.blame_deals where id = p_deal and to_user = uid for update;
  if not found then raise exception 'no_offer'; end if;
  if d.status <> 'pending' then return jsonb_build_object('status', d.status); end if;
  if d.created_at < now() - interval '60 seconds' then
    update public.blame_deals set status = 'expired', answered_at = now() where id = d.id;
    return jsonb_build_object('status', 'expired');
  end if;
  if not p_accept then
    update public.blame_deals set status = 'declined', answered_at = now() where id = d.id;
    return jsonb_build_object('status', 'declined');
  end if;
  -- Lock both wallets in a fixed order so two deals can't deadlock.
  perform 1 from public.player_stats where user_id in (d.from_user, d.to_user) order by user_id for update;
  select clout into balance from public.player_stats where user_id = d.from_user;
  if coalesce(balance, 0) < d.clout then
    update public.blame_deals set status = 'expired', answered_at = now() where id = d.id;
    return jsonb_build_object('status', 'expired');
  end if;
  update public.player_stats set clout = clout - d.clout, updated_at = now() where user_id = d.from_user;
  update public.player_stats set clout = clout + d.clout, updated_at = now() where user_id = d.to_user;
  update public.blame_deals set status = 'accepted', answered_at = now() where id = d.id;
  select clout into balance from public.player_stats where user_id = uid;
  return jsonb_build_object('status', 'accepted', 'charge', d.charge, 'stars', d.stars, 'clout', d.clout, 'wallet', balance);
end;
$$;

-- What happened to my offer.
create or replace function public.blame_status(p_deal uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  d public.blame_deals%rowtype;
begin
  select * into d from public.blame_deals where id = p_deal and from_user = uid;
  if not found then raise exception 'no_offer'; end if;
  if d.status = 'pending' and d.created_at < now() - interval '60 seconds' then
    update public.blame_deals set status = 'expired', answered_at = now() where id = d.id;
    return 'expired';
  end if;
  return d.status;
end;
$$;

revoke all on function public.blame_offer(uuid, text, integer, integer) from public, anon;
revoke all on function public.blame_inbox() from public, anon;
revoke all on function public.blame_answer(uuid, boolean) from public, anon;
revoke all on function public.blame_status(uuid) from public, anon;
grant execute on function public.blame_offer(uuid, text, integer, integer) to authenticated;
grant execute on function public.blame_inbox() to authenticated;
grant execute on function public.blame_answer(uuid, boolean) to authenticated;
grant execute on function public.blame_status(uuid) to authenticated;
