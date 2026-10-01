-- IlluminatED tutoring flow: tutor applications, guardian consent by email,
-- Stripe payments and email notifications.
-- Run after 0002_accounts_tutoring.sql. Safe to run more than once.
--
-- The app never uses the service role key. Anything that has to happen without
-- a user session (the Stripe webhook) or must not be callable from a browser
-- (looking up another user's email) goes through a SECURITY DEFINER function
-- that checks a shared secret held in private.app_secrets.
--
-- After applying, the owner runs (in the SQL editor, never in a migration):
--   insert into private.app_secrets (name, value) values ('payment_callback_secret', '<same value as PAYMENT_CALLBACK_SECRET>')
--     on conflict (name) do update set value = excluded.value;
--   -- Only once Stripe is live and STRIPE_SECRET_KEY is set:
--   insert into private.app_secrets (name, value) values ('payments_required', 'true')
--     on conflict (name) do update set value = excluded.value;

-- ─────────────────────────────────────────────────────────────
-- Private settings and secrets
-- ─────────────────────────────────────────────────────────────

create table if not exists private.app_secrets (
  name   text primary key check (char_length(name) between 1 and 80),
  value  text not null
);
alter table private.app_secrets enable row level security;
-- No policies and no grants: only the table owner (and SECURITY DEFINER functions it owns) can read it.
revoke all on private.app_secrets from public, anon, authenticated;

create or replace function private.app_setting(setting text) returns text
language sql stable security definer set search_path = '' as $$
  select value from private.app_secrets where name = setting;
$$;

-- True only when the caller passed the server's shared secret (at least 32 characters).
create or replace function private.callback_secret_ok(secret text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  expected text := private.app_setting('payment_callback_secret');
begin
  return expected is not null and char_length(expected) >= 32
     and secret is not null and secret = expected;
end;
$$;

create or replace function private.payments_required() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.app_setting('payments_required'), '') = 'true';
$$;

revoke all on function private.app_setting(text), private.callback_secret_ok(text), private.payments_required()
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Tutor applications
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tutor_applications (
  id              bigint generated always as identity primary key,
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  full_name       text not null check (char_length(full_name) between 2 and 120),
  subjects        text not null check (char_length(subjects) between 2 and 500),
  levels          text[] not null check (cardinality(levels) between 1 and 6
                    and levels <@ array['gcse', 'alevel', 'btec', 'tlevel', 'level23', 'other']),
  experience      text not null check (char_length(experience) between 20 and 3000),
  qualifications  text not null check (char_length(qualifications) between 2 and 2000),
  dbs_status      text not null check (dbs_status in ('enhanced-update-service', 'enhanced', 'none')),
  statement       text not null check (char_length(statement) between 20 and 3000),
  confirmed_adult boolean not null check (confirmed_adult),
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id     uuid references public.profiles (id) on delete set null,
  reviewer_notes  text check (reviewer_notes is null or char_length(reviewer_notes) <= 2000),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tutor_applications_status on public.tutor_applications (status, created_at);
create index if not exists tutor_applications_user on public.tutor_applications (user_id, created_at desc);
create unique index if not exists tutor_applications_one_pending on public.tutor_applications (user_id) where status = 'pending';

-- New applications always start as pending and unreviewed, whatever the browser sends.
create or replace function private.prepare_tutor_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  band text;
  recent integer;
begin
  select age_band into band from learner_details where user_id = new.user_id;
  if band is distinct from '18+' then raise exception 'adults_only'; end if;
  if exists (select 1 from profiles where id = new.user_id and role in ('tutor', 'moderator')) then
    raise exception 'already_tutor';
  end if;
  select count(*) into recent from tutor_applications
    where user_id = new.user_id and created_at > now() - interval '30 days';
  if recent >= 3 then raise exception 'rate_limited'; end if;
  new.status := 'pending';
  new.reviewer_id := null;
  new.reviewer_notes := null;
  new.reviewed_at := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists tutor_applications_prepare on public.tutor_applications;
create trigger tutor_applications_prepare before insert on public.tutor_applications
  for each row execute function private.prepare_tutor_application();
revoke all on function private.prepare_tutor_application() from public, anon, authenticated;

alter table public.tutor_applications enable row level security;
drop policy if exists "applications readable" on public.tutor_applications;
create policy "applications readable" on public.tutor_applications for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_moderator()));
drop policy if exists "members apply" on public.tutor_applications;
create policy "members apply" on public.tutor_applications for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_active_member()));

revoke all on public.tutor_applications from anon, authenticated;
grant select, insert on public.tutor_applications to authenticated;
grant usage on all sequences in schema public to authenticated;

-- Moderators approve or reject. Approving makes the applicant a tutor.
create or replace function private.approve_tutor(application_id bigint, notes text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  applicant uuid;
begin
  if not private.is_moderator() then raise exception 'not_a_moderator'; end if;
  update tutor_applications a
     set status = 'approved', reviewer_id = auth.uid(), reviewer_notes = nullif(left(trim(notes), 2000), ''),
         reviewed_at = now(), updated_at = now()
   where a.id = application_id and a.status = 'pending' and a.user_id <> auth.uid()
     and exists (select 1 from profiles p where p.id = a.user_id and not p.banned)
  returning a.user_id into applicant;
  if applicant is null then return false; end if;
  -- Never downgrade a moderator.
  update profiles set role = 'tutor' where id = applicant and role = 'member';
  return true;
end;
$$;

create or replace function private.reject_tutor(application_id bigint, notes text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_moderator() then raise exception 'not_a_moderator'; end if;
  update tutor_applications
     set status = 'rejected', reviewer_id = auth.uid(), reviewer_notes = nullif(left(trim(notes), 2000), ''),
         reviewed_at = now(), updated_at = now()
   where id = application_id and status = 'pending' and user_id <> auth.uid();
  return found;
end;
$$;
revoke all on function private.approve_tutor(bigint, text), private.reject_tutor(bigint, text) from public, anon, authenticated;

-- The API only exposes the public schema, so the app calls this wrapper. It checks the caller itself
-- (auth.uid() still reads the caller's token inside SECURITY DEFINER functions).
create or replace function public.review_tutor_application(application_id bigint, approve boolean, notes text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_moderator() then raise exception 'not_a_moderator'; end if;
  if approve then
    return private.approve_tutor(application_id, notes);
  end if;
  return private.reject_tutor(application_id, notes);
end;
$$;
revoke all on function public.review_tutor_application(bigint, boolean, text) from public, anon;
grant execute on function public.review_tutor_application(bigint, boolean, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Guardian consent by email link
-- ─────────────────────────────────────────────────────────────

alter table public.request_guardians
  add column if not exists token_hash text check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  add column if not exists token_expires_at timestamptz,
  add column if not exists consented_at timestamptz;
create unique index if not exists request_guardians_token on public.request_guardians (token_hash) where token_hash is not null;

-- The learner saves the guardian row (with the hash of the emailed token). The expiry and consent time
-- are always set here, never trusted from the browser.
create or replace function private.prepare_guardian() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.token_expires_at := case when new.token_hash is null then null else now() + interval '7 days' end;
  new.consented_at := null;
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists request_guardians_prepare on public.request_guardians;
create trigger request_guardians_prepare before insert on public.request_guardians
  for each row execute function private.prepare_guardian();
revoke all on function private.prepare_guardian() from public, anon, authenticated;

-- What the guardian sees before answering. No learner names or contact details.
create or replace function public.guardian_request_summary(token text)
returns table (subject text, help_type text, speed text, price_pence integer, request_status text,
               guardian_ok boolean, expired boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if token is null or char_length(token) not between 32 and 200 then return; end if;
  return query
    select r.subject, r.help_type, r.speed, r.price_pence, r.status, r.guardian_ok, g.token_expires_at < now()
      from request_guardians g join tutor_requests r on r.id = g.request_id
     where g.token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
end;
$$;

-- Returns 'accepted', 'declined', 'expired', 'closed' or 'invalid'. Each link works once.
create or replace function public.guardian_respond(token text, accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare
  g request_guardians%rowtype;
begin
  if token is null or accept is null or char_length(token) not between 32 and 200 then return 'invalid'; end if;
  select * into g from request_guardians
   where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex')
   for update;
  if not found then return 'invalid'; end if;
  if g.token_expires_at is null or g.token_expires_at < now() then return 'expired'; end if;

  if accept then
    update tutor_requests set guardian_ok = true, updated_at = now()
     where id = g.request_id and status = 'open' and needs_guardian;
    if not found then return 'closed'; end if;
    update request_guardians set consented_at = now(), token_hash = null where request_id = g.request_id;
    return 'accepted';
  end if;

  update tutor_requests set status = 'cancelled', updated_at = now()
   where id = g.request_id and status = 'open' and not guardian_ok;
  if not found then return 'closed'; end if;
  update request_guardians set token_hash = null where request_id = g.request_id;
  return 'declined';
end;
$$;

revoke all on function public.guardian_request_summary(text), public.guardian_respond(text, boolean) from public;
grant execute on function public.guardian_request_summary(text), public.guardian_respond(text, boolean) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Payments and notification bookkeeping on requests
-- ─────────────────────────────────────────────────────────────

alter table public.tutor_requests
  add column if not exists paid_at timestamptz,
  add column if not exists stripe_session_id text check (stripe_session_id is null or char_length(stripe_session_id) <= 255),
  add column if not exists refunded_at timestamptz,
  add column if not exists last_notified_at timestamptz;

-- Learners insert their own requests, so these columns must never come from the browser.
create or replace function private.reset_request_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.paid_at := null;
  new.stripe_session_id := null;
  new.refunded_at := null;
  new.last_notified_at := null;
  return new;
end;
$$;
drop trigger if exists tutor_requests_reset_payment on public.tutor_requests;
create trigger tutor_requests_reset_payment before insert on public.tutor_requests
  for each row execute function private.reset_request_payment();
revoke all on function private.reset_request_payment() from public, anon, authenticated;

-- Called by the Stripe webhook, which has no user session. Only valid with the shared secret.
create or replace function public.mark_request_paid(request_id bigint, session_id text, secret text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not private.callback_secret_ok(secret) then raise exception 'forbidden'; end if;
  if session_id is null or char_length(session_id) not between 1 and 255 then raise exception 'invalid_session'; end if;
  update tutor_requests
     set paid_at = now(), stripe_session_id = session_id, updated_at = now()
   where id = request_id and paid_at is null;
  return found;
end;
$$;
revoke all on function public.mark_request_paid(bigint, text, text) from public;
grant execute on function public.mark_request_paid(bigint, text, text) to anon, authenticated;

-- Tutors can only take requests that are consented to and, when payments are required, paid.
create or replace function public.claim_tutor_request(req bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_tutor() then raise exception 'not_a_tutor'; end if;
  update tutor_requests set tutor_id = auth.uid(), status = 'matched', updated_at = now()
    where id = req and status = 'open' and student_id <> auth.uid() and (not needs_guardian or guardian_ok)
      and (not private.payments_required() or (paid_at is not null and refunded_at is null));
  return found;
end;
$$;
revoke all on function public.claim_tutor_request(bigint) from public, anon;
grant execute on function public.claim_tutor_request(bigint) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Tutors can't see under-18 requests until a guardian has consented
-- ─────────────────────────────────────────────────────────────

drop policy if exists "requests readable" on public.tutor_requests;
create policy "requests readable" on public.tutor_requests for select to authenticated
  using (student_id = (select auth.uid()) or tutor_id = (select auth.uid())
         or (status = 'open' and (not needs_guardian or guardian_ok) and (select private.is_tutor()))
         or (select private.is_moderator()));

-- ─────────────────────────────────────────────────────────────
-- Email notifications
-- ─────────────────────────────────────────────────────────────

-- Another user's email, only if the caller shares a tutor request with them.
create or replace function private.notify_email_for(target uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or target is null or target = auth.uid() then return null; end if;
  if not exists (
    select 1 from tutor_requests r
     where (r.student_id = auth.uid() and r.tutor_id = target)
        or (r.tutor_id = auth.uid() and r.student_id = target)
  ) then
    return null;
  end if;
  return (select u.email::text from auth.users u where u.id = target);
end;
$$;
revoke all on function private.notify_email_for(uuid) from public, anon, authenticated;

-- The other party's email on a request, for the app server to send a notification.
-- Also requires the server's shared secret, so a signed-in user can't call it from the browser
-- to learn a learner's or tutor's email address.
create or replace function public.request_party_email(request_id bigint, secret text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  r tutor_requests%rowtype;
begin
  if not private.callback_secret_ok(secret) then raise exception 'forbidden'; end if;
  select * into r from tutor_requests where id = request_id;
  if not found or r.tutor_id is null then return null; end if;
  if r.student_id = auth.uid() then return private.notify_email_for(r.tutor_id); end if;
  if r.tutor_id = auth.uid() then return private.notify_email_for(r.student_id); end if;
  return null;
end;
$$;
revoke all on function public.request_party_email(bigint, text) from public, anon;
grant execute on function public.request_party_email(bigint, text) to authenticated;

-- At most one new-message email per request every 15 minutes. Returns true if the caller should send one.
create or replace function public.claim_message_notification(req bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update tutor_requests set last_notified_at = now()
   where id = req and status in ('open', 'matched')
     and (student_id = auth.uid() or tutor_id = auth.uid())
     and (last_notified_at is null or last_notified_at < now() - interval '15 minutes');
  return found;
end;
$$;
revoke all on function public.claim_message_notification(bigint) from public, anon;
grant execute on function public.claim_message_notification(bigint) to authenticated;
