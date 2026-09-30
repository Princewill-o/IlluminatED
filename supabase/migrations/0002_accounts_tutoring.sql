-- IlluminatED accounts, learner dashboard and tutoring
-- Run after 0001_social.sql. One account covers IlluminatED and IlluminatEDSocial.

-- ─────────────────────────────────────────────────────────────
-- Roles: tutors join members and moderators
-- ─────────────────────────────────────────────────────────────

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'tutor', 'moderator'));

create or replace function private.is_tutor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = (select auth.uid()) and role in ('tutor', 'moderator') and not banned);
$$;
revoke all on function private.is_tutor() from public;
grant execute on function private.is_tutor() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- What each learner studies and wants help with
-- ─────────────────────────────────────────────────────────────

create table public.learner_details (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  stage        text not null check (stage in ('gcse', 'alevel', 'btec', 'tlevel', 'level23', 'other')),
  year_group   text not null check (year_group in ('year-9', 'year-10', 'year-11', 'year-12', 'year-13', 'college', 'adult', 'other')),
  age_band     text not null check (age_band in ('13-15', '16-17', '18+')),
  -- [{ "courseId": "gcse-maths", "board": "aqa" }]
  subjects     jsonb not null default '[]' check (jsonb_typeof(subjects) = 'array' and jsonb_array_length(subjects) <= 15),
  help_topics  text[] not null default '{}' check (cardinality(help_topics) <= 40),
  help_note    text check (help_note is null or char_length(help_note) <= 500),
  exam_date    date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.learner_details enable row level security;
create policy "own details readable" on public.learner_details for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own details insert" on public.learner_details for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own details update" on public.learner_details for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Quiz progress (per question) and rounds (for history)
-- ─────────────────────────────────────────────────────────────

create table public.question_progress (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  question_key  text not null check (char_length(question_key) <= 120),
  topic_id      text not null check (char_length(topic_id) <= 80),
  course_id     text not null check (char_length(course_id) <= 80),
  seen          integer not null default 0 check (seen >= 0),
  correct       integer not null default 0 check (correct >= 0 and correct <= seen),
  last_at       timestamptz not null default now(),
  primary key (user_id, question_key)
);
create index question_progress_topic on public.question_progress (user_id, topic_id);

create table public.quiz_rounds (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  mode        text not null check (mode in ('quick', 'topic', 'mixed', 'timed', 'import')),
  correct     integer not null check (correct >= 0),
  total       integer not null check (total between 1 and 500 and correct <= total),
  created_at  timestamptz not null default now()
);
create index quiz_rounds_user on public.quiz_rounds (user_id, created_at desc);

alter table public.question_progress enable row level security;
alter table public.quiz_rounds enable row level security;
create policy "own progress readable" on public.question_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "own progress insert" on public.question_progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own progress update" on public.question_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rounds readable" on public.quiz_rounds for select to authenticated using (user_id = (select auth.uid()));
create policy "own rounds insert" on public.quiz_rounds for insert to authenticated with check (user_id = (select auth.uid()));

-- Saves one finished round. Runs with the caller's permissions, so the policies above still apply.
-- answers: [{ "key": "topic:q1", "topicId": "...", "courseId": "...", "seen": 1, "correct": 1 }]
create or replace function public.record_quiz_round(round_mode text, answers jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := (select auth.uid());
  a jsonb;
  tot integer := 0;
  cor integer := 0;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if jsonb_typeof(answers) <> 'array' or jsonb_array_length(answers) = 0 or jsonb_array_length(answers) > 500 then
    raise exception 'invalid_answers';
  end if;
  for a in select * from jsonb_array_elements(answers) loop
    insert into question_progress as p (user_id, question_key, topic_id, course_id, seen, correct, last_at)
    values (uid, a ->> 'key', a ->> 'topicId', a ->> 'courseId',
            greatest((a ->> 'seen')::int, 0), least(greatest((a ->> 'correct')::int, 0), greatest((a ->> 'seen')::int, 0)), now())
    on conflict (user_id, question_key) do update
      set seen = p.seen + excluded.seen, correct = p.correct + excluded.correct, last_at = now();
    tot := tot + greatest((a ->> 'seen')::int, 0);
    cor := cor + least(greatest((a ->> 'correct')::int, 0), greatest((a ->> 'seen')::int, 0));
  end loop;
  if tot > 0 then
    insert into quiz_rounds (user_id, mode, correct, total) values (uid, round_mode, cor, least(tot, 500));
  end if;
end;
$$;
revoke all on function public.record_quiz_round(text, jsonb) from public, anon;
grant execute on function public.record_quiz_round(text, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Tutoring
-- ─────────────────────────────────────────────────────────────

-- Prices live in the database so the price a learner sees is the price saved on their request.
create table public.tutoring_prices (
  help_type    text not null check (help_type in ('homework', 'coursework', 'exam-prep', 'one-to-one')),
  speed        text not null check (speed in ('flexible', 'priority', 'urgent')),
  price_pence  integer not null check (price_pence between 0 and 100000),
  match_hours  integer not null check (match_hours between 1 and 336),
  reply_hours  integer not null check (reply_hours between 1 and 336),
  primary key (help_type, speed)
);
insert into public.tutoring_prices (help_type, speed, price_pence, match_hours, reply_hours) values
  ('homework',   'flexible', 1500, 72, 48), ('homework',   'priority', 2200, 24, 12), ('homework',   'urgent', 3200, 4, 2),
  ('coursework', 'flexible', 2500, 72, 48), ('coursework', 'priority', 3500, 24, 12), ('coursework', 'urgent', 4800, 4, 2),
  ('exam-prep',  'flexible', 2500, 72, 48), ('exam-prep',  'priority', 3500, 24, 12), ('exam-prep',  'urgent', 4800, 4, 2),
  ('one-to-one', 'flexible', 3000, 72, 48), ('one-to-one', 'priority', 4000, 24, 12), ('one-to-one', 'urgent', 5500, 4, 2);

alter table public.tutoring_prices enable row level security;
create policy "prices readable" on public.tutoring_prices for select using (true);
create policy "moderators add prices" on public.tutoring_prices for insert to authenticated with check ((select private.is_moderator()));
create policy "moderators change prices" on public.tutoring_prices for update to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));
create policy "moderators remove prices" on public.tutoring_prices for delete to authenticated using ((select private.is_moderator()));

create table public.tutor_requests (
  id              bigint generated always as identity primary key,
  student_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  tutor_id        uuid references public.profiles (id) on delete set null,
  course_id       text not null check (char_length(course_id) between 1 and 80),
  subject         text not null check (char_length(subject) between 1 and 80),
  topic           text check (topic is null or char_length(topic) <= 120),
  help_type       text not null check (help_type in ('homework', 'coursework', 'exam-prep', 'one-to-one')),
  speed           text not null check (speed in ('flexible', 'priority', 'urgent')),
  details         text not null check (char_length(details) between 20 and 3000),
  availability    text check (availability is null or char_length(availability) <= 300),
  price_pence     integer not null default 0,
  match_by        timestamptz not null default now(),
  reply_hours     integer not null default 48,
  needs_guardian  boolean not null default false,
  guardian_ok     boolean not null default false,
  status          text not null default 'open' check (status in ('open', 'matched', 'completed', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index tutor_requests_student on public.tutor_requests (student_id, created_at desc);
create index tutor_requests_tutor on public.tutor_requests (tutor_id, updated_at desc) where tutor_id is not null;
create index tutor_requests_open on public.tutor_requests (match_by) where status = 'open';

-- Parent or guardian contact for learners under 18. Only the learner and moderators can see it.
create table public.request_guardians (
  request_id  bigint primary key references public.tutor_requests (id) on delete cascade,
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  created_at  timestamptz not null default now()
);

create table public.tutor_messages (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references public.tutor_requests (id) on delete cascade,
  sender_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index tutor_messages_request on public.tutor_messages (request_id, created_at);
create index tutor_messages_sender on public.tutor_messages (sender_id);

-- New requests: price, deadlines and the guardian flag are always set here, never trusted from the browser.
create or replace function private.prepare_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p tutoring_prices%rowtype;
  band text;
  recent integer;
begin
  select * into p from tutoring_prices where help_type = new.help_type and speed = new.speed;
  if not found then raise exception 'invalid_tier'; end if;
  select age_band into band from learner_details where user_id = new.student_id;
  if band is null then raise exception 'details_required'; end if;
  select count(*) into recent from tutor_requests
    where student_id = new.student_id and status = 'open';
  if recent >= 5 then raise exception 'too_many_open'; end if;
  if (new.details || ' ' || coalesce(new.availability, '') || ' ' || coalesce(new.topic, '')) ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
     or regexp_replace(new.details || coalesce(new.availability, ''), '[\s().-]', '', 'g') ~ '(\+44|0)7\d{9}' then
    raise exception 'contact_details';
  end if;
  new.tutor_id := null;
  new.status := 'open';
  new.price_pence := p.price_pence;
  new.reply_hours := p.reply_hours;
  new.match_by := now() + make_interval(hours => p.match_hours);
  new.needs_guardian := band <> '18+';
  new.guardian_ok := false;
  new.created_at := now();
  new.updated_at := now();
  new.last_message_at := now();
  return new;
end;
$$;
create trigger tutor_requests_prepare before insert on public.tutor_requests
  for each row execute function private.prepare_request();

-- Messages: keep contact details off the platform and keep the request's activity time current.
create or replace function private.check_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent integer;
begin
  if new.body ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' or regexp_replace(new.body, '[\s().-]', '', 'g') ~ '(\+44|0)7\d{9}' then
    raise exception 'contact_details';
  end if;
  select count(*) into recent from tutor_messages where sender_id = new.sender_id and created_at > now() - interval '1 minute';
  if recent >= 6 then raise exception 'rate_limited'; end if;
  new.created_at := now();
  update tutor_requests set last_message_at = now(), updated_at = now() where id = new.request_id;
  return new;
end;
$$;
create trigger tutor_messages_check before insert on public.tutor_messages
  for each row execute function private.check_message();

alter table public.tutor_requests enable row level security;
alter table public.request_guardians enable row level security;
alter table public.tutor_messages enable row level security;

-- Learners see their own requests; tutors see open requests and the ones they've taken; moderators see all.
create policy "requests readable" on public.tutor_requests for select to authenticated
  using (student_id = (select auth.uid()) or tutor_id = (select auth.uid())
         or (status = 'open' and (select private.is_tutor())) or (select private.is_moderator()));
create policy "members request" on public.tutor_requests for insert to authenticated
  with check (student_id = (select auth.uid()) and (select private.is_active_member()));
create policy "moderators manage requests" on public.tutor_requests for update to authenticated
  using ((select private.is_moderator())) with check ((select private.is_moderator()));

create policy "guardian readable" on public.request_guardians for select to authenticated
  using ((select private.is_moderator())
         or exists (select 1 from public.tutor_requests r where r.id = request_id and r.student_id = (select auth.uid())));
create policy "guardian insert" on public.request_guardians for insert to authenticated
  with check (exists (select 1 from public.tutor_requests r where r.id = request_id and r.student_id = (select auth.uid())));

create policy "messages readable" on public.tutor_messages for select to authenticated
  using ((select private.is_moderator())
         or exists (select 1 from public.tutor_requests r where r.id = request_id
                    and (r.student_id = (select auth.uid()) or r.tutor_id = (select auth.uid()))));
create policy "participants message" on public.tutor_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select private.is_active_member())
              and exists (select 1 from public.tutor_requests r where r.id = request_id
                          and r.status in ('open', 'matched')
                          and (r.student_id = (select auth.uid()) or r.tutor_id = (select auth.uid()))));

-- State changes go through these functions so each role can only make the moves it's allowed to.
-- Supabase's advisor lists them as callable by signed-in users; that's intended, each one checks the caller itself.
create or replace function public.claim_tutor_request(req bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_tutor() then raise exception 'not_a_tutor'; end if;
  update tutor_requests set tutor_id = auth.uid(), status = 'matched', updated_at = now()
    where id = req and status = 'open' and student_id <> auth.uid() and (not needs_guardian or guardian_ok);
  return found;
end;
$$;

create or replace function public.release_tutor_request(req bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update tutor_requests set tutor_id = null, status = 'open', updated_at = now()
    where id = req and status = 'matched' and tutor_id = auth.uid();
  return found;
end;
$$;

create or replace function public.set_tutor_request_status(req bigint, new_status text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if new_status = 'cancelled' then
    update tutor_requests set status = 'cancelled', updated_at = now()
      where id = req and status in ('open', 'matched') and student_id = auth.uid();
  elsif new_status = 'completed' then
    update tutor_requests set status = 'completed', updated_at = now()
      where id = req and status = 'matched' and (student_id = auth.uid() or tutor_id = auth.uid());
  else
    raise exception 'invalid_status';
  end if;
  return found;
end;
$$;

revoke all on function public.claim_tutor_request(bigint), public.release_tutor_request(bigint),
  public.set_tutor_request_status(bigint, text) from public, anon;
grant execute on function public.claim_tutor_request(bigint), public.release_tutor_request(bigint),
  public.set_tutor_request_status(bigint, text) to authenticated;
revoke all on function private.prepare_request(), private.check_message() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- API access (RLS above decides which rows)
-- ─────────────────────────────────────────────────────────────

revoke all on public.learner_details, public.question_progress, public.quiz_rounds, public.tutoring_prices,
  public.tutor_requests, public.request_guardians, public.tutor_messages from anon, authenticated;
grant select, insert, update on public.learner_details to authenticated;
grant select, insert, update on public.question_progress to authenticated;
grant select, insert on public.quiz_rounds to authenticated;
grant select on public.tutoring_prices to anon, authenticated;
grant insert, update, delete on public.tutoring_prices to authenticated;
grant select, insert, update on public.tutor_requests to authenticated;
grant select, insert on public.request_guardians to authenticated;
grant select, insert on public.tutor_messages to authenticated;
grant usage on all sequences in schema public to authenticated;

-- To make someone a tutor (after your own checks, including an enhanced DBS check):
--   update public.profiles set role = 'tutor' where username = 'their_username';
