# Study Quarter

The Learn dashboard combines subjects, study sessions, simulated work experience, a skills record and an award collection. Work tasks and awards are game activities, not accredited qualifications or employment placements.

## Routes and interactions

- `/learn`: saved study/career progress, subjects and eight milestone awards.
- `/games/study`: five untimed questions followed by marked answers and explanations.
- `/games/world?map=study-lobby`: shared learning space with study desks, careers desk and an awards cabinet. The city makerspace also opens subject practice.
- The game phone opens study sessions and awards without leaving the world. Movement pauses while either panel is open.

Study courses appear only when the reviewed bank has at least five questions. The initial bank contains 108 questions; four courses currently meet that threshold. Other courses retain their existing notes and topic pages. Learner-selected subjects appear first when available.

## Persistence and rewards

Apply `supabase/migrations/20261017134206_learning_study_room.sql` after the existing game/player migrations. It was applied and its live permissions verified on the IlluminatED project. The filename matches the actual remote migration version.

Answers live in `private.study_question_bank`. The start RPC returns only prompts and options. The submit RPC checks ownership, active membership, session age and all five answer indices, computes the score, and returns the marked review. Completed sessions and aggregate study progress are owner-readable through RLS; clients cannot write scores, answers or currency directly.

Each of the first ten completed sessions per London calendar day earns 10 XP plus 5 XP per correct answer and 5 Clout per correct answer. Later sessions still save learning progress, with zero currency/XP. Row locks enforce the cap, and resubmitting a completed session returns its receipt without paying or counting it again. Starting is limited to 60 sessions per rolling hour; unfinished sessions expire after 24 hours.

The award collection derives from saved study totals and career history. It does not expose learners' study records to other players. The private answer bank intentionally has RLS with no client policies or grants.

## Checks

```sh
npm run test:study
npm run test:study:db
npm run typecheck
npm run lint
npm run build
```

The database runner uses `initdb`, `pg_ctl` and `psql` to create and remove an isolated local PostgreSQL cluster. It never connects to production. Checks cover anonymous denial, answer secrecy, invalid submissions, account isolation, server scoring, replay, reward caps and bans. Component tests cover navigation, submit retries, duplicate clicks and marked review.

`scripts/build-study-bank.mjs --check` verifies that this migration's seed matches the reviewed source bank. Once deployed, future bank changes should use a new migration rather than rewriting the applied seed.
