-- Nobody can create an account on their own: a new login is only accepted if
-- its email has been invited (admin page, "Give access"), after a demo call.
-- Applies to every sign-up route (email and password, magic link, Google).
-- Existing accounts are untouched; they keep logging in as normal.

create or replace function private.require_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or not exists (select 1 from public.access_invites i where i.email = lower(new.email)) then
    raise exception 'Accounts are invite only. Book a demo at illumed.co.uk/book.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists require_invite on auth.users;
create trigger require_invite before insert on auth.users
  for each row execute function private.require_invite();
