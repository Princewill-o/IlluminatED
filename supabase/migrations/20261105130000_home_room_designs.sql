-- Room designs: paint, wallpaper, floor and lights per home, and the cosy cutaway furniture collection.
alter table public.player_homes add column if not exists room jsonb not null default '{}'::jsonb check (jsonb_typeof(room) = 'object' and octet_length(room::text) < 600);

insert into public.furniture_items (id, price, w, h, starter) values
 ('clothes-rail',450,3,1,false),('tall-bookcase',600,2,1,false),('gaming-chair',550,1,1,false),('pc-desk',1200,4,2,false),
 ('bench-ottoman',400,3,1,false),('long-dresser',700,4,1,false),('bedside',200,1,1,false),('hanging-plant',250,1,1,false),
 ('palm',300,1,1,false),('leaning-art',350,1,1,false),('laundry-basket',120,1,1,false),('macrame',300,1,1,false),
 ('loveseat',900,3,2,false),('stool',150,1,1,false)
on conflict (id) do nothing;

create or replace function public.home_set_room(p_room jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); k text; v jsonb;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_room is null or jsonb_typeof(p_room) <> 'object' or octet_length(p_room::text) > 500 then raise exception 'invalid'; end if;
  for k, v in select key, value from jsonb_each(p_room) loop
    if k in ('wall','side','floor','trim','wainscot') then
      if not (v = 'null'::jsonb or (jsonb_typeof(v) = 'string' and (v #>> '{}') ~* '^#[0-9a-f]{6}$')) then raise exception 'invalid'; end if;
    elsif k = 'design' then
      if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[a-z0-9-]{2,30}$' then raise exception 'invalid'; end if;
    elsif k = 'pattern' then
      if (v #>> '{}') not in ('plain','leaf','stripe','panel','check','grid') then raise exception 'invalid'; end if;
    elsif k = 'lights' then
      if (v #>> '{}') not in ('none','fairy','stars','neon') then raise exception 'invalid'; end if;
    elsif k = 'plinth' then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'invalid'; end if;
    else raise exception 'invalid'; end if;
  end loop;
  insert into public.player_homes (user_id, room) values (uid, p_room)
  on conflict (user_id) do update set room = excluded.room, updated_at = now();
end;
$$;
revoke all on function public.home_set_room(jsonb) from public, anon;
grant execute on function public.home_set_room(jsonb) to authenticated;
