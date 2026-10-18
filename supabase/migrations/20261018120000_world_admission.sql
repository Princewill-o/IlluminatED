-- Atomic room admission. Conservative Free-tier budget until an operator verifies
-- the project's quota. Only the database owner may change these settings.
create table private.world_limits (
  singleton boolean primary key default true check(singleton),
  room_capacity integer not null default 5 check(room_capacity between 1 and 5),
  event_budget integer not null default 60 check(event_budget between 9 and 1000000)
);
insert into private.world_limits default values;
create table private.world_leases (
  user_id uuid primary key references auth.users on delete cascade,
  client_id uuid not null,
  map_id text not null,
  server_id text not null,
  topic text not null,
  expires_at timestamptz not null
);
create index world_leases_expiry on private.world_leases(expires_at);
alter table private.world_limits enable row level security;
alter table private.world_leases enable row level security;
revoke all on private.world_limits, private.world_leases from public,anon,authenticated;

create function public.world_claim(p_map text,p_server text,p_client uuid,p_previous uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid(); lim private.world_limits; prior private.world_leases;
  n integer; cost bigint; target text; epoch bigint; boundary timestamptz;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_client is null or p_map is null or p_server is null
    or p_map !~ '^[a-z][a-z0-9-]{0,63}$' or p_map='home'
    or p_server !~ '^(lse-[1-3]|(sw|mid|north|scot|wales|ni|intl)-[1-2])$'
    then raise exception 'invalid'; end if;
  -- All claims/renewals/releases serialize, so two rooms cannot both spend the
  -- last project budget. No browser-supplied count/capacity is trusted.
  perform pg_advisory_xact_lock(18120000);
  select * into lim from private.world_limits where singleton;
  if not found then raise exception 'not_configured'; end if;
  delete from private.world_leases where expires_at <= clock_timestamp();
  select * into prior from private.world_leases where user_id=uid;
  if found and prior.client_id<>p_client and prior.client_id is distinct from p_previous then
    return jsonb_build_object('accepted',false,'reason','already_connected');
  end if;
  select count(*) into n from private.world_leases where map_id=p_map and server_id=p_server and user_id<>uid;
  if n>=lim.room_capacity then
    return jsonb_build_object('accepted',false,'reason','room_full');
  end if;
  -- Include one acknowledgement per send as well as send/recipient fanout.
  select coalesce(sum(c*(c+1)*9),0) into cost from (
    select count(*)::bigint c from (
      select map_id,server_id from private.world_leases where user_id<>uid
      union all select p_map,p_server
    ) members group by map_id,server_id
  ) rooms;
  if cost>lim.event_budget then
    return jsonb_build_object('accepted',false,'reason','service_busy');
  end if;
  epoch:=floor(extract(epoch from clock_timestamp())/60)::bigint;
  boundary:=to_timestamp((epoch+1)*60);
  target:='world:room:'||p_map||':'||p_server||':'||epoch;
  insert into private.world_leases(user_id,client_id,map_id,server_id,topic,expires_at)
    values(uid,p_client,p_map,p_server,target,clock_timestamp()+interval '90 seconds')
    on conflict(user_id) do update set client_id=excluded.client_id,map_id=excluded.map_id,
      server_id=excluded.server_id,topic=excluded.topic,expires_at=excluded.expires_at;
  return jsonb_build_object('accepted',true,'topic',target,'capacity',lim.room_capacity,
    'expiresAt',extract(epoch from clock_timestamp()+interval '90 seconds')*1000,
    'rotateAt',extract(epoch from boundary)*1000);
end $$;

create function public.world_release(p_client uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(18120000);
  delete from private.world_leases where user_id=auth.uid() and client_id=p_client;
end $$;

create function public.world_counts() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_member() then raise exception 'not_allowed'; end if;
  return jsonb_build_object('capacity',(select room_capacity from private.world_limits where singleton),
    'counts',coalesce((select jsonb_object_agg(k,n) from (
      select map_id||':'||server_id k,count(*) n from private.world_leases
      where expires_at>now() group by map_id,server_id
    ) rooms),'{}'::jsonb));
end $$;

create function private.world_topic_allowed(p_topic text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_active_member() and (
    exists(select 1 from private.world_leases where user_id=auth.uid()
      and topic=p_topic and expires_at>now()
      and split_part(topic,':',5)=floor(extract(epoch from now())/60)::bigint::text)
    -- Existing turn-based games use separate, non-movement channels.
    or p_topic ~ '^world:hub:[A-Za-z0-9-]{1,40}$'
    or (p_topic ~ '^world:games:[a-z0-9-]{1,16}$' and exists(
      select 1 from private.world_leases where user_id=auth.uid()
        and server_id=split_part(p_topic,':',3) and expires_at>now()))
  );
$$;
drop policy if exists "members receive world channels" on realtime.messages;
drop policy if exists "members send in world channels" on realtime.messages;
create policy "members receive world channels" on realtime.messages for select to authenticated
  using ((select private.world_topic_allowed(realtime.topic())));
create policy "members send in world channels" on realtime.messages for insert to authenticated
  with check ((select private.world_topic_allowed(realtime.topic())));
revoke all on function public.world_claim(text,text,uuid,uuid),public.world_release(uuid),public.world_counts(),private.world_topic_allowed(text) from public,anon;
grant execute on function public.world_claim(text,text,uuid,uuid),public.world_release(uuid),public.world_counts(),private.world_topic_allowed(text) to authenticated;
