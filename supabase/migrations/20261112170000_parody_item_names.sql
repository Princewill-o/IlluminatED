-- Display names only: put back the parody brand names the game uses (no real company names).
-- IDs, ownership, prices and unlock requirements are unchanged.
update public.cosmetic_items as item
set name = parody.name
from (values
  ('top-tracksuit', 'Psyke tracksuit'),
  ('hat-hardhat', 'Tesler hard hat'),
  ('hat-chef', 'Gregz chef hat'),
  ('face-shades', 'Netflics shades'),
  ('held-laptop', 'Macrosoft laptop'),
  ('pet-robot', 'Goggle robot'),
  ('pet-dog', 'Barklays pup'),
  ('pet-cow', 'Tescow calf')
) as parody(id, name)
where item.id = parody.id;
