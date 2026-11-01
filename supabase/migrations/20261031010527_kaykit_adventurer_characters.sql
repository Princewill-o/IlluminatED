-- KayKit base characters are free cosmetic choices in the existing head slot.
-- No avatar rows, ownership records, RLS policies or RPCs are changed.
insert into public.cosmetic_items (id, slot, name, price, unlock, sort, rarity, set_id) values
('head-kaykit-ranger', 'head', 'Ranger', 0, null, 0, 'common', null),
('head-kaykit-knight', 'head', 'Knight', 0, null, 1, 'common', null),
('head-kaykit-mage', 'head', 'Mage', 0, null, 2, 'common', null),
('head-kaykit-rogue', 'head', 'Rogue', 0, null, 3, 'common', null),
('head-kaykit-rogue-hooded', 'head', 'Hooded Rogue', 0, null, 4, 'common', null),
('head-kaykit-barbarian', 'head', 'Barbarian', 0, null, 5, 'common', null)
on conflict (id) do update set name = excluded.name, price = 0, unlock = null, rarity = excluded.rarity;
