-- Worlds, employer offices, advice, office hours and safe messaging.
--
-- Safety model (agreed with the owner, see docs/gamification/worlds-and-employers.md):
-- * World channels are private Realtime channels: signed-in, non-banned members only.
--   There is no free-text chat in the world, only emotes and preset phrases.
-- * Employers prove they work somewhere by confirming a code sent to their work
--   email (free-mail domains refused). Their company gets an office map.
-- * Messages between a learner and verified staff:
--     18+ learner  -> end-to-end encrypted (server stores ciphertext only)
--     under-18     -> only after a parent/carer approves by email; stored in
--                     plain text, checked for contact details and blocked terms,
--                     visible to moderators and reportable.
-- * Learners cannot message other learners.

-- ─────────────────────────────────────────────────────────────
-- Realtime: who may join world channels
-- ─────────────────────────────────────────────────────────────

create policy "members receive world channels" on realtime.messages for select to authenticated
  using (realtime.topic() like 'world:%' and (select private.is_active_member()));
create policy "members send in world channels" on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'world:%' and (select private.is_active_member()));

-- ─────────────────────────────────────────────────────────────
-- Organisations (verified employers)
-- ─────────────────────────────────────────────────────────────

create table public.organisations (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name         text not null check (char_length(name) between 2 and 60),
  domain       extensions.citext not null unique check (domain ~* '^[a-z0-9.-]+\.[a-z]{2,}$'),
  sector       text not null check (sector in ('tech','finance','law','health','engineering','construction','creative','retail','public','education','consulting','energy','other')),
  website      text check (website is null or website ~* '^https://[^\s]{3,200}$'),
  about        text check (about is null or char_length(about) <= 600),
  accent       text not null default '#6bc6ff' check (accent ~ '^#[0-9a-f]{6}$'),
  status       text not null default 'verified' check (status in ('verified','suspended')),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.org_members (
  org_id       uuid not null references public.organisations (id) on delete cascade,
  user_id      uuid not null unique references public.profiles (id) on delete cascade,
  role         text not null default 'mentor' check (role in ('owner','mentor')),
  job_title    text check (job_title is null or char_length(job_title) between 2 and 80),
  work_email   extensions.citext not null,
  verified_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table private.employer_codes (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  org_name    text not null,
  sector      text not null,
  website     text,
  job_title   text,
  email       extensions.citext not null,
  domain      extensions.citext not null,
  code_hash   text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  sent        integer not null default 1,
  window_start timestamptz not null default now()
);
alter table private.employer_codes enable row level security;

create or replace function private.free_mail(domain text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(domain) = any (array[
    'gmail.com','googlemail.com','outlook.com','hotmail.com','hotmail.co.uk','live.com','live.co.uk','msn.com',
    'yahoo.com','yahoo.co.uk','ymail.com','icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com',
    'gmx.com','gmx.co.uk','mail.com','zoho.com','yandex.com','btinternet.com','sky.com','virginmedia.com',
    'talktalk.net','tiscali.co.uk','hey.com','fastmail.com','tutanota.com']);
$$;

create or replace function private.org_member_of(uid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.org_id from public.org_members m join public.organisations o on o.id = m.org_id
  where m.user_id = uid and o.status = 'verified';
$$;

-- Called by the server (with the shared secret) after it emails the code.
create or replace function public.employer_request_code(
  p_name text, p_sector text, p_website text, p_title text, p_email text, p_code_hash text, p_secret text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  v_domain text := lower(split_part(p_email, '@', 2));
  r private.employer_codes;
begin
  if not private.billing_secret_ok(p_secret) then raise exception 'not_allowed'; end if;
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if p_email !~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then raise exception 'invalid_email'; end if;
  if private.free_mail(v_domain) then raise exception 'free_mail'; end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 60 then raise exception 'invalid_name'; end if;
  if p_sector not in ('tech','finance','law','health','engineering','construction','creative','retail','public','education','consulting','energy','other') then
    raise exception 'invalid_sector';
  end if;
  if exists (select 1 from public.org_members m where m.user_id = uid) then raise exception 'already_member'; end if;
  if exists (select 1 from public.organisations o where o.domain = v_domain and o.status = 'suspended') then raise exception 'suspended'; end if;
  select * into r from private.employer_codes where user_id = uid;
  if found and r.window_start > now() - interval '1 hour' and r.sent >= 5 then raise exception 'rate_limited'; end if;
  insert into private.employer_codes (user_id, org_name, sector, website, job_title, email, domain, code_hash, expires_at)
  values (uid, trim(p_name), p_sector, nullif(trim(p_website), ''), nullif(trim(p_title), ''), lower(p_email), v_domain, p_code_hash, now() + interval '15 minutes')
  on conflict (user_id) do update set
    org_name = excluded.org_name, sector = excluded.sector, website = excluded.website, job_title = excluded.job_title,
    email = excluded.email, domain = excluded.domain, code_hash = excluded.code_hash, expires_at = excluded.expires_at,
    attempts = 0,
    sent = case when private.employer_codes.window_start > now() - interval '1 hour' then private.employer_codes.sent + 1 else 1 end,
    window_start = case when private.employer_codes.window_start > now() - interval '1 hour' then private.employer_codes.window_start else now() end;
end;
$$;

-- The employer types the code from their inbox. Creates or joins the organisation.
create or replace function public.employer_verify(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  r private.employer_codes;
  v_org public.organisations;
  v_slug text;
  v_role text := 'mentor';
  n integer := 1;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into r from private.employer_codes where user_id = uid for update;
  if not found then raise exception 'no_code'; end if;
  if r.expires_at < now() then raise exception 'expired'; end if;
  if r.attempts >= 5 then raise exception 'too_many_attempts'; end if;
  if p_code is null or encode(sha256(convert_to(trim(p_code), 'UTF8')), 'hex') <> r.code_hash then
    update private.employer_codes set attempts = attempts + 1 where user_id = uid;
    raise exception 'wrong_code';
  end if;

  select * into v_org from public.organisations where domain = r.domain;
  if not found then
    v_slug := trim(both '-' from regexp_replace(lower(r.org_name), '[^a-z0-9]+', '-', 'g'));
    if char_length(v_slug) < 2 then v_slug := 'company'; end if;
    v_slug := left(v_slug, 36);
    while exists (select 1 from public.organisations o where o.slug = v_slug) loop
      n := n + 1;
      v_slug := left(v_slug, 36) || '-' || n;
    end loop;
    insert into public.organisations (slug, name, domain, sector, website, created_by, accent)
    values (v_slug, r.org_name, r.domain, r.sector,
            case when r.website ~* '^https://' then r.website else null end, uid,
            (array['#6bc6ff','#ffd166','#ff8fd1','#5fd3a5','#c6f36b','#ffb26b','#c49bff','#ff7a6b'])[1 + floor(random() * 8)::int])
    returning * into v_org;
    v_role := 'owner';
  elsif v_org.status <> 'verified' then
    raise exception 'suspended';
  end if;

  insert into public.org_members (org_id, user_id, role, job_title, work_email)
  values (v_org.id, uid, v_role, r.job_title, r.email);
  delete from private.employer_codes where user_id = uid;

  -- Staff accounts are adults; give them a minimal profile so the app opens straight away.
  insert into public.learner_details (user_id, stage, year_group, age_band, subjects, tutorial_completed_at)
  values (uid, 'other', 'adult', '18+', '[]'::jsonb, now())
  on conflict (user_id) do nothing;

  return jsonb_build_object('slug', v_org.slug, 'name', v_org.name, 'role', v_role);
end;
$$;

alter table public.organisations enable row level security;
alter table public.org_members enable row level security;
revoke all on public.organisations, public.org_members from public, anon, authenticated;
grant select on public.organisations, public.org_members to authenticated;
grant update (about, website, accent, sector) on public.organisations to authenticated;
grant update (job_title) on public.org_members to authenticated;
grant delete on public.org_members to authenticated;

create policy "verified organisations visible" on public.organisations for select to authenticated
  using (status = 'verified' or (select private.is_moderator()));
create policy "owners edit their organisation" on public.organisations for update to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = organisations.id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists (select 1 from public.org_members m where m.org_id = organisations.id and m.user_id = (select auth.uid()) and m.role = 'owner'));
create policy "members visible" on public.org_members for select to authenticated using (true);
create policy "members edit own title" on public.org_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "leave or owner removes" on public.org_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.org_members o where o.org_id = org_members.org_id and o.user_id = (select auth.uid()) and o.role = 'owner')
    or (select private.is_moderator())
  );

-- ─────────────────────────────────────────────────────────────
-- Advice posts and office hours
-- ─────────────────────────────────────────────────────────────

create table public.org_advice (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.organisations (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 5 and 120),
  body        text not null check (char_length(body) between 10 and 2000),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index org_advice_org on public.org_advice (org_id, created_at desc);

create or replace function private.check_safe_text() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t text := coalesce(new.title, '') || ' ' || coalesce(new.body, '');
begin
  if t ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' or regexp_replace(t, '[\s().-]', '', 'g') ~ '(\+44|0)7\d{9}' then
    raise exception 'contact_details';
  end if;
  if exists (select 1 from public.blocked_terms b where t ilike '%' || b.term || '%') then
    raise exception 'blocked_term';
  end if;
  return new;
end;
$$;
create trigger org_advice_check before insert or update on public.org_advice
  for each row execute function private.check_safe_text();

create table public.office_slots (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations (id) on delete cascade,
  staff_id    uuid not null references public.profiles (id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  room        text not null default 'Meeting Room A' check (room in ('Meeting Room A','Meeting Room B')),
  booked_by   uuid references public.profiles (id) on delete set null,
  booked_at   timestamptz,
  cancelled   boolean not null default false,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '60 minutes')
);
create index office_slots_org on public.office_slots (org_id, starts_at);
create index office_slots_booked on public.office_slots (booked_by, starts_at) where booked_by is not null;

alter table public.org_advice enable row level security;
alter table public.office_slots enable row level security;
revoke all on public.org_advice, public.office_slots from public, anon, authenticated;
grant select, insert, delete on public.org_advice to authenticated;
grant select, insert, delete on public.office_slots to authenticated;
grant update (cancelled) on public.office_slots to authenticated;
grant usage on all sequences in schema public to authenticated;

create policy "advice readable" on public.org_advice for select to authenticated
  using (not hidden and exists (select 1 from public.organisations o where o.id = org_id and o.status = 'verified'));
create policy "staff post advice" on public.org_advice for insert to authenticated
  with check (author_id = (select auth.uid()) and private.org_member_of((select auth.uid())) = org_id);
create policy "author, owner or moderator removes advice" on public.org_advice for delete to authenticated
  using (author_id = (select auth.uid())
    or exists (select 1 from public.org_members m where m.org_id = org_advice.org_id and m.user_id = (select auth.uid()) and m.role = 'owner')
    or (select private.is_moderator()));

create policy "slots visible" on public.office_slots for select to authenticated
  using (exists (select 1 from public.organisations o where o.id = org_id and o.status = 'verified'));
create policy "staff add own slots" on public.office_slots for insert to authenticated
  with check (staff_id = (select auth.uid()) and private.org_member_of((select auth.uid())) = org_id
    and starts_at > now() and booked_by is null);
create policy "staff remove own unbooked slots" on public.office_slots for delete to authenticated
  using (staff_id = (select auth.uid()) and booked_by is null);
create policy "staff or booker cancels" on public.office_slots for update to authenticated
  using (staff_id = (select auth.uid()) or booked_by = (select auth.uid()))
  with check (staff_id = (select auth.uid()) or booked_by = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Messaging
-- ─────────────────────────────────────────────────────────────

create table public.user_keys (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  public_key  jsonb not null check (jsonb_typeof(public_key) = 'object' and octet_length(public_key::text) < 1000),
  updated_at  timestamptz not null default now()
);

create table public.dm_threads (
  id               uuid primary key default gen_random_uuid(),
  learner_id       uuid not null references public.profiles (id) on delete cascade,
  staff_id         uuid not null references public.profiles (id) on delete cascade,
  org_id           uuid not null references public.organisations (id) on delete cascade,
  mode             text not null check (mode in ('e2ee','moderated')),
  guardian_status  text not null check (guardian_status in ('not_needed','pending','approved','declined')),
  closed           boolean not null default false,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  unique (learner_id, staff_id),
  check (learner_id <> staff_id),
  check ((mode = 'e2ee') = (guardian_status = 'not_needed'))
);
create index dm_threads_staff on public.dm_threads (staff_id, last_message_at desc);
create index dm_threads_learner on public.dm_threads (learner_id, last_message_at desc);

create table private.dm_guardians (
  thread_id     uuid primary key references public.dm_threads (id) on delete cascade,
  email         extensions.citext not null,
  token_hash    text check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  expires_at    timestamptz not null,
  responded_at  timestamptz
);
alter table private.dm_guardians enable row level security;

create table public.dm_messages (
  id          bigint generated always as identity primary key,
  thread_id   uuid not null references public.dm_threads (id) on delete cascade,
  sender_id   uuid not null references auth.users (id) on delete cascade,
  body        text check (body is null or char_length(body) between 1 and 2000),
  ciphertext  text check (ciphertext is null or char_length(ciphertext) between 1 and 12000),
  iv          text check (iv is null or char_length(iv) between 8 and 64),
  created_at  timestamptz not null default now(),
  check ((body is null) <> (ciphertext is null)),
  check ((ciphertext is null) = (iv is null))
);
create index dm_messages_thread on public.dm_messages (thread_id, id);

create table public.dm_reports (
  id           bigint generated always as identity primary key,
  message_id   bigint not null references public.dm_messages (id) on delete cascade,
  reporter_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason       text not null check (reason in ('bullying','personal-info','inappropriate','grooming','spam','other')),
  -- For encrypted messages the reporter's device decrypts and shares just this message.
  disclosed    text check (disclosed is null or char_length(disclosed) <= 2000),
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (message_id, reporter_id)
);

create or replace function private.is_thread_party(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dm_threads d where d.id = t and (select auth.uid()) in (d.learner_id, d.staff_id));
$$;

create or replace function private.dm_check_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  th public.dm_threads;
  recent integer;
begin
  select * into th from public.dm_threads where id = new.thread_id;
  if th.closed then raise exception 'thread_closed'; end if;
  if th.guardian_status not in ('not_needed','approved') then raise exception 'awaiting_guardian'; end if;
  if th.mode = 'e2ee' and new.ciphertext is null then raise exception 'must_encrypt'; end if;
  if th.mode = 'moderated' then
    if new.body is null then raise exception 'must_be_plain'; end if;
    if new.body ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' or regexp_replace(new.body, '[\s().-]', '', 'g') ~ '(\+44|0)7\d{9}'
       or new.body ~* '(snapchat|snap me|whatsapp|instagram|insta|telegram|discord|tiktok)' then
      raise exception 'contact_details';
    end if;
    if exists (select 1 from public.blocked_terms b where new.body ilike '%' || b.term || '%') then raise exception 'blocked_term'; end if;
  end if;
  select count(*) into recent from public.dm_messages m where m.sender_id = new.sender_id and m.created_at > now() - interval '1 minute';
  if recent >= 10 then raise exception 'rate_limited'; end if;
  new.created_at := now();
  update public.dm_threads set last_message_at = now() where id = new.thread_id;
  return new;
end;
$$;
create trigger dm_messages_check before insert on public.dm_messages
  for each row execute function private.dm_check_message();

alter table public.user_keys enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_reports enable row level security;
revoke all on public.user_keys, public.dm_threads, public.dm_messages, public.dm_reports from public, anon, authenticated;
grant select, insert, update on public.user_keys to authenticated;
grant select on public.dm_threads to authenticated;
grant update (closed) on public.dm_threads to authenticated;
grant select, insert on public.dm_messages to authenticated;
grant select, insert, update on public.dm_reports to authenticated;

create policy "public keys readable" on public.user_keys for select to authenticated using (true);
create policy "own key insert" on public.user_keys for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own key update" on public.user_keys for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "parties and moderators see threads" on public.dm_threads for select to authenticated
  using ((select auth.uid()) in (learner_id, staff_id) or (mode = 'moderated' and (select private.is_moderator())));
create policy "parties close threads" on public.dm_threads for update to authenticated
  using ((select auth.uid()) in (learner_id, staff_id)) with check ((select auth.uid()) in (learner_id, staff_id));

create policy "parties read messages; moderators read moderated" on public.dm_messages for select to authenticated
  using (private.is_thread_party(thread_id)
    or ((select private.is_moderator()) and exists (select 1 from public.dm_threads d where d.id = thread_id and d.mode = 'moderated')));
create policy "parties send" on public.dm_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.is_thread_party(thread_id) and (select private.is_active_member()));

create policy "parties report" on public.dm_reports for insert to authenticated
  with check (reporter_id = (select auth.uid())
    and exists (select 1 from public.dm_messages m where m.id = message_id and private.is_thread_party(m.thread_id)));
create policy "moderators read reports" on public.dm_reports for select to authenticated using ((select private.is_moderator()));
create policy "moderators resolve reports" on public.dm_reports for update to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));

-- Opens (or reopens) a conversation between the caller (a learner) and verified staff.
-- Called by the server with the shared secret, because for under-18s it also
-- stores the parent/carer approval token that the server emails.
create or replace function public.dm_open(p_staff uuid, p_guardian_email text, p_token_hash text, p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  v_org uuid;
  v_adult boolean;
  th public.dm_threads;
begin
  if not private.billing_secret_ok(p_secret) then raise exception 'not_allowed'; end if;
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  if uid = p_staff then raise exception 'not_allowed'; end if;
  v_org := private.org_member_of(p_staff);
  if v_org is null then raise exception 'not_staff'; end if;
  if private.org_member_of(uid) is not null then raise exception 'staff_cannot_open'; end if;
  if exists (select 1 from public.user_blocks b where (b.blocker = p_staff and b.blocked = uid) or (b.blocker = uid and b.blocked = p_staff)) then
    raise exception 'blocked';
  end if;
  select * into th from public.dm_threads where learner_id = uid and staff_id = p_staff;
  if found then
    if th.closed then update public.dm_threads set closed = false where id = th.id; end if;
    if th.guardian_status = 'declined' then raise exception 'guardian_declined'; end if;
    return jsonb_build_object('id', th.id, 'mode', th.mode, 'guardian', th.guardian_status);
  end if;
  select ld.age_band = '18+' into v_adult from public.learner_details ld where ld.user_id = uid;
  if coalesce(v_adult, false) then
    insert into public.dm_threads (learner_id, staff_id, org_id, mode, guardian_status)
    values (uid, p_staff, v_org, 'e2ee', 'not_needed') returning * into th;
  else
    if p_guardian_email is null or p_guardian_email !~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' or p_token_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'guardian_required';
    end if;
    if lower(p_guardian_email) = lower((select email from auth.users where id = uid)) then raise exception 'guardian_is_self'; end if;
    insert into public.dm_threads (learner_id, staff_id, org_id, mode, guardian_status)
    values (uid, p_staff, v_org, 'moderated', 'pending') returning * into th;
    insert into private.dm_guardians (thread_id, email, token_hash, expires_at)
    values (th.id, lower(p_guardian_email), p_token_hash, now() + interval '7 days');
  end if;
  return jsonb_build_object('id', th.id, 'mode', th.mode, 'guardian', th.guardian_status);
end;
$$;

-- What the parent/carer sees from the emailed link (no message contents).
create or replace function public.dm_guardian_summary(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'learner', lp.username::text, 'staff', sp.username::text, 'title', m.job_title,
    'org', o.name, 'status', d.guardian_status, 'expired', g.expires_at < now())
  from private.dm_guardians g
  join public.dm_threads d on d.id = g.thread_id
  join public.organisations o on o.id = d.org_id
  left join public.org_members m on m.user_id = d.staff_id
  left join public.profiles lp on lp.id = d.learner_id
  left join public.profiles sp on sp.id = d.staff_id
  where p_token is not null and char_length(p_token) between 32 and 200
    and g.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

create or replace function public.dm_guardian_respond(p_token text, p_accept boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  g private.dm_guardians;
begin
  if p_token is null or p_accept is null or char_length(p_token) not between 32 and 200 then return 'invalid'; end if;
  select * into g from private.dm_guardians where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if not found then return 'invalid'; end if;
  if g.expires_at < now() then return 'expired'; end if;
  update public.dm_threads set guardian_status = case when p_accept then 'approved' else 'declined' end
   where id = g.thread_id and guardian_status = 'pending';
  update private.dm_guardians set token_hash = null, responded_at = now() where thread_id = g.thread_id;
  return case when p_accept then 'accepted' else 'declined' end;
end;
$$;

-- Books an office-hours slot. The learner must have a usable conversation with that person.
create or replace function public.book_office_slot(p_slot uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  s public.office_slots;
  th public.dm_threads;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into s from public.office_slots where id = p_slot for update;
  if not found or s.cancelled or s.starts_at < now() then raise exception 'unavailable'; end if;
  if s.booked_by is not null then raise exception 'taken'; end if;
  select * into th from public.dm_threads where learner_id = uid and staff_id = s.staff_id;
  if not found or th.guardian_status not in ('not_needed','approved') or th.closed then raise exception 'message_first'; end if;
  if (select count(*) from public.office_slots o where o.booked_by = uid and o.starts_at > now() and not o.cancelled) >= 3 then
    raise exception 'too_many_bookings';
  end if;
  update public.office_slots set booked_by = uid, booked_at = now() where id = p_slot;
  return jsonb_build_object('thread', th.id, 'starts_at', s.starts_at, 'room', s.room);
end;
$$;

revoke all on function private.free_mail(text), private.org_member_of(uuid), private.check_safe_text(),
  private.is_thread_party(uuid), private.dm_check_message() from public;
grant execute on function private.org_member_of(uuid), private.is_thread_party(uuid) to authenticated;
revoke all on function public.employer_request_code(text, text, text, text, text, text, text),
  public.employer_verify(text), public.dm_open(uuid, text, text, text), public.book_office_slot(uuid),
  public.dm_guardian_summary(text), public.dm_guardian_respond(text, boolean) from public, anon;
grant execute on function public.employer_request_code(text, text, text, text, text, text, text),
  public.employer_verify(text), public.dm_open(uuid, text, text, text), public.book_office_slot(uuid) to authenticated;
grant execute on function public.dm_guardian_summary(text), public.dm_guardian_respond(text, boolean) to anon, authenticated;

-- Live updates for new messages (RLS still decides who receives what).
alter publication supabase_realtime add table public.dm_messages;
