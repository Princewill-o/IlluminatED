-- Add the CC0 Blocky Characters sample pack to the existing character picker.
insert into public.cosmetic_items (id, slot, name, price, unlock, sort, rarity, set_id) values
  ('head-blocky-hero', 'head', 'City Hero', 0, null, 500, 'common', null),
  ('head-blocky-knight', 'head', 'Knight', 0, null, 501, 'common', null),
  ('head-blocky-wizard', 'head', 'Wizard', 0, null, 502, 'common', null),
  ('head-blocky-pirate', 'head', 'Pirate', 0, null, 503, 'common', null),
  ('head-blocky-astronaut', 'head', 'Astronaut', 0, null, 504, 'common', null),
  ('head-blocky-robot', 'head', 'Robot', 0, null, 505, 'common', null),
  ('head-blocky-zombie', 'head', 'Zombie', 0, null, 506, 'common', null),
  ('head-blocky-princess', 'head', 'Princess', 0, null, 507, 'common', null),
  ('head-blocky-princess-rose', 'head', 'Rose Princess', 0, null, 508, 'common', null)
on conflict (id) do nothing;
