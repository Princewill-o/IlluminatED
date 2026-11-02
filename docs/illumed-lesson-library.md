# IllumED Slides and the school lesson API

The supplied 26 October 2026 Oak bulk export is imported into Supabase, rather than bundled into the browser or Git. `src/lib/data/education/oak-bulk-report.json` records source-file hashes and verified counts. Primary Years 1–6 and secondary Years 7–11 cover KS1–KS4. Sixth-form cards reuse the existing A-level, BTEC and T Level catalogue; this download does not supply KS5 lessons.

## What learners can use

`/curriculum` is a public, account-free library with stage, year, key-stage, subject and lesson-title search, plus pagination. It uses the website shell, so primary pupils are not sent through account setup or the social game. Existing account age restrictions, school memberships, social access and prize eligibility are unchanged.

Each unrestricted lesson has IllumED Slides, complete teaching text when present, keywords, learning goals, parent/teacher guidance, and self-check questions with revealable model answers. The adaptation preserves every word of the supplied transcript, with slides split on word boundaries. Questions are deterministic adaptations of learning points, keyword definitions and misconceptions; they are not labelled as original publisher assessments or exam marking. They award no Clout, coins, XP or leaderboard points. Typed answers and self-check choices are held only in page memory.

The downloadable HTML lesson works offline without JavaScript and contains slides, answers and source attribution. It can also be printed to PDF. A separate original PowerPoint download is offered when the live public source lesson identifies a deck and has no legacy, expiry, login, geographic or copyright restriction flags. Original deck branding is preserved. These downloads happen on demand; thousands of illustrated PowerPoints are not copied into the database. If a source deck becomes unavailable, the imported-text IllumED version remains usable.

## APIs

- `GET /api/education/oak?stage=primary&year=1&subject=maths&page=1`
- `GET /api/education/oak?stage=secondary&keyStage=ks3&q=fractions`
- `GET /api/education/oak/{slug}`: imported lesson and attribution.
- `GET /api/education/oak/{slug}?format=qa`: model answers from the Supabase recall bank, plus generated slide data.
- `GET /api/education/oak/{slug}?format=slides`: teaching text slides and recall questions.
- `GET /api/education/oak/{slug}/slides`: downloadable standalone IllumED HTML lesson with answers.
- `GET /api/education/oak/{slug}/original-slides`: redirect to an available unrestricted original PowerPoint, otherwise 404/403.
- `GET /api/education/stats`: current database totals.

Supabase also exposes read-only `oak_lessons`, `oak_units`, `oak_imports`, and `illumed_lesson_questions` through its Data API. Example: `/rest/v1/illumed_lesson_questions?lesson_slug=eq.{slug}&select=question,answer,explanation`. Send the project's publishable key in the `apikey` header. Public clients cannot insert, update or delete these tables. Restricted lessons contain `{}` teaching content and have no recall questions. RLS hides incomplete imports.

`platform_stats()` counts readable lessons, distinct curriculum units, subjects and KS1–KS4 separately from the existing marked bank. Recall questions have their own counter. Duplicate exam-board references do not inflate lesson totals. The landing page refreshes database counts every five minutes; it does not advertise archive byte size as question coverage.

## Rebuilding imports

1. Extract the supplied ZIP's JSON files into `.education-export/oak/` (ignored by Git).
2. `node scripts/import-oak-bulk.mjs` validates and produces a dry-run report.
3. Configure `SUPABASE_URL` and a server-only `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, then run `node scripts/import-oak-bulk.mjs --apply`.
4. `node scripts/build-illumed-lessons.mjs` previews the derived bank. Add `--apply` to publish it with the same server-only credentials.
5. Verify counts and permissions through the public API, then run `node --test tests/oak-bulk.test.mjs` and a production build.

The one-time upload used a narrowly scoped, expiring token-authenticated import RPC because no local service key was available. Temporary publisher functions and credential hashes are removed immediately after verification. They are not part of the migrations or app's runtime API. The scripts also support normal service-key publishing for future updates. Imports upsert stable identifiers; retiring or replacing a whole source version requires an explicit reconciliation, not a blind delete.

## Attribution

The visible product is branded **IllumED Slides**. Original licensed text is credited to **Oak National Academy, Open Government Licence v3.0**, with lesson-level source links and a clear adaptation/no-endorsement statement. This credit must remain in the app, downloads and API. Restrictions are preserved even when another sequence repeats the same lesson.
