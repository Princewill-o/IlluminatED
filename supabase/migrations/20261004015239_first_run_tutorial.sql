-- Existing learners keep access. Accounts created after this migration complete
-- the guided tour once before their personal dashboard opens.
alter table public.learner_details
  add column tutorial_completed_at timestamptz;

update public.learner_details
set tutorial_completed_at = now()
where tutorial_completed_at is null;
