-- IlluminatED City characters v2: full-body avatars with 15 categories,
-- rarity tiers and sets. Additive: existing items keep their ids, so any
-- outfit already saved stays valid. See docs/gamification/promotion-panic-design.md.

alter table public.cosmetic_items drop constraint if exists cosmetic_items_slot_check;
alter table public.cosmetic_items add constraint cosmetic_items_slot_check check (slot in
  ('skin','head','eyes','brows','mouth','extras','hair','hairColor','top','bottom','shoes','hat','face','held','pet'));
alter table public.cosmetic_items
  add column if not exists rarity text not null default 'common'
    check (rarity in ('common','rare','epic','legendary')),
  add column if not exists set_id text check (set_id is null or set_id ~ '^[a-z0-9-]{2,40}$');

insert into public.cosmetic_items (id, slot, name, price, unlock, sort, rarity, set_id) values
  ('skin-1', 'skin', 'Tone 1', 0, null, 1, 'common', null),
  ('skin-2', 'skin', 'Tone 2', 0, null, 2, 'common', null),
  ('skin-7', 'skin', 'Tone 3', 0, null, 3, 'common', null),
  ('skin-3', 'skin', 'Tone 4', 0, null, 4, 'common', null),
  ('skin-4', 'skin', 'Tone 5', 0, null, 5, 'common', null),
  ('skin-5', 'skin', 'Tone 6', 0, null, 6, 'common', null),
  ('skin-6', 'skin', 'Tone 7', 0, null, 7, 'common', null),
  ('skin-8', 'skin', 'Tone 8', 0, null, 8, 'common', null),
  ('head-human', 'head', 'Human', 0, null, 9, 'common', null),
  ('head-dog', 'head', 'Good-boy head', 1500, null, 10, 'epic', null),
  ('head-cow', 'head', 'Moo head', 1500, null, 11, 'epic', null),
  ('head-robot', 'head', 'Robot head', 3000, null, 12, 'legendary', 'space'),
  ('head-alien', 'head', 'Alien head', 3000, null, 13, 'legendary', 'space'),
  ('head-lion', 'head', 'Lion head', 0, 'streak:14', 14, 'legendary', null),
  ('eyes-round', 'eyes', 'Round', 0, null, 15, 'common', null),
  ('eyes-sparkle', 'eyes', 'Sparkle', 0, null, 16, 'common', null),
  ('eyes-sleepy', 'eyes', 'Sleepy', 0, null, 17, 'common', null),
  ('eyes-wink', 'eyes', 'Wink', 0, null, 18, 'common', null),
  ('eyes-focused', 'eyes', 'Focused', 0, null, 19, 'common', null),
  ('eyes-dots', 'eyes', 'Dots', 0, null, 20, 'common', null),
  ('brows-soft', 'brows', 'Soft', 0, null, 21, 'common', null),
  ('brows-bold', 'brows', 'Bold', 0, null, 22, 'common', null),
  ('brows-raised', 'brows', 'Raised', 0, null, 23, 'common', null),
  ('brows-fierce', 'brows', 'Fierce', 0, null, 24, 'common', null),
  ('brows-none', 'brows', 'None', 0, null, 25, 'common', null),
  ('mouth-smile', 'mouth', 'Smile', 0, null, 26, 'common', null),
  ('mouth-grin', 'mouth', 'Grin', 0, null, 27, 'common', null),
  ('mouth-laugh', 'mouth', 'Laugh', 0, null, 28, 'common', null),
  ('mouth-smirk', 'mouth', 'Smirk', 0, null, 29, 'common', null),
  ('mouth-cheeky', 'mouth', 'Cheeky', 0, null, 30, 'common', null),
  ('mouth-small', 'mouth', 'Small', 0, null, 31, 'common', null),
  ('extras-none', 'extras', 'None', 0, null, 32, 'common', null),
  ('extras-freckles', 'extras', 'Freckles', 0, null, 33, 'common', null),
  ('extras-rosy', 'extras', 'Rosy cheeks', 0, null, 34, 'common', null),
  ('extras-star', 'extras', 'Star sticker', 200, null, 35, 'rare', 'party'),
  ('extras-plaster', 'extras', 'Plaster', 200, null, 36, 'rare', null),
  ('extras-paint', 'extras', 'Face paint', 600, null, 37, 'epic', 'sporty'),
  ('hair-short', 'hair', 'Short', 0, null, 38, 'common', null),
  ('hair-curly', 'hair', 'Curly', 0, null, 39, 'common', null),
  ('hair-long', 'hair', 'Long', 0, null, 40, 'common', null),
  ('hair-bob', 'hair', 'Bob', 0, null, 41, 'common', null),
  ('hair-ponytail', 'hair', 'Ponytail', 0, null, 42, 'common', null),
  ('hair-buns', 'hair', 'Space buns', 0, null, 43, 'common', null),
  ('hair-buzz', 'hair', 'Buzz cut', 0, null, 44, 'common', null),
  ('hair-bald', 'hair', 'Bald', 0, null, 45, 'common', null),
  ('hair-quiff', 'hair', 'Quiff', 120, null, 46, 'common', null),
  ('hair-braids', 'hair', 'Braids', 150, null, 47, 'common', null),
  ('hair-afro', 'hair', 'Afro', 150, null, 48, 'common', null),
  ('hair-spiky', 'hair', 'Anime spikes', 250, null, 49, 'rare', null),
  ('hair-mohawk', 'hair', 'Mohawk', 300, null, 50, 'rare', null),
  ('haircol-black', 'hairColor', 'Black', 0, null, 51, 'common', null),
  ('haircol-brown', 'hairColor', 'Brown', 0, null, 52, 'common', null),
  ('haircol-blonde', 'hairColor', 'Blonde', 0, null, 53, 'common', null),
  ('haircol-ginger', 'hairColor', 'Ginger', 0, null, 54, 'common', null),
  ('haircol-auburn', 'hairColor', 'Auburn', 0, null, 55, 'common', null),
  ('haircol-purple', 'hairColor', 'Purple', 120, null, 56, 'common', null),
  ('haircol-blue', 'hairColor', 'Blue', 120, null, 57, 'common', null),
  ('haircol-pink', 'hairColor', 'Pink', 120, null, 58, 'common', null),
  ('haircol-green', 'hairColor', 'Green', 120, null, 59, 'common', null),
  ('haircol-silver', 'hairColor', 'Silver', 250, null, 60, 'rare', null),
  ('top-tee', 'top', 'IlluminatED tee', 0, null, 61, 'common', null),
  ('top-hoodie', 'top', 'Comfy hoodie', 0, null, 62, 'common', null),
  ('top-stripes', 'top', 'Stripy tee', 0, null, 63, 'common', null),
  ('top-polo', 'top', 'Office polo', 100, null, 64, 'common', 'office'),
  ('top-knit', 'top', 'Cosy knit', 150, null, 65, 'common', null),
  ('top-apron', 'top', 'Baker''s apron', 150, null, 66, 'common', 'bake'),
  ('top-denim', 'top', 'Denim jacket', 250, null, 67, 'rare', null),
  ('top-jersey', 'top', 'Footy jersey', 250, null, 68, 'rare', 'sporty'),
  ('top-suit', 'top', 'Power suit', 400, null, 69, 'rare', 'office'),
  ('top-tux', 'top', 'Red-carpet tux', 900, null, 70, 'epic', 'royal'),
  ('top-astronaut', 'top', 'Space suit', 1200, null, 71, 'epic', 'space'),
  ('top-cape', 'top', 'Cape of Productivity', 2500, null, 72, 'legendary', 'royal'),
  ('top-labcoat', 'top', 'Dr Ow''s lab coat', 0, 'ceo:st-plasters', 73, 'legendary', 'st-plasters'),
  ('top-hivis', 'top', 'Hi-vis of honour', 0, 'ceo:bodge', 74, 'legendary', 'bodge'),
  ('top-tracksuit', 'top', 'Psyke tracksuit', 0, 'ceo:psyke', 75, 'legendary', 'psyke'),
  ('bottom-jeans', 'bottom', 'Jeans', 0, null, 76, 'common', null),
  ('bottom-joggers', 'bottom', 'Joggers', 0, null, 77, 'common', 'sporty'),
  ('bottom-shorts', 'bottom', 'Shorts', 0, null, 78, 'common', null),
  ('bottom-skirt', 'bottom', 'Pleated skirt', 0, null, 79, 'common', null),
  ('bottom-cargo', 'bottom', 'Cargo trousers', 100, null, 80, 'common', null),
  ('bottom-smart', 'bottom', 'Smart trousers', 250, null, 81, 'rare', 'office'),
  ('bottom-tartan', 'bottom', 'Tartan trousers', 700, null, 82, 'epic', null),
  ('shoes-trainers', 'shoes', 'Trainers', 0, null, 83, 'common', null),
  ('shoes-hightops', 'shoes', 'High-tops', 0, null, 84, 'common', null),
  ('shoes-boots', 'shoes', 'Boots', 100, null, 85, 'common', null),
  ('shoes-sliders', 'shoes', 'Sliders and socks', 150, null, 86, 'common', null),
  ('shoes-smart', 'shoes', 'Smart shoes', 250, null, 87, 'rare', 'office'),
  ('shoes-skates', 'shoes', 'Roller skates', 900, null, 88, 'epic', 'party'),
  ('shoes-rocket', 'shoes', 'Rocket boots', 3000, null, 89, 'legendary', 'space'),
  ('hat-none', 'hat', 'No hat', 0, null, 90, 'common', null),
  ('hat-cap', 'hat', 'Cap', 0, null, 91, 'common', null),
  ('hat-beanie', 'hat', 'Beanie', 100, null, 92, 'common', null),
  ('hat-party', 'hat', 'Party hat', 150, null, 93, 'common', 'party'),
  ('hat-headphones', 'hat', 'Headphones', 300, null, 94, 'rare', 'sporty'),
  ('hat-tophat', 'hat', 'Tiny top hat', 800, null, 95, 'epic', 'royal'),
  ('hat-crown', 'hat', 'Crown', 2500, null, 96, 'legendary', 'royal'),
  ('hat-hardhat', 'hat', 'Tesler hard hat', 0, 'ceo:tesler', 97, 'legendary', 'tesler'),
  ('hat-chef', 'hat', 'Gregz chef hat', 0, 'ceo:gregz', 98, 'legendary', 'gregz'),
  ('hat-explorer', 'hat', 'Explorer hat', 0, 'ceo:atlas', 99, 'legendary', 'atlas'),
  ('hat-grad', 'hat', 'Graduation cap', 0, 'level:10', 100, 'epic', null),
  ('hat-lion', 'hat', 'Tiggy ears', 0, 'streak:7', 101, 'rare', null),
  ('hat-halo', 'hat', 'Halo of good grades', 0, 'level:20', 102, 'epic', null),
  ('face-none', 'face', 'Nothing', 0, null, 103, 'common', null),
  ('face-round', 'face', 'Round glasses', 0, null, 104, 'common', null),
  ('face-star', 'face', 'Star glasses', 250, null, 105, 'rare', 'party'),
  ('face-vr', 'face', 'VR visor', 600, null, 106, 'epic', 'space'),
  ('face-shades', 'face', 'Netflics shades', 0, 'ceo:netflics', 107, 'legendary', 'netflics'),
  ('face-monocle', 'face', 'Judge''s monocle', 0, 'ceo:lawz', 108, 'legendary', 'lawz'),
  ('held-none', 'held', 'Empty hands', 0, null, 109, 'common', null),
  ('held-coffee', 'held', 'Coffee', 0, null, 110, 'common', 'office'),
  ('held-phone', 'held', 'Phone', 0, null, 111, 'common', null),
  ('held-croissant', 'held', 'Croissant', 120, null, 112, 'common', 'bake'),
  ('held-briefcase', 'held', 'Briefcase', 250, null, 113, 'rare', 'office'),
  ('held-mic', 'held', 'Microphone', 300, null, 114, 'rare', 'party'),
  ('held-laptop', 'held', 'Macrosoft laptop', 0, 'ceo:macrosoft', 115, 'legendary', 'macrosoft'),
  ('held-trophy', 'held', 'Gold star trophy', 0, 'ceo:tiny-humans', 116, 'legendary', 'tiny-humans'),
  ('held-compass', 'held', 'Golden compass', 0, 'level:15', 117, 'epic', null),
  ('pet-none', 'pet', 'No pet', 0, null, 118, 'common', null),
  ('pet-hamster', 'pet', 'Hamster in charge', 150, null, 119, 'common', null),
  ('pet-goldfish', 'pet', 'Office goldfish', 300, null, 120, 'rare', 'office'),
  ('pet-cat', 'pet', 'Unimpressed cat', 400, null, 121, 'rare', null),
  ('pet-duck', 'pet', 'Debugging duck', 600, null, 122, 'epic', null),
  ('pet-dragon', 'pet', 'Tiny dragon', 3000, null, 123, 'legendary', 'royal'),
  ('pet-cub', 'pet', 'Tiggy cub', 0, 'level:5', 124, 'epic', null),
  ('pet-robot', 'pet', 'Goggle robot', 0, 'ceo:goggle', 125, 'legendary', 'goggle'),
  ('pet-dog', 'pet', 'Barklays pup', 0, 'ceo:barklays', 126, 'legendary', 'barklays'),
  ('pet-cow', 'pet', 'Tescow calf', 0, 'ceo:tescow', 127, 'legendary', 'tescow')
on conflict (id) do update set
  slot = excluded.slot, name = excluded.name, price = excluded.price, unlock = excluded.unlock,
  sort = excluded.sort, rarity = excluded.rarity, set_id = excluded.set_id;

-- Same rules as before, now covering all 15 categories.
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
    if k not in ('skin','head','eyes','brows','mouth','extras','hair','hairColor','top','bottom','shoes','hat','face','held','pet') then
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
