-- Chibi characters: a "brand" slot for the logo on your top. All brands are free
-- and fictional. Additive: existing outfits stay valid.

alter table public.cosmetic_items drop constraint if exists cosmetic_items_slot_check;
alter table public.cosmetic_items add constraint cosmetic_items_slot_check check (slot in
  ('skin','head','eyes','brows','mouth','extras','hair','hairColor','top','bottom','shoes',
   'topColor','bottomColor','shoesColor','hat','face','held','pet','brand'));

insert into public.cosmetic_items (id, slot, name, price, unlock, sort, rarity, set_id) values
  ('brand-none', 'brand', 'No logo', 0, null, 400, 'common', null),
  ('brand-illuminated', 'brand', 'IlluminatED', 0, null, 401, 'common', null),
  ('brand-volt', 'brand', 'Volt', 0, null, 402, 'common', null),
  ('brand-northwind', 'brand', 'Northwind', 0, null, 403, 'common', null),
  ('brand-thamesline', 'brand', 'Thamesline', 0, null, 404, 'common', null),
  ('brand-peckham', 'brand', 'Peckham Supply', 0, null, 405, 'common', null),
  ('brand-camden', 'brand', 'Camden & Co', 0, null, 406, 'common', null),
  ('brand-kowloon', 'brand', 'Kowloon Club', 0, null, 407, 'common', null),
  ('brand-orbit', 'brand', 'Orbit', 0, null, 408, 'common', null)
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
                 'topColor','bottomColor','shoesColor','hat','face','held','pet','brand') then
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

-- Lumen League hero suits (original characters), unlocked from the Season Pass.
insert into public.cosmetic_items (id, slot, name, price, unlock, sort, rarity, set_id) values
  ('top-hero-photon', 'top', 'Photon suit', 0, 'pass:1', 420, 'epic', 'heroes'),
  ('top-hero-byte', 'top', 'Byte suit', 0, 'pass:3', 421, 'epic', 'heroes'),
  ('top-hero-helix', 'top', 'Helix suit', 0, 'pass:5', 422, 'epic', 'heroes'),
  ('top-hero-catalyst', 'top', 'Catalyst suit', 0, 'pass:7', 423, 'epic', 'heroes'),
  ('top-hero-quill', 'top', 'Quill suit', 0, 'pass:10', 424, 'legendary', 'heroes'),
  ('top-hero-quotient', 'top', 'Captain Quotient suit', 0, 'pass:15', 425, 'legendary', 'heroes')
on conflict (id) do nothing;
