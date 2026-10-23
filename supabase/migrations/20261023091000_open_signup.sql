-- Public launch: anyone can create an account (no invitation needed).
-- School invitations still attach learners to their school via access_invites.
-- To return to invite-only, set private.signup_mode to 'invite' (see below).
create table if not exists private.launch_settings (key text primary key, value text not null);
alter table private.launch_settings enable row level security;
insert into private.launch_settings (key, value) values ('signup_mode', 'open') on conflict (key) do update set value = excluded.value;

create or replace function private.require_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select value from private.launch_settings where key = 'signup_mode'), 'open') = 'invite'
     and (new.email is null or not exists (select 1 from public.access_invites i where i.email = lower(new.email))) then
    raise exception 'Accounts are invite only. Book a demo at illumed.co.uk/book.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Onboarding checks this before showing the setup form.
create or replace function public.access_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    coalesce((select value from private.launch_settings where key = 'signup_mode'), 'open') = 'open'
    or exists (select 1 from public.learner_details d where d.user_id = (select auth.uid()))
    or exists (select 1 from public.access_invites i join auth.users u on lower(u.email) = i.email where u.id = (select auth.uid()))
    or private.is_platform_admin()
  );
$$;
