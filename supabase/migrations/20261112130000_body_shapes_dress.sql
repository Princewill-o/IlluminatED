-- Characters now come in two builds, plus a free summer dress. Saving an avatar accepts the new
-- 'body' slot; everything else about ownership checks is unchanged.
alter table public.cosmetic_items drop constraint if exists cosmetic_items_slot_check;
alter table public.cosmetic_items add constraint cosmetic_items_slot_check check (slot in
  ('body','skin','head','eyes','brows','mouth','extras','hair','hairColor','top','bottom','shoes',
   'topColor','bottomColor','shoesColor','hat','face','held','pet','brand','cape'));

insert into public.cosmetic_items (id, slot, name, price, unlock, sort, rarity, set_id) values
  ('body-1', 'body', 'Straight build', 0, null, 1, 'common', null),
  ('body-2', 'body', 'Curvy build', 0, null, 2, 'common', null),
  ('top-dress', 'top', 'Summer dress', 0, null, 139, 'common', null)
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
    if k not in ('body','skin','head','eyes','brows','mouth','extras','hair','hairColor','top','bottom','shoes',
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
