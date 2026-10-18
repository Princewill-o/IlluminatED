-- Separate extension tables: existing homes, cars and multiplayer are preserved.
create table public.city_assets (
 id text primary key, name text not null, kind text not null check(kind in ('aircraft','watercraft','investment','pet','pack')),
 price integer not null check(price>0), vip boolean not null default false, unlock_clout integer not null default 0,
 available_from timestamptz, available_until timestamptz
);
insert into public.city_assets(id,name,kind,price,vip,unlock_clout) values
 ('prop-plane','Cloudhopper','aircraft',1800,false,0),('jet','Stratos Jet','aircraft',6500,false,0),
 ('sailboat','Harbour Sailboat','watercraft',950,false,0),('yacht','City Voyager','watercraft',4200,false,0),
 ('index-fund','City Mix Fund','investment',100,false,0),('green-energy','Green Energy','investment',80,false,0),
 ('tech-labs','Tech Labs','investment',140,false,0),('moon-fox','Moon Fox','pet',250,true,0),
 ('cloud-dragon','Cloud Dragon','pet',500,true,0),('neon-pioneers','Neon Pioneers','pack',400,false,800),
 ('ocean-futures','Ocean Futures','pack',600,false,1200),('autumn-makers','Autumn Makers','pack',350,false,600);
update public.city_assets set available_from='2026-10-01T00:00:00Z',available_until='2026-11-01T00:00:00Z' where id='autumn-makers';
create table public.city_holdings (
 user_id uuid not null references auth.users on delete cascade, asset_id text not null references public.city_assets,
 units integer not null check(units between 1 and 10000), cost integer not null check(cost>=0), primary key(user_id,asset_id)
);
create table public.city_ledger (
 id bigint generated always as identity primary key, user_id uuid not null references auth.users on delete cascade,
 asset_id text not null references public.city_assets, units integer not null, amount integer not null,
 created_at timestamptz not null default now()
);
create index city_ledger_user_time on public.city_ledger(user_id,created_at desc);
alter table public.city_assets enable row level security;
alter table public.city_holdings enable row level security;
alter table public.city_ledger enable row level security;
revoke all on public.city_assets,public.city_holdings,public.city_ledger from public,anon,authenticated;
grant select on public.city_assets,public.city_holdings,public.city_ledger to authenticated;
create policy "members see assets" on public.city_assets for select to authenticated using((select private.is_active_member()));
create policy "own holdings" on public.city_holdings for select to authenticated using(user_id=(select auth.uid()) and (select private.is_active_member()));
create policy "own ledger" on public.city_ledger for select to authenticated using(user_id=(select auth.uid()) and (select private.is_active_member()));

create function private.city_quote(p_id text) returns integer language sql stable set search_path='' as $$
 select case when kind='investment' then greatest(1,price + (('x'||substr(md5(id||private.london_today()::text),1,6))::bit(24)::integer % (price/2+1)) - price/4) else price end
 from public.city_assets where id=p_id;
$$;
revoke all on function private.city_quote(text) from public,anon,authenticated;
create function private.city_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 select jsonb_build_object('clout',coalesce((select clout from public.player_stats where user_id=uid),0),
 'vip',private.tiggy_plan(uid)='premium',
 'quotes',(select jsonb_object_agg(id,private.city_quote(id)) from public.city_assets),
 'holdings',coalesce((select jsonb_agg(h) from public.city_holdings h where user_id=uid),'[]'::jsonb),
 'ledger',coalesce((select jsonb_agg(l) from (select id,asset_id,units,amount,created_at from public.city_ledger where user_id=uid order by id desc limit 20) l),'[]'::jsonb)) into result;
 return result;
end $$;
create function private.city_trade(p_asset text,p_units integer) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.city_assets; h public.city_holdings; balance integer; quote integer; amount integer;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 if p_units is null or p_units=0 or abs(p_units::bigint)>100 then raise exception 'invalid'; end if;
 select * into a from public.city_assets where id=p_asset;
 if not found then raise exception 'unavailable'; end if;
 if a.kind<>'investment' and p_units<>1 then raise exception 'invalid'; end if;
 if (a.available_from is not null and now()<a.available_from) or (a.available_until is not null and now()>=a.available_until) then raise exception 'unavailable'; end if;
 insert into public.player_stats(user_id) values(uid) on conflict do nothing;
 select clout into balance from public.player_stats where user_id=uid for update;
 select * into h from public.city_holdings where user_id=uid and asset_id=p_asset;
 quote:=private.city_quote(p_asset); amount:=quote*p_units;
 if p_units>0 then
   if a.vip and private.tiggy_plan(uid)<>'premium' then raise exception 'vip_required'; end if;
   if balance<greatest(amount,a.unlock_clout) then raise exception 'not_enough_clout'; end if;
   if a.kind<>'investment' and h.units is not null then raise exception 'already_owned'; end if;
   if coalesce(h.units,0)+p_units>10000 then raise exception 'invalid'; end if;
   insert into public.city_holdings(user_id,asset_id,units,cost) values(uid,p_asset,p_units,amount)
   on conflict(user_id,asset_id) do update set units=city_holdings.units+p_units,cost=city_holdings.cost+amount;
 else
   if coalesce(h.units,0)<-p_units then raise exception 'not_owned'; end if;
   -- Sale spread prevents repeatedly trading a static daily quote for free money.
   amount:=floor(quote*0.95)::integer*p_units;
   if h.units=-p_units then delete from public.city_holdings where user_id=uid and asset_id=p_asset;
   else update public.city_holdings set units=h.units+p_units,cost=round(h.cost::numeric*(h.units+p_units)/h.units) where user_id=uid and asset_id=p_asset; end if;
 end if;
 update public.player_stats set clout=clout-amount,updated_at=now() where user_id=uid;
 insert into public.city_ledger(user_id,asset_id,units,amount) values(uid,p_asset,p_units,-amount);
end $$;

-- Calendar themes are editorially curated; no unreviewed news enters question banks.
create table public.city_week_claims (
 user_id uuid not null references auth.users on delete cascade, week_start date not null,
 reward text not null check(reward in ('weekly','weekend')), clout integer not null, claimed_at timestamptz not null default now(),
 primary key(user_id,week_start,reward)
);
alter table public.city_week_claims enable row level security;
revoke all on public.city_week_claims from public,anon,authenticated;
grant select on public.city_week_claims to authenticated;
create policy "own challenge claims" on public.city_week_claims for select to authenticated using(user_id=(select auth.uid()) and (select private.is_active_member()));
create function private.city_week_progress() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); d date:=private.london_today(); w date:=date_trunc('week',d)::date; n integer; c integer; weekend integer;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 select count(*),coalesce(sum((result->>'correct')::integer),0),count(*) filter(where (completed_at at time zone 'Europe/London')::date>=w+5)
 into n,c,weekend from public.study_sessions where user_id=uid and completed_at is not null and (completed_at at time zone 'Europe/London')::date>=w and (completed_at at time zone 'Europe/London')::date<w+7;
 return jsonb_build_object('week',w,'ends',w+7,'sessions',n,'correct',c,'weekend',weekend,
 'claims',coalesce((select jsonb_agg(reward) from public.city_week_claims where user_id=uid and week_start=w),'[]'::jsonb));
end $$;
create function private.city_claim_week(p_reward text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p jsonb; award integer; w date:=date_trunc('week',private.london_today())::date;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 insert into public.player_stats(user_id) values(uid) on conflict do nothing;
 perform 1 from public.player_stats where user_id=uid for update;
 p:=private.city_week_progress();
 if p_reward='weekly' and (p->>'sessions')::integer>=3 and (p->>'correct')::integer>=10 then award:=100;
 elsif p_reward='weekend' and private.london_today()>=w+5 and (p->>'weekend')::integer>=2 then award:=75;
 else raise exception 'not_ready'; end if;
 if exists(select 1 from public.city_week_claims where user_id=uid and week_start=w and reward=p_reward) then raise exception 'already_claimed'; end if;
 insert into public.city_week_claims(user_id,week_start,reward,clout) values(uid,w,p_reward,award);
 update public.player_stats set clout=clout+award,updated_at=now() where user_id=uid;
end $$;

-- Mutual friends; up to 30 accepted friends, private requests, blocking and reports.
create table public.city_friends (
 id uuid primary key default gen_random_uuid(), low_id uuid not null references public.profiles on delete cascade,
 high_id uuid not null references public.profiles on delete cascade, requested_by uuid not null references public.profiles on delete cascade,
 state text not null check(state in ('pending','accepted','declined','blocked')), blocked_by uuid references public.profiles on delete cascade,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(low_id,high_id), check(low_id<high_id)
);
create index city_friends_high on public.city_friends(high_id,state);
create table public.city_friend_keys (
 user_id uuid primary key references public.profiles on delete cascade,
 public_key jsonb not null check(jsonb_typeof(public_key)='object' and (public_key->>'kty') is not distinct from 'EC' and (public_key->>'crv') is not distinct from 'P-256' and public_key->>'x' is not null and public_key->>'y' is not null and not public_key ? 'd' and octet_length(public_key::text)<1000)
);
create table public.city_friend_messages (
 id bigint generated always as identity primary key, friendship_id uuid not null references public.city_friends on delete cascade,
 sender_id uuid not null references public.profiles on delete cascade,
 ciphertext text not null check(length(ciphertext) between 24 and 12000 and ciphertext ~ '^[A-Za-z0-9+/]+={0,2}$'),
 iv text not null check(length(iv)=16 and iv ~ '^[A-Za-z0-9+/]{16}$'), created_at timestamptz not null default now()
);
create index city_friend_messages_thread on public.city_friend_messages(friendship_id,id desc);
create index city_friend_messages_sender on public.city_friend_messages(sender_id,created_at desc);
create table public.city_friend_reports (
 id bigint generated always as identity primary key, reporter uuid not null references public.profiles on delete cascade,
 message_id bigint not null references public.city_friend_messages on delete cascade,
 disclosed_text text not null check(length(disclosed_text) between 1 and 4000), created_at timestamptz not null default now(), unique(reporter,message_id)
);
alter table public.city_friends enable row level security;
alter table public.city_friend_keys enable row level security;
alter table public.city_friend_messages enable row level security;
alter table public.city_friend_reports enable row level security;
revoke all on public.city_friends,public.city_friend_keys,public.city_friend_messages,public.city_friend_reports from public,anon,authenticated;
grant select on public.city_friends,public.city_friend_keys,public.city_friend_messages to authenticated;
grant insert on public.city_friend_keys to authenticated;
grant select,insert on public.city_friend_reports to authenticated;
grant usage on sequence public.city_friend_reports_id_seq to authenticated;
create policy "own friendships" on public.city_friends for select to authenticated using(auth.uid() in (low_id,high_id) and (select private.is_active_member()));
create policy "own or friend keys" on public.city_friend_keys for select to authenticated using((select private.is_active_member()) and (user_id=(select auth.uid()) or exists(select 1 from public.city_friends f where f.state='accepted' and auth.uid() in(f.low_id,f.high_id) and user_id in(f.low_id,f.high_id))));
create policy "publish own immutable key" on public.city_friend_keys for insert to authenticated with check(user_id=(select auth.uid()) and (select private.is_active_member()));
create policy "friends read ciphertext" on public.city_friend_messages for select to authenticated using((select private.is_active_member()) and exists(select 1 from public.city_friends f where f.id=friendship_id and f.state in('accepted','blocked') and auth.uid() in(f.low_id,f.high_id)));
create policy "report own conversation" on public.city_friend_reports for insert to authenticated with check(reporter=(select auth.uid()) and (select private.is_active_member()) and exists(select 1 from public.city_friend_messages m join public.city_friends f on f.id=m.friendship_id where m.id=message_id and m.sender_id<>auth.uid() and auth.uid() in(f.low_id,f.high_id)));
create policy "reporter and safety team" on public.city_friend_reports for select to authenticated using(reporter=(select auth.uid()) or (select private.is_moderator()));

create function private.city_friend_action(p_username text,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); other uuid; lo uuid; hi uuid; edge public.city_friends;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 if p_username is null or length(p_username)>40 or p_action is null or p_action not in('request','accept','remove','block','unblock') then raise exception 'invalid'; end if;
 select id into other from public.profiles where lower(username)=lower(trim(p_username)) and not banned;
 if other is null or other=uid then raise exception 'unavailable'; end if;
 lo:=least(uid,other); hi:=greatest(uid,other);
 -- Serialize both players, in a stable order: concurrent requests cannot bypass caps.
 perform id from public.profiles where id in(lo,hi) order by id for update;
 select * into edge from public.city_friends where low_id=lo and high_id=hi;
 if p_action='block' then
   if edge.state='blocked' and edge.blocked_by<>uid then raise exception 'unavailable'; end if;
   insert into public.city_friends(low_id,high_id,requested_by,state,blocked_by) values(lo,hi,uid,'blocked',uid)
   on conflict(low_id,high_id) do update set state='blocked',blocked_by=uid,updated_at=now(); return;
 end if;
 if p_action='unblock' and edge.state='blocked' and edge.blocked_by=uid then
   update public.city_friends set state='declined',blocked_by=null,updated_at=now() where id=edge.id; return;
 end if;
 if edge.state='blocked' then raise exception 'unavailable'; end if;
 if p_action='remove' and edge.state is not null then
   update public.city_friends set state='declined',updated_at=now() where id=edge.id; return;
 end if;
 if p_action='accept' then
   if edge.state is distinct from 'pending' or edge.requested_by=uid then raise exception 'unavailable'; end if;
   if (select count(*) from public.city_friends where state='accepted' and uid in(low_id,high_id))>=30
      or (select count(*) from public.city_friends where state='accepted' and other in(low_id,high_id))>=30 then raise exception 'friend_limit'; end if;
   update public.city_friends set state='accepted',updated_at=now() where id=edge.id; return;
 end if;
 if p_action<>'request' or edge.state in('accepted','pending') then raise exception 'unavailable'; end if;
 if edge.updated_at>now()-interval '1 day' or (select count(*) from public.city_friends where requested_by=uid and created_at>now()-interval '1 day')>=30
 or (select count(*) from public.city_friends where state='pending' and other in(low_id,high_id))>=30 then raise exception 'request_limit'; end if;
 insert into public.city_friends(low_id,high_id,requested_by,state) values(lo,hi,uid,'pending')
 on conflict(low_id,high_id) do update set state='pending',requested_by=uid,created_at=now(),updated_at=now();
end $$;
create function private.city_send_message(p_friendship uuid,p_ciphertext text,p_iv text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); edge public.city_friends;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 select * into edge from public.city_friends where id=p_friendship;
 if edge.id is null or uid not in(edge.low_id,edge.high_id) then raise exception 'unavailable'; end if;
 -- Lock profiles before the edge, matching friend/block operations and preventing deadlocks.
 perform id from public.profiles where id in(edge.low_id,edge.high_id) order by id for update;
 select * into edge from public.city_friends where id=p_friendship for update;
 if edge.state is distinct from 'accepted' or uid not in(edge.low_id,edge.high_id) then raise exception 'unavailable'; end if;
 if not exists(select 1 from public.profiles where id=case when uid=edge.low_id then edge.high_id else edge.low_id end and not banned) then raise exception 'unavailable'; end if;
 if (select count(*) from public.city_friend_messages where sender_id=uid and created_at>now()-interval '1 minute')>=20 then raise exception 'rate_limited'; end if;
 if (select count(*) from public.city_friend_keys where user_id in(edge.low_id,edge.high_id))<>2 then raise exception 'keys_not_ready'; end if;
 insert into public.city_friend_messages(friendship_id,sender_id,ciphertext,iv) values(p_friendship,uid,p_ciphertext,p_iv);
end $$;

-- Only invoker wrappers live in the exposed schema. Definers check active membership themselves.
revoke all on function private.city_snapshot(),private.city_trade(text,integer),private.city_week_progress(),private.city_claim_week(text),private.city_friend_action(text,text),private.city_send_message(uuid,text,text) from public,anon;
grant execute on function private.city_snapshot(),private.city_trade(text,integer),private.city_week_progress(),private.city_claim_week(text),private.city_friend_action(text,text),private.city_send_message(uuid,text,text) to authenticated;
create function public.city_snapshot() returns jsonb language sql set search_path='' as $$select private.city_snapshot()$$;
create function public.city_trade(p_asset text,p_units integer) returns void language sql set search_path='' as $$select private.city_trade(p_asset,p_units)$$;
create function public.city_week_progress() returns jsonb language sql set search_path='' as $$select private.city_week_progress()$$;
create function public.city_claim_week(p_reward text) returns void language sql set search_path='' as $$select private.city_claim_week(p_reward)$$;
create function public.city_friend_action(p_username text,p_action text) returns void language sql set search_path='' as $$select private.city_friend_action(p_username,p_action)$$;
create function public.city_send_message(p_friendship uuid,p_ciphertext text,p_iv text) returns void language sql set search_path='' as $$select private.city_send_message(p_friendship,p_ciphertext,p_iv)$$;
revoke all on function public.city_snapshot(),public.city_trade(text,integer),public.city_week_progress(),public.city_claim_week(text),public.city_friend_action(text,text),public.city_send_message(uuid,text,text) from public,anon;
grant execute on function public.city_snapshot(),public.city_trade(text,integer),public.city_week_progress(),public.city_claim_week(text),public.city_friend_action(text,text),public.city_send_message(uuid,text,text) to authenticated;
