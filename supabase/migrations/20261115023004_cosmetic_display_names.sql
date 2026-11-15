-- Match the game wardrobe catalogue while keeping item IDs and unlock requirements.
update public.cosmetic_items as item
set name = display.name
from (values
  ('top-tracksuit', 'Nike tracksuit'),
  ('hat-hardhat', 'Tesla hard hat'),
  ('hat-chef', 'Greggs chef hat'),
  ('face-shades', 'Netflix shades'),
  ('held-laptop', 'Microsoft laptop'),
  ('pet-robot', 'Google robot'),
  ('pet-dog', 'Barclays pup'),
  ('pet-cow', 'Tesco calf')
) as display(id, name)
where item.id = display.id;
