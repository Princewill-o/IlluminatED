-- Deliveries: anything you buy (a car, store items, furniture) is brought to
-- your front door by a courier. Purchases create the delivery automatically;
-- you sign for it at home.
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('car', 'outfit', 'furniture')),
  item text not null,
  status text not null default 'on_the_way' check (status in ('on_the_way', 'delivered')),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists deliveries_user on public.deliveries (user_id, status, created_at);
alter table public.deliveries enable row level security;
create policy "read own deliveries" on public.deliveries for select to authenticated using (user_id = (select auth.uid()));

create or replace function private.deliver_car() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.deliveries (user_id, kind, item) values (new.user_id, 'car', new.car);
  return new;
end; $$;
create or replace trigger deliver_car after insert on public.player_cars for each row execute function private.deliver_car();

create or replace function private.deliver_item() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.cosmetic_items c where c.id = new.item_id and c.price > 0 and c.unlock is null) then
    insert into public.deliveries (user_id, kind, item) values (new.user_id, 'outfit', new.item_id);
  end if;
  return new;
end; $$;
create or replace trigger deliver_item after insert on public.player_items for each row execute function private.deliver_item();

create or replace function private.deliver_furniture() returns trigger language plpgsql security definer set search_path = '' as $$
declare k text; before_count integer; after_count integer;
begin
  for k in select jsonb_object_keys(coalesce(new.furniture, '{}'::jsonb)) loop
    after_count := coalesce((new.furniture->>k)::int, 0);
    before_count := coalesce((old.furniture->>k)::int, 0);
    if after_count > before_count then
      insert into public.deliveries (user_id, kind, item) select new.user_id, 'furniture', k from generate_series(1, after_count - before_count);
    end if;
  end loop;
  return new;
end; $$;
create or replace trigger deliver_furniture after update of furniture on public.player_homes for each row execute function private.deliver_furniture();

create or replace function public.delivery_sign(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_allowed'; end if;
  update public.deliveries set status = 'delivered', delivered_at = now()
  where id = p_id and user_id = (select auth.uid()) and status = 'on_the_way';
end; $$;
revoke all on function public.delivery_sign(uuid) from public, anon;
grant execute on function public.delivery_sign(uuid) to authenticated;
revoke all on function private.deliver_car() from public, anon, authenticated;
revoke all on function private.deliver_item() from public, anon, authenticated;
revoke all on function private.deliver_furniture() from public, anon, authenticated;
