-- Account guards
-- Run after 0002_accounts_tutoring.sql.
--
-- A learner's age range decides whether tutors need a parent or guardian's OK,
-- so once it's saved the learner can't change it themselves. Moderators can,
-- and so can the service role / SQL editor (no signed-in user), for fixes
-- people ask for through the contact page.

create or replace function private.lock_age_band() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.age_band is not null
     and new.age_band is distinct from old.age_band
     and coalesce((select auth.role()), '') in ('authenticated', 'anon')
     and not (select private.is_moderator()) then
    raise exception 'age_band_locked'
      using hint = 'Your age range can''t be changed once it''s set. Ask us via the contact page if it''s wrong.';
  end if;
  return new;
end;
$$;
revoke all on function private.lock_age_band() from public, anon, authenticated;

drop trigger if exists learner_details_lock_age_band on public.learner_details;
create trigger learner_details_lock_age_band before update on public.learner_details
  for each row execute function private.lock_age_band();
