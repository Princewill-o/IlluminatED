-- Account-owned houses and furniture; catalogue prices are authoritative here.
insert into public.home_types (id, price) values ('cottage',12000),('penthouse',22000)
on conflict (id) do update set price=excluded.price;
insert into public.furniture_items (id,price,w,h,starter) values
 ('shower',0,2,2,true),('toilet',350,1,2,false),('sink',450,2,1,false),
 ('bath',1800,3,2,false),('rain-shower',2400,2,2,false),
 ('velvet-sofa',1600,4,2,false),('linen-bed',2200,4,4,false),
 ('cinema-tv',3200,4,1,false),('marble-table',1700,3,2,false),
 ('kitchen',1400,4,2,false),('designer-chair',1100,2,2,false),
 ('oak-desk',1300,4,2,false),('monstera',400,1,1,false),
 ('sculpture',1900,1,1,false),('pendant',650,1,1,false),('woven-rug',750,3,3,false)
on conflict (id) do update set price=excluded.price,w=excluded.w,h=excluded.h,starter=excluded.starter;

-- Serialize simultaneous house purchases to avoid charging twice for ownership.
create or replace function public.home_buy(p_home text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); h public.home_types; owned_homes text[];
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 select * into h from public.home_types where id=p_home;
 if not found then raise exception 'unknown_home'; end if;
 insert into public.player_homes(user_id) values(uid) on conflict do nothing;
 select owned into owned_homes from public.player_homes where user_id=uid for update;
 if not (p_home=any(owned_homes)) then
  if h.price>0 then perform private.spend_clout(uid,h.price); end if;
  owned_homes := array_append(owned_homes,p_home);
 end if;
 update public.player_homes set owned=owned_homes,current=p_home,updated_at=now() where user_id=uid;
end $$;

-- The same footprint, ownership, overlap and access checks used by Build & Buy.
create or replace function public.home_save_layout(p_layout jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare
 uid uuid := (select auth.uid()); e jsonb; f public.furniture_items;
 counts jsonb := '{}'; owned_items jsonb; n integer; allowed integer;
 x integer; y integer; ix integer; iy integer; k text; item_key text;
 keys text[] := '{}'; occupied text[] := '{}'; visited text[] := array['9,12','10,12'];
 queue text[] := array['9,12','10,12']; cursor_at integer := 1;
 adjacent boolean; floor_item boolean; cell text;
begin
 if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
 if p_layout is null or jsonb_typeof(p_layout)<>'array' then raise exception 'invalid'; end if;
 if jsonb_array_length(p_layout)>40 or octet_length(p_layout::text)>8000 then raise exception 'invalid'; end if;
 insert into public.player_homes(user_id) values(uid) on conflict do nothing;
 select furniture into owned_items from public.player_homes where user_id=uid for update;
 for e in select * from jsonb_array_elements(p_layout) loop
  if jsonb_typeof(e)<>'object' then raise exception 'invalid'; end if;
  item_key := e->>'key';
  if item_key is null or length(item_key)=0 or length(item_key)>40 or item_key=any(keys) then raise exception 'invalid'; end if;
  keys := array_append(keys,item_key);
  select * into f from public.furniture_items where id=e->>'item';
  if not found then raise exception 'unknown_item'; end if;
  if jsonb_typeof(e->'x') is distinct from 'number' or jsonb_typeof(e->'y') is distinct from 'number' then raise exception 'invalid'; end if;
  if (e->>'x')::numeric<>trunc((e->>'x')::numeric) or (e->>'y')::numeric<>trunc((e->>'y')::numeric) then raise exception 'invalid'; end if;
  if (e->>'x')::numeric<1 or (e->>'y')::numeric<2 or (e->>'x')::numeric+f.w>19 or (e->>'y')::numeric+f.h>13 then raise exception 'out_of_room'; end if;
  x := (e->>'x')::integer; y := (e->>'y')::integer;
  n := coalesce((counts->>f.id)::integer,0)+1;
  counts := jsonb_set(counts,array[f.id],to_jsonb(n));
  allowed := coalesce((owned_items->>f.id)::integer,0)+case when f.starter then case when f.id='plant' then 2 else 1 end else 0 end;
  if n>allowed then raise exception 'not_owned'; end if;
  floor_item := f.id in ('rug','woven-rug','petbed','beanbag');
  if not floor_item then
   for ix in x..x+f.w-1 loop for iy in y..y+f.h-1 loop
    k := ix||','||iy;
    if k=any(occupied) then raise exception 'overlap'; end if;
    occupied := array_append(occupied,k);
   end loop; end loop;
  end if;
 end loop;
 if '9,12'=any(occupied) or '10,12'=any(occupied) then raise exception 'door_blocked'; end if;
 while cursor_at<=cardinality(queue) loop
  cell := queue[cursor_at]; cursor_at := cursor_at+1;
  x := split_part(cell,',',1)::integer; y := split_part(cell,',',2)::integer;
  for ix in x-1..x+1 loop for iy in y-1..y+1 loop
   if abs(ix-x)+abs(iy-y)<>1 or ix<1 or ix>=19 or iy<2 or iy>=13 then continue; end if;
   k := ix||','||iy;
   if not k=any(occupied) and not k=any(visited) then visited := array_append(visited,k); queue := array_append(queue,k); end if;
  end loop; end loop;
 end loop;
 for e in select * from jsonb_array_elements(p_layout) loop
  select * into f from public.furniture_items where id=e->>'item';
  if f.id in ('rug','woven-rug','petbed','beanbag') then continue; end if;
  x := (e->>'x')::integer; y := (e->>'y')::integer; adjacent := false;
  for ix in x..x+f.w-1 loop if (ix||','||(y+f.h))=any(visited) then adjacent := true; end if; end loop;
  if not adjacent then raise exception 'unreachable'; end if;
 end loop;
 update public.player_homes set layout=p_layout,updated_at=now() where user_id=uid;
end $$;
revoke all on function public.home_buy(text),public.home_save_layout(jsonb) from public,anon;
grant execute on function public.home_buy(text),public.home_save_layout(jsonb) to authenticated;
