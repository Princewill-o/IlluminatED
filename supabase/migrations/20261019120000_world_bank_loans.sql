-- Bank loans are server-owned so changing browser storage cannot erase a debt.
create table public.world_bank_loans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  principal integer not null check (principal in (100, 250, 500)),
  balance integer not null check (balance >= 0),
  due_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'court', 'paid')),
  updated_at timestamptz not null default now()
);
alter table public.world_bank_loans enable row level security;
revoke all on public.world_bank_loans from public, anon, authenticated;

create or replace function public.world_bank_borrow(p_amount integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); l public.world_bank_loans; wallet integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_amount not in (100,250,500) then raise exception 'invalid_amount'; end if;
  insert into public.player_stats (user_id, clout) values (uid, p_amount)
  on conflict (user_id) do update set clout = public.player_stats.clout + excluded.clout, updated_at = now();
  select clout into wallet from public.player_stats where user_id=uid;
  insert into public.world_bank_loans(user_id, principal, balance, due_at, status)
    values(uid,p_amount,ceil(p_amount * 1.1)::integer,now()+interval '45 minutes','active')
  on conflict(user_id) do update set principal=excluded.principal,balance=excluded.balance,due_at=excluded.due_at,status='active',updated_at=now()
  where public.world_bank_loans.balance=0;
  if not found then raise exception 'existing_loan'; end if;
  select * into l from public.world_bank_loans where user_id=uid;
  return jsonb_build_object('balance',l.balance,'principal',l.principal,'due_at',l.due_at,'status',l.status,'clout',wallet);
end;
$$;

create or replace function public.world_bank_repay() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); l public.world_bank_loans; wallet integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into l from public.world_bank_loans where user_id=uid for update;
  if not found or l.balance=0 then raise exception 'no_loan'; end if;
  perform private.spend_clout(uid,l.balance);
  update public.world_bank_loans set balance=0,status='paid',updated_at=now() where user_id=uid;
  select clout into wallet from public.player_stats where user_id=uid;
  return jsonb_build_object('balance',0,'status','paid','clout',wallet);
end;
$$;

create or replace function public.world_bank_status() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); l public.world_bank_loans;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into l from public.world_bank_loans where user_id=uid for update;
  if not found then return jsonb_build_object('balance',0,'status','none'); end if;
  if l.balance>0 and l.status='active' and l.due_at<=now() then
    update public.world_bank_loans set status='court',updated_at=now() where user_id=uid returning * into l;
  end if;
  return jsonb_build_object('balance',l.balance,'principal',l.principal,'due_at',l.due_at,'status',l.status);
end;
$$;

revoke all on function public.world_bank_borrow(integer), public.world_bank_repay(), public.world_bank_status() from public, anon;
grant execute on function public.world_bank_borrow(integer), public.world_bank_repay(), public.world_bank_status() to authenticated;
