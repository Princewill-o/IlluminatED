begin;
create table private.friend_race_rooms (
 code text primary key, host uuid not null references public.profiles(id) on delete cascade,
 track text not null, seed integer not null, starts_at timestamptz,
 created_at timestamptz not null default now()
);
create table private.friend_race_players (
 code text not null references private.friend_race_rooms(code) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 state jsonb, seen_at timestamptz not null default now(), primary key(code,user_id)
);
alter table private.friend_race_rooms enable row level security;
alter table private.friend_race_players enable row level security;
create function public.friend_race(p_action text,p_code text default null,p_track text default null,p_state jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r private.friend_race_rooms; room_code text:=upper(trim(p_code));
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 if p_action='create' then
  if p_track is null or p_track !~ '^w[1-8]-t[1-4]$' then raise exception 'invalid_track'; end if;
  if (select count(*) from private.friend_race_rooms where host=uid and created_at>now()-interval '1 minute')>=3 then raise exception 'slow_down'; end if;
  room_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into private.friend_race_rooms(code,host,track,seed) values(room_code,uid,p_track,1+floor(random()*2000000000)::int);
  insert into private.friend_race_players(code,user_id) values(room_code,uid);
 end if;
 select * into r from private.friend_race_rooms where code=room_code and created_at>now()-interval '30 minutes' for update;
 if not found then raise exception 'room_unavailable'; end if;
 if p_action='join' then
  if r.starts_at is not null then raise exception 'already_started'; end if;
  delete from private.friend_race_players where code=room_code and seen_at<now()-interval '30 seconds' and user_id<>r.host;
  if (select count(*) from private.friend_race_players where code=room_code)>=6 and not exists(select 1 from private.friend_race_players where code=room_code and user_id=uid) then raise exception 'room_full'; end if;
  insert into private.friend_race_players(code,user_id) values(room_code,uid) on conflict do nothing;
 end if;
 if not exists(select 1 from private.friend_race_players where code=room_code and user_id=uid) then raise exception 'not_in_room'; end if;
 if p_action='start' then
  if r.host<>uid or r.starts_at is not null then raise exception 'not_host'; end if;
  delete from private.friend_race_players where code=room_code and seen_at<now()-interval '15 seconds' and user_id<>uid;
  if (select count(*) from private.friend_race_players where code=room_code)<2 then raise exception 'need_two_players'; end if;
  update private.friend_race_rooms set starts_at=clock_timestamp()+interval '5 seconds' where code=room_code returning * into r;
 end if;
 if p_action='leave' then
  if r.host=uid and r.starts_at is null then delete from private.friend_race_rooms where code=room_code;
  else delete from private.friend_race_players where code=room_code and user_id=uid; end if;
  return null;
 end if;
 if p_action='sync' and p_state is not null then
  if r.starts_at is null or now()<r.starts_at or pg_column_size(p_state)>4096 then raise exception 'invalid_state'; end if;
  if jsonb_typeof(p_state)<>'object' or not(p_state ? 't') or (p_state->>'t')::numeric<0 or (p_state->>'t')::numeric>extract(epoch from (clock_timestamp()-r.starts_at))*1000+2000 then raise exception 'invalid_state'; end if;
  update private.friend_race_players set state=p_state where code=room_code and user_id=uid;
 end if;
 update private.friend_race_players set seen_at=now() where code=room_code and user_id=uid;
 return jsonb_build_object('code',r.code,'host',r.host=uid,'seed',r.seed,'track',r.track,'startsAt',r.starts_at,
 'players',(select jsonb_agg(jsonb_build_object('id',p.user_id,'name',f.username,'me',p.user_id=uid,'state',p.state,'connected',p.seen_at>now()-interval '15 seconds') order by p.user_id) from private.friend_race_players p join public.profiles f on f.id=p.user_id where p.code=room_code));
end $$;
revoke all on function public.friend_race(text,text,text,jsonb) from public,anon;
grant execute on function public.friend_race(text,text,text,jsonb) to authenticated;
commit;
