-- Extend the character catalogue with the distinct original blocky designs,
-- plus separately equippable capes for the modern rig and the supplied GLBs.
alter table public.cosmetic_items drop constraint if exists cosmetic_items_slot_check;
alter table public.cosmetic_items add constraint cosmetic_items_slot_check check (slot in
  ('skin','head','eyes','brows','mouth','extras','hair','hairColor','top','bottom','shoes',
   'topColor','bottomColor','shoesColor','hat','face','held','pet','brand','cape'));

insert into public.cosmetic_items (id, slot, name, price, unlock, sort, rarity, set_id) values
  ('head-blocky-classic-hero', 'head', 'City Hero · Classic', 0, null, 509, 'common', null),
  ('head-blocky-classic-knight', 'head', 'Knight · Classic', 0, null, 510, 'common', null),
  ('head-blocky-classic-wizard', 'head', 'Wizard · Classic', 0, null, 511, 'common', null),
  ('head-blocky-classic-pirate', 'head', 'Pirate · Classic', 0, null, 512, 'common', null),
  ('head-blocky-classic-astronaut', 'head', 'Astronaut · Classic', 0, null, 513, 'common', null),
  ('head-blocky-classic-robot', 'head', 'Robot · Classic', 0, null, 514, 'common', null),
  ('head-blocky-classic-zombie', 'head', 'Zombie · Classic', 0, null, 515, 'common', null),
  ('head-blocky-classic-princess', 'head', 'Princess · Classic', 0, null, 516, 'common', null),
  ('cape-none', 'cape', 'No cape', 0, null, 520, 'common', null),
  ('cape-sky', 'cape', 'Skyline cape', 0, null, 521, 'common', 'heroes'),
  ('cape-crimson', 'cape', 'Crimson cape', 0, null, 522, 'common', 'royal'),
  ('cape-emerald', 'cape', 'Emerald cape', 0, null, 523, 'common', 'heroes'),
  ('cape-sunrise', 'cape', 'Sunrise cape', 0, null, 524, 'common', 'heroes')
on conflict (id) do nothing;

create or replace function public.game_set_avatar(p_avatar jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  k text;
  v text;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_avatar is null or jsonb_typeof(p_avatar) <> 'object' or octet_length(p_avatar::text) > 2000 then
    raise exception 'invalid_avatar';
  end if;
  for k, v in select key, value from jsonb_each_text(p_avatar) loop
    if k not in ('skin','head','eyes','brows','mouth','extras','hair','hairColor','top','bottom','shoes',
                 'topColor','bottomColor','shoesColor','hat','face','held','pet','brand','cape') then
      raise exception 'invalid_avatar';
    end if;
    if not exists (
      select 1 from public.cosmetic_items i
      where i.id = v and i.slot = k and (
        (i.price = 0 and i.unlock is null)
        or exists (select 1 from public.player_items p where p.user_id = uid and p.item_id = i.id))
    ) then
      raise exception 'not_owned';
    end if;
  end loop;
  insert into public.player_stats (user_id, avatar) values (uid, p_avatar)
  on conflict (user_id) do update set avatar = excluded.avatar, updated_at = now();
end;
$$;
revoke all on function public.game_set_avatar(jsonb) from public, anon;
grant execute on function public.game_set_avatar(jsonb) to authenticated;
