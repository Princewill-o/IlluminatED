-- Display names only: preserve IDs, ownership, prices and unlock requirements.
update public.cosmetic_items as item
set name = brand.name
from (values
  ('top-tracksuit', 'Nike tracksuit'),
  ('hat-hardhat', 'Tesla hard hat'),
  ('hat-chef', 'Greggs chef hat'),
  ('face-shades', 'Netflix shades'),
  ('held-laptop', 'Microsoft laptop'),
  ('pet-robot', 'Google robot'),
  ('pet-dog', 'Barclays pup'),
  ('pet-cow', 'Tesco calf')
) as brand(id, name)
where item.id = brand.id;
