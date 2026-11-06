-- MegaMart, the in-game online superstore: order in the browser, a courier delivers to your front
-- door after the delivery time, you sign for it and the items go in your pantry to use later.
-- The server prices every basket from private.shop_items; the client never sets a total.
create table if not exists private.shop_items (id text primary key, price integer not null check (price > 0), use_activity text not null);
insert into private.shop_items (id, price, use_activity) values
  ('veg-box', 12, 'meal'),
  ('pasta-kit', 9, 'meal'),
  ('bread-eggs', 6, 'eat'),
  ('fruit-bowl', 7, 'eat'),
  ('meal-deal', 5, 'meal'),
  ('flat-white', 6, 'coffee'),
  ('sports-drink', 3, 'drink'),
  ('popcorn', 4, 'watch'),
  ('shower-gel', 5, 'shower'),
  ('plasters', 8, 'medicine'),
  ('revision-guide', 10, 'study'),
  ('novel', 7, 'relax'),
  ('headphones', 25, 'music'),
  ('candles', 8, 'relax'),
  ('pet-food', 6, 'eat'),
  ('pet-toy', 4, 'arcade')
on conflict (id) do update set price = excluded.price, use_activity = excluded.use_activity;

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lines jsonb not null,
  total integer not null,
  speed text not null check (speed in ('standard', 'express')),
  status text not null default 'on_the_way' check (status in ('on_the_way', 'delivered')),
  created_at timestamptz not null default now(),
  arrives_at timestamptz not null,
  delivered_at timestamptz
);
create index if not exists shop_orders_user on public.shop_orders (user_id, status, arrives_at);
alter table public.shop_orders enable row level security;
create policy "read own shop orders" on public.shop_orders for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.player_pantry (
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null references private.shop_items (id),
  qty integer not null default 0 check (qty >= 0 and qty <= 99),
  primary key (user_id, item)
);
alter table public.player_pantry enable row level security;
create policy "read own pantry" on public.player_pantry for select to authenticated using (user_id = (select auth.uid()));

-- p_lines: [{"id": "veg-box", "qty": 2}, ...]
create or replace function public.shop_checkout(p_lines jsonb, p_speed text) returns public.shop_orders
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); l jsonb; v_price integer; v_qty integer; v_total integer := 0; clean jsonb := '[]'::jsonb; o public.shop_orders;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_speed not in ('standard', 'express') or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 16 then raise exception 'invalid'; end if;
  if (select count(*) from public.shop_orders where user_id = uid and created_at > now() - interval '1 hour') >= 12 then raise exception 'rate_limited'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    select price into v_price from private.shop_items where id = l->>'id';
    v_qty := case when jsonb_typeof(l->'qty') = 'number' then (l->>'qty')::numeric::integer else null end;
    if v_price is null or v_qty is null or v_qty not between 1 and 10 then raise exception 'invalid'; end if;
    v_total := v_total + v_price * v_qty;
    clean := clean || jsonb_build_array(jsonb_build_object('id', l->>'id', 'qty', v_qty));
  end loop;
  v_total := v_total + case when p_speed = 'express' then 5 else 0 end;
  perform private.spend_clout(uid, v_total);
  insert into public.shop_orders (user_id, lines, total, speed, arrives_at)
  values (uid, clean, v_total, p_speed, now() + case when p_speed = 'express' then interval '45 seconds' else interval '3 minutes' end)
  returning * into o;
  return o;
end;
$$;

-- Sign for a parcel at the door (only once it has arrived): the items go in your pantry.
create or replace function public.shop_order_sign(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); o public.shop_orders; l jsonb;
begin
  if uid is null then raise exception 'not_allowed'; end if;
  select * into o from public.shop_orders where id = p_id and user_id = uid and status = 'on_the_way' and arrives_at <= now() for update;
  if not found then return; end if;
  update public.shop_orders set status = 'delivered', delivered_at = now() where id = o.id;
  for l in select * from jsonb_array_elements(o.lines) loop
    insert into public.player_pantry (user_id, item, qty) values (uid, l->>'id', least(99, (l->>'qty')::integer))
    on conflict (user_id, item) do update set qty = least(99, public.player_pantry.qty + excluded.qty);
  end loop;
end;
$$;

-- Use one thing from your pantry. Returns the activity it counts as (eat, meal, shower...).
create or replace function public.pantry_use(p_item text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); v_use text;
begin
  if uid is null then raise exception 'not_allowed'; end if;
  update public.player_pantry set qty = qty - 1 where user_id = uid and item = p_item and qty > 0;
  if not found then raise exception 'none_left'; end if;
  select use_activity into v_use from private.shop_items where id = p_item;
  return v_use;
end;
$$;

revoke all on function public.shop_checkout(jsonb, text) from public, anon;
revoke all on function public.shop_order_sign(uuid) from public, anon;
revoke all on function public.pantry_use(text) from public, anon;
grant execute on function public.shop_checkout(jsonb, text) to authenticated;
grant execute on function public.shop_order_sign(uuid) to authenticated;
grant execute on function public.pantry_use(text) to authenticated;
