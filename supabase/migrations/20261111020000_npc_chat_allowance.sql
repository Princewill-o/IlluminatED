-- A daily allowance for free chat with fictional city residents (separate from Ask Tiggy's study credits).
create table if not exists private.npc_chat_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  used integer not null default 0,
  primary key (user_id, day)
);

create or replace function public.npc_chat_consume() returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); n integer;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  insert into private.npc_chat_usage (user_id, day, used) values (uid, current_date, 1)
  on conflict (user_id, day) do update set used = private.npc_chat_usage.used + 1
  returning used into n;
  if n > 80 then raise exception 'limit_reached'; end if;
  delete from private.npc_chat_usage where user_id = uid and day < current_date - 7;
  return 80 - n;
end;
$$;
revoke all on function public.npc_chat_consume() from public, anon;
grant execute on function public.npc_chat_consume() to authenticated;
