# Loading the question bank into Supabase

1. Create the table: run `supabase/migrations/20261021200000_question_bank.sql`
   (Supabase dashboard → SQL editor → paste → Run).
2. Load the 3,344 questions, either:
   - **Script (fastest):** `SUPABASE_URL=https://wfcihsbgkbjfvphzuuyi.supabase.co SUPABASE_SECRET_KEY=<secret key> node scripts/import-question-bank.mjs`
   - **SQL editor:** run `supabase/seed/question_bank_part01.sql` to `part08.sql` in order.
3. Open `/practice` in the app.

Re-running either is safe (rows upsert by id). To approve a question after a
subject expert has checked it: `update public.bank_questions set publish_ready = true,
review_status = 'approved' where id = '...';` Approved questions are served first
and lose the "draft" label. Pass `--keep-review` to the script when re-importing so
those decisions are kept.

## API
- `GET /api/questions/topics`: levels, subjects and topics with counts.
- `GET /api/questions?level=GCSE&subject=Biology&topic=...&limit=10[&open=1][&reviewed=1]`:
  a random set, without answers.
- `POST /api/questions/check` `{ id, answer }`: server-side marking, then the answer,
  explanation, source and licence.
