# Education and careers sources

The public catalogue has a bundled fallback in `src/lib/data/education` and a Supabase-backed read path. It ships with the site, so topic discovery and checklist downloads can work if database storage is unavailable. These JSON files contain public resource metadata and headings, not copies of exam papers or video files.

## What works without keys

- AQA published specification headings: fetched by `npm run sync:education`, with source URLs and check timestamps. Importing an outline is not a full assessment-content or optional-unit audit.
- Oak Year 10 and Year 11 public curriculum listings: programmes, board/tier metadata, unit names and lesson links. Videos, worksheets and full quizzes open on the publisher's website.
- University of Buckingham: the university's published iCalendar feed provides upcoming open days, tasters and relevant young-person events. A server cache refreshes hourly on access. An open `/next-steps` page rechecks every 15 minutes. Cancelled, expired, malformed and unexpanded recurring events are excluded.
- Stored event snapshots provide a labelled fallback if the live feed fails. Publication timestamps are displayed in Europe/London.
- UCAS, Springpod, Futures for All and GOV.UK discovery directories are linked. Their listings are not mirrored, and their links are not represented as live individual placement offers.

## Optional keys

Set these on the server in `.env.local` for local development and in the hosting provider's environment settings for deployment. Do not put them in a `NEXT_PUBLIC_` variable or send them through a browser form.

- `OAK_API_KEY`: obtain an API key from [Oak National Academy](https://open-api.thenational.academy/). Used only in the server's bearer header to the fixed `/api/v1/lessons/{slug}/quiz` endpoint. Text multiple-choice quizzes are validated and cached for 24 hours; image, free-text, matching and ordering questions remain available on Oak. Only lessons already in the approved catalogue are requested. No key is bundled into client JavaScript. The API enforces lesson restrictions; the website cannot bypass them. [API authentication](https://raw.githubusercontent.com/oaknational/oak-curriculum-api/main/docs/api/quickstart.md).
- `APPRENTICESHIPS_API_KEY`: request an **unfiltered Display Advert API** subscription through the [apprenticeship developer hub](https://developer.apprenticeships.education.gov.uk/Documentation/display-advert-api-v2). Used server-side in `Ocp-Apim-Subscription-Key`, with `X-Version: 2`. The current connector caches the newest 100 vacancies hourly and filters expired adverts; it is not a complete searchable nationwide archive. [Official API schema](https://developer.apprenticeships.education.gov.uk/Documentation/display-advert-api-v2/description).

The absent-key states are explicit in the learner interface. With no Oak key, users can still use lesson resources on Oak; with no vacancy key, the official vacancy search remains linked.

## Refreshing and validation

```sh
npm run sync:education
npm run sync:opportunities
node scripts/audit-education.mjs
npm run test:education
npm run typecheck
npm run lint
```

The metadata sync uses a fixed publisher allowlist, follows only same-publisher HTTPS redirects, and retains previous successful snapshots when a source fails. `sync-report.json` records incomplete refreshes rather than implying that everything was checked. A source removed from a listing may remain in a previous failed snapshot, so check timestamps before relying on it.

The GitHub Actions workflow (`.github/workflows/education-refresh.yml`) refreshes curriculum metadata weekly and opportunity snapshots hourly. With Supabase publisher secrets configured it publishes validated data into the database; weekly runs also commit bundled snapshots. It will run only after this code is pushed to the default branch and Actions is enabled. Add `APPRENTICESHIPS_API_KEY` as a repository secret if scheduled vacancy snapshots are wanted. Branch protection may require adapting the final commit step to the repository's review workflow. No workflow has been activated remotely during this change.

## Licensing and boundaries

- AQA specification outlines contain short factual headings and links. Full specifications and copyrighted exam papers remain on the board's site. AQA content is not labelled OGL.
- Oak material fetched through the API must retain Oak attribution and comply with its [content terms](https://open-api.thenational.academy/docs/about-oaks-api/terms), including any third-party restrictions. The repository's MIT licence for Oak API code does not licence all lesson assets.
- The current implementation downloads metadata and caches authorised quiz text. It does **not** bulk-download or redistribute video files, third-party worksheets or copyrighted exam papers.
- Higher-tier content, set texts, practical requirements, qualification versions and optional units must be selected with the learner's teacher. No interface claims it knows future exam questions.

See `education-audit.md` for the course-by-course coverage and remaining gaps.

## Validation of this change

Production build, TypeScript checking, ESLint and all seven education tests passed. Browser checks confirmed route-choice persistence, opportunity search and course catalogue rendering. HTTP checks confirmed syllabus downloads, unknown-course and unknown-lesson rejection, and the explicit missing-key quiz response. The local production preview is running on port 3001; these changes have not been pushed or deployed.

## Supabase catalogue and private account state

Migration: `supabase/migrations/20261003082046_education_catalogue_and_progress.sql`.

- `education_catalogue`: one public JSON record per course. Visitors have SELECT access; only the trusted publisher can write.
- `education_source_snapshots`: public opportunity fallback snapshot, also publisher-write only.
- `education_learner_state`: private rows keyed by `(user_id, namespace)`, with cascading account deletion. RLS restricts SELECT/INSERT/UPDATE/DELETE to the current user. The security-invoker RPC merges one validated item at a time, preserving unrelated changes from other devices.
- Browser code uses only the existing publishable key. The account state API verifies the session with `getUser()` and derives ownership from that user, never from a body parameter.
- Signed-in revision ticks, career route/year and saved opportunities sync across devices. Pending changes are stored in a scoped local outbox and retried on connection restoration or manual retry. Guests retain device-only storage; guest data is not automatically copied into accounts on a shared device.
- `/your-data` exports or clears these account choices. Browser clearing removes only browser copies; account deletion cascades database state.
- Course pages and public database reads revalidate hourly. The production host must rebuild with its existing Supabase public environment configuration.

Apply only the reviewed new migration to the existing project; do not blindly re-run the earlier manually applied account migrations. Then publish the catalogue:

```sh
# Use a server-only secret from the existing project, never a NEXT_PUBLIC variable.
# Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local or the publisher's environment.
npm run publish:education

# Alternative: produce a public-data SQL import for the authenticated SQL editor.
node scripts/publish-education.mjs --sql /path/to/education-data.sql
```

The export does not contain credentials or learner records. `.education-export/education-data.sql` is prepared locally and excluded from Git. The import upserts public metadata; it does not delete existing records or touch existing accounts. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as GitHub repository secrets to enable scheduled publishing. The publisher has no delete step.

Current validation: all 43 catalogue records and the opportunity snapshot imported into an isolated PostgreSQL database; ownership, anonymous access restrictions, atomic merge, invalid-choice rejection and account separation passed `tests/education-database.sql`. Supabase CLI security advisors reported no issues against that test database. Live application was subsequently completed on 3 October 2026: the education migration was applied to IlluminatED, and 43 catalogue rows plus a snapshot containing four events were verified. Row-level security is enabled on all three new tables. No private learner records were imported.

## Topic study support

`/study/[courseId]` validates a topic against that course's imported specification or broad areas. Every existing syllabus heading and broad course area has a link to a study plan, available quiz/tutor/Tiggy routes, supplementary publisher resources and topic-prefilled OpenLearn/video searches. Oak suggestions are ranked by title overlap and explicitly labelled suggestions, not certified mappings. External search results are not mirrored or guaranteed accurate. Some free learning publishers block automated retrieval; those sources remain outbound links. OpenStax assets are not copied or passed to Tiggy; the commercial/AI reuse restrictions must be observed.

This adds study support, not a new fully authored exam question bank. Post-16 optional units, exact qualification sizes/versions and missing board-specific syllabus models still require the coverage work recorded in the audit.

Final checks for the follow-up: production build (with the existing Supabase public URL configured locally), type checking, ESLint and nine Node tests passed. PostgreSQL security and performance advisors reported no issues in the isolated test database. The earlier public catalogue 404 was resolved by applying the migration and importing the catalogue through the subsequently connected Supabase plugin. Website deployment and scheduled publishing remain separate outstanding steps.


## Personalised practice and readiness

Onboarding and settings now ask whether the learner wants university, an apprenticeship, both, or is still deciding. The existing private career state RPC saves that preference. Selected subjects, boards, help topics and first exam date continue to shape the dashboard.

Signed-in quiz-centre practice defaults to the selected subjects and known exam-board references, with an explicit switch to explore outside them. Saved account progress informs mixed practice; browser progress is scoped by account on this page. Shared Combined Science topic membership is honoured.

The dashboard reports practice-bank readiness per subject: secure matching questions divided by all available matching questions. Secure means at least two attempts, at least 80% first-attempt accuracy and activity within 14 days. No evidence displays Not assessed yet. This is not a calibrated exam pass probability, predicted grade, full syllabus coverage, or an official mock exam. Full-paper practice and marking remain separate. Subject cards link to official papers, course lessons and relevant supplementary revision resources.

Readiness and board/shared-topic filtering have automated edge-case tests. Signed-in browser testing of the new onboarding and dashboard still requires an authenticated learner session.
