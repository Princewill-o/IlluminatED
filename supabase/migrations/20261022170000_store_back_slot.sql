-- Bigger store: a new Back slot (backpacks, wings, jetpack, guitar) worn on the 3D
-- character, seasonal tops, chunky sneakers and more hair colours.

alter table public.cosmetic_items drop constraint if exists cosmetic_items_slot_check;
alter table public.cosmetic_items add constraint cosmetic_items_slot_check check (slot in
  ('skin','head','eyes','brows','mouth','extras','hair','hairColor','top','bottom','shoes',
   'topColor','bottomColor','shoesColor','hat','face','held','pet','brand','back'));

insert into public.cosmetic_items (id, slot, name, price, unlock, sort, rarity, set_id) values
  ('haircol-lilac', 'hairColor', 'Lilac', 150, null, 500, 'common', null),
  ('haircol-mint', 'hairColor', 'Mint', 150, null, 501, 'common', null),
  ('haircol-ruby', 'hairColor', 'Ruby', 150, null, 502, 'common', null),
  ('haircol-gold', 'hairColor', 'Gold', 300, null, 503, 'rare', null),
  ('haircol-frost', 'hairColor', 'Frost', 300, null, 504, 'rare', 'seasonal'),
  ('top-pumpkin', 'top', 'Pumpkin hoodie', 300, null, 505, 'rare', 'halloween'),
  ('top-puffer', 'top', 'Snow puffer', 450, null, 506, 'rare', 'seasonal'),
  ('top-varsity', 'top', 'Varsity jacket', 400, null, 507, 'rare', null),
  ('top-festival', 'top', 'Festival tee', 120, null, 508, 'common', 'seasonal'),
  ('shoes-chunky', 'shoes', 'Chunky sneakers', 350, null, 509, 'rare', null),
  ('back-none', 'back', 'Nothing on your back', 0, null, 510, 'common', null),
  ('back-school', 'back', 'School backpack', 0, null, 511, 'common', null),
  ('back-mini', 'back', 'Mini backpack', 150, null, 512, 'common', null),
  ('back-teddy', 'back', 'Teddy backpack', 400, null, 513, 'rare', null),
  ('back-guitar', 'back', 'Gig guitar', 600, null, 514, 'rare', 'party'),
  ('back-fairy', 'back', 'Fairy wings', 900, null, 515, 'epic', null),
  ('back-bat', 'back', 'Bat wings', 666, null, 516, 'epic', 'halloween'),
  ('back-jetpack', 'back', 'Jetpack', 1500, null, 517, 'epic', 'space'),
  ('back-angel', 'back', 'Angel wings', 2500, null, 518, 'legendary', 'royal')
on conflict (id) do nothing;

-- Saving a look may now include the back slot.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.game_set_avatar(jsonb)'::regprocedure);
  if position('''back''' in d) = 0 then
    -- Older deployments stop at 'pet' (no 'brand'); accept both new slots either way.
    d := replace(d, '''pet'',''brand'')', '''pet'',''brand'',''back'')');
    d := replace(d, '''held'',''pet'')', '''held'',''pet'',''brand'',''back'')');
    if position('''back''' in d) = 0 then raise exception 'game_set_avatar patch failed'; end if;
    execute d;
  end if;
end $$;
