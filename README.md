# IlluminatED

Free revision for UK learners: GCSE (Year 11 focus), A level (Years 12–13), BTEC, T Levels and other Level 2/3 qualifications. Everything works without an account; signing in adds a personal dashboard, tutor requests and IlluminatEDSocial.

Built with Next.js 15 (App Router), React 19, Tailwind CSS 4 and shadcn/ui, starting from the Mainline template by Shadcnblocks.com (MIT, see `LICENSE`).

## Run it

Requires Node.js 18.18+ (20 LTS recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm start          # http://localhost:3000
```

Checks: `npm run lint`, `npm run typecheck`, `npm run format`.

### Optional environment variables (`.env.local`)

| Variable                        | Purpose                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`          | Your deployed URL, used for social-card metadata.                                                                                          |
| `OPEN_LIBRARY_CONTACT`          | Contact email added to the Open Library `User-Agent`, as their API guidance asks for recurring use.                                        |
| `NEXT_PUBLIC_CORRECTIONS_EMAIL` | Enables an "Email this report" button on the correction form. Without it the form offers "Copy report" and says the inbox is coming later. |

| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Switches on accounts, the dashboard, tutoring and IlluminatEDSocial (see below). |

No secret keys are needed or used. The project's public Supabase URL and publishable key are built in as defaults (`src/lib/social/config.ts`), so the site works on Vercel with no environment variables; set the variables above only to point at a different Supabase project. Never put a Supabase `service_role` or secret key in this app.

## Pages

| Route                                                                 | What it does                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                                                   | Learner start page: course search, qualification routes, recently viewed (local), pick up a topic, question of the day, links to new pages.                                                                                    |
| `/courses`                                                            | Searchable directory filtered by qualification type, level, awarding organisation and route/sector, plus live Ofqual register results.                                                                                         |
| `/gcse`                                                               | GCSE hub: core subject tiles, more subjects (via register search), Year 11 exam countdown (learner-chosen date), board links.                                                                                                  |
| `/a-level`                                                            | A level hub: Year 12/13 selector, study methods, subjects, board links.                                                                                                                                                        |
| `/btec`                                                               | BTEC hub: Level 2 vs Level 3, courses by sector, unit planning, evidence checklist, Pearson links.                                                                                                                             |
| `/t-levels`                                                           | T Levels by occupational route and awarding organisation; core, specialism and placement explained; DfE links with source date.                                                                                                |
| `/level-2-3`                                                          | Cambridge Technicals, Functional Skills, Core Maths, EPQ and applied general routes with filters and a live status check.                                                                                                      |
| `/courses/[courseId]`                                                 | Subject page: awarding body, assessment, areas shared by most specifications, study sequence, topic pages, live specification finder, sources and last-checked date.                                                           |
| `/courses/[courseId]/[topicId]`                                       | Topic page: objectives, explanation, worked example, key terms, misconceptions, retrieval questions, quiz, downloadable/printable notes.                                                                                       |
| `/quizzes`                                                            | Quiz centre: quick practice, topic review, mixed retrieval, timed practice; retry/skip, keyboard control, local progress, round summary.                                                                                       |
| `/flashcards`                                                         | Shuffle, reveal, know it / review it, topic filters, local-only marks and reset.                                                                                                                                               |
| `/revision`                                                           | Revision planner (local), print, text and `.ics` calendar export; downloadable study sheets.                                                                                                                                   |
| `/resources`                                                          | Official resources and past-paper finder by board, qualification, subject and resource type.                                                                                                                                   |
| `/library`                                                            | Free learning library selected from FMHY's Educational section.                                                                                                                                                                |
| `/qualifications`                                                     | Ofqual register search with pagination and filters.                                                                                                                                                                            |
| `/data`                                                               | DfE Explore Education Statistics publications and datasets.                                                                                                                                                                    |
| `/reading`                                                            | Wikipedia background summaries and Open Library book finder.                                                                                                                                                                   |
| `/sign-in`, `/auth/callback`, `/onboarding`                           | One account for everything: email sign-in link, then username, age range, stage, year, subjects and exam boards, and topics they want help with.                                                                               |
| `/dashboard`, `/dashboard/settings`                                   | Personal dashboard: totals, exam countdown, "Revise next" (from flagged topics, low scores, untried and stale topics), progress per subject and topic, recent quizzes, tutor requests. Edit details, sign out, delete account. |
| `/tutors`, `/tutors/request`, `/tutors/requests/[id]`, `/tutors/desk` | Tutoring: prices by type of help and speed, request form, message thread, and a desk for tutors and moderators.                                                                                                                |
| `/social/*`                                                           | IlluminatEDSocial forum (see below).                                                                                                                                                                                           |
| `/about`, `/faq`, `/your-data`, `/accessibility`                      | How it works, FAQs, local data controls and the accessibility statement.                                                                                                                                                       |

## Data and APIs

All calls are public GET requests with no keys. The browser calls our own route handlers first (no CORS issues, short server caching, allow-listed parameters). If those aren't available, for example on static hosting, it falls back to the public endpoint directly. Responses are validated, capped and rendered as text (never as HTML), cached in the browser for a short time, and shown with their source and fetch time. Loading, empty, stale-cache, offline, rate-limited, forbidden, invalid-response and retry states are all handled.

| Proxy route                         | Upstream                                                    | Notes                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/ofqual/qualifications`        | `https://register-api.ofqual.gov.uk/api/Qualifications`     | Public Ofqual Register API ([docs](https://github.com/OfqualGovUK/ofqual-register-api)). Params: `title`, `qualificationTypes`, `qualificationLevels`, `awardingOrganisations`, `availability`, `page`, `limit`. The private `gov/…` operations need a subscription key and are not used. |
| `/api/ofqual/organisations`         | `…/api/Organisations`                                       | Awarding-organisation search.                                                                                                                                                                                                                                                             |
| `/api/ees/publications`             | `https://api.education.gov.uk/statistics/v1/publications`   | DfE EES API ([docs](https://api.education.gov.uk/statistics/docs/)). `search`, `page`, `pageSize` (max 40).                                                                                                                                                                               |
| `/api/ees/data-sets?publicationId=` | `…/v1/publications/{id}/data-sets`                          | Dataset metadata: version, published date, time period, geography, filters, indicators. IDs come from the API itself and are never guessed.                                                                                                                                               |
| `/api/books`                        | `https://openlibrary.org/search.json`                       | Low-volume book discovery; client throttled to about one request per second; identified with a `User-Agent`.                                                                                                                                                                              |
| none (direct)                       | `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` | Optional background reading with attribution.                                                                                                                                                                                                                                             |

Checked 30 September 2026: Ofqual qualification and organisation search and the EES publications and data-sets endpoints returned live data, with the response fields used here.

**Not integrated:** The DfE API portal (find-and-use-an-api.education.gov.uk) needs an account, app registration and subscription keys. Add it later through a server-side proxy with keys kept in environment variables, never in the browser. No exam board (AQA, Pearson, OCR, WJEC/Eduqas, CCEA) offers an open content API for papers or full specifications, so we link to their official finders instead.

## Content and sources

- **Topic pages and quiz questions** are original IlluminatED material. Each has a version and a review date (`src/lib/data/topics`). They cover areas common to most specifications and never claim to be a board's syllabus.
- **Course catalogue** (`src/lib/data/courses.ts`) lists areas shared by most boards and study sequences. It does not hard-code specification codes. The live register gives qualification numbers and specification links instead.
- **Official resources** (`src/lib/data/resources.ts`) link to exam boards, Ofqual and DfE. No papers are mirrored, and recent papers may be restricted by the board.
- **Free learning library** (`src/lib/data/library.ts`) is a curated selection from [FMHY Educational](https://fmhy.net/educational). Anything FMHY lists for downloading paid or copyrighted courses or books without permission is deliberately excluded.

## Brand assets

`public/brand/` contains the lion mascot in two separate artworks: a white shirt with navy lettering for light mode, and a navy shirt with white lettering for dark mode. Both are aligned on the same canvas. The folder also has the navy and white wordmarks and a lion-head icon. Theme swaps use CSS `dark:` visibility, not image filters.

## Guest data

Without an account, recently viewed pages, quiz progress, flashcard marks, planner sessions, exam date, A level year and short API caches are stored under `illuminated:` keys in `localStorage`. The theme is stored under `theme`. `/your-data` shows each item and can clear it. No names, schools or grades are collected.

## Accounts, dashboard and tutoring

Run `supabase/migrations/0002_accounts_tutoring.sql` after `0001_social.sql`. One Supabase account covers the whole site.

- **Sign-in** is a one-time email link (`/sign-in`). The callback sends new people to `/onboarding`, which creates their public username (shared with IlluminatEDSocial) and saves `learner_details`: age range, stage, year group, subjects with exam boards, topics they want help with, an optional note and exam date. Existing forum members only fill in the study part.
- **Quiz progress** is saved when a signed-in learner finishes a round (`record_quiz_round`), per question, so the dashboard can show accuracy by topic. Progress saved in the browser before signing in can be added once from the dashboard.
- **Tutoring prices** live in the `tutoring_prices` table (edit them in the Supabase table editor). The database sets the price, the "tutor by" deadline and the reply time on every request, so they can't be changed from the browser.

| Type of help                | Flexible (tutor in 3 days, replies in 2 days) | Priority (1 day, 12 hours) | Urgent (4 hours, 2 hours) |
| --------------------------- | --------------------------------------------- | -------------------------- | ------------------------- |
| Homework help               | £15                                           | £22                        | £32                       |
| Coursework guidance         | £25                                           | £35                        | £48                       |
| Exam preparation            | £25                                           | £35                        | £48                       |
| One-to-one session (1 hour) | £30                                           | £40                        | £55                       |

- **Payment is not taken online yet.** Requests show the price and say nothing is charged. Add a payment provider (for example Stripe Checkout through a server route with the secret key in an environment variable) before charging.
- **Safeguarding:** learners under 18 must give a parent or guardian email, which only moderators can see. Tutors can't take the request until a moderator confirms the guardian on `/tutors/desk`. Messages stay on the platform, emails and UK mobile numbers are blocked, and moderators can read every thread. Coursework requests require the learner to confirm they understand the JCQ rules (tutors guide, they don't write or mark assessed work).
- **Tutors** are added by hand after your own checks (including an enhanced DBS check for work with under-18s):
  ```sql
  update public.profiles set role = 'tutor' where username = 'their_username';
  ```
  Tutors see open requests, take one (`claim_tutor_request`), message the learner, hand it back or mark it done. Learners can cancel or mark done.

## IlluminatEDSocial (forum)

`/social` is a forum where students talk about sixth form, universities, applying, apprenticeships and student life. It uses its own purple-on-black look and has its own header and footer.

Without Supabase settings it runs in **preview mode**: labelled example threads, with posting and sign-in switched off (and no dashboard or tutoring).

### Connect it (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run `supabase/migrations/0001_social.sql`.
3. In **Project Settings → API**, copy the project URL and the publishable (anon) key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
4. In **Authentication → URL Configuration**, set the Site URL to your site (for example `http://localhost:3000`). Add `http://localhost:3000/auth/callback` and your live `/auth/callback` URL to the redirect URLs.
5. Optional: in **Authentication → Emails**, set up your own SMTP. Supabase's built-in sender is heavily rate-limited, so you'll need this before launch.
6. Also run `supabase/migrations/0002_accounts_tutoring.sql`. Restart `npm run dev`, sign in at `/sign-in` and finish setting up.
7. Make yourself a moderator in the SQL Editor:
   ```sql
   update public.profiles set role = 'moderator' where username = 'your_username';
   ```

### How it works

- **Accounts:** people sign in with a one-time email link, then choose a public username and confirm they're 13 or older and accept the guidelines. Emails are never shown. Anyone can read without an account.
- **Posting:** threads (category plus an optional university tag) and replies. Posts go live immediately.
- **Safety, enforced in the database, not just the UI:**
  - Row Level Security on every table.
  - Emails and UK mobile numbers are blocked in posts.
  - A `blocked_terms` table lets moderators add words to block.
  - Flood limits: 3 posts a minute and 10 threads a day.
  - Content is automatically hidden after 3 separate reports.
  - Banned accounts can't post.
- **Moderators** use `/social/moderation` to review reports, hide or restore content, lock threads and ban accounts.
- **Members** can delete their own posts, or their whole account and all their content, from `/social/account`.
- **Guidelines** at `/social/guidelines` include UK support services (Childline, Samaritans, Shout, CEOP).

The two permission helpers (`is_moderator`, `is_active_member`) live in a `private` schema so they aren't exposed through the API. Supabase's security advisor will still list `delete_my_account` as a notice; that's intended, because signed-in users need to be able to delete their own account.

The database rules were tested against Postgres and against a live Supabase project. Tested: profile creation, contact-detail blocking, impersonation, the report threshold, bans, flood limits and account deletion.

## Limitations

- The topic set is a reviewed starter set (25 topics) and grows over time. Courses without topic pages say so.
- The Ofqual register covers England (with some Northern Ireland data). It does not cover Wales-only or Scottish qualifications.
- EES statistics are aggregates for England and are not used to rank or predict individuals.
- External links were checked on 30 September 2026. Boards reorganise their websites, so check links periodically.

## Curriculum catalogue and next steps

Course pages now include saved AQA syllabus outlines, downloadable revision checklists, and board/tier-specific Oak lesson discovery. `/learn/[slug]` links to the publisher's video, quiz and worksheet resources; an optional server-side Oak API connection enables text multiple-choice quizzes within IlluminatED.

`/next-steps` asks whether the learner wants university, an apprenticeship, both, or is unsure; includes a Year 12 work-experience plan; and shows updating university events with saved opportunities. Official apprenticeship adverts use an optional API subscription. Preferences, checklists and saved opportunities are device-local, and can be cleared on `/your-data`.

Run `npm run sync:education`, `npm run sync:opportunities`, and `npm run test:education`. Source refreshes, server-only keys, licensing and incomplete coverage are documented in [the integration guide](docs/education-integrations.md) and [the coverage audit](docs/education-audit.md). The weekly GitHub refresh workflow is prepared but only starts once pushed and enabled.

### Supabase education storage

Apply the reviewed `supabase/migrations/20261003082046_education_catalogue_and_progress.sql` to the existing project, then run `npm run publish:education` with server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. This stores the public catalogue and opportunity snapshots, while signed-in syllabus ticks, next-step choices and saved opportunities use owner-only RLS. The bundled catalogue remains a fallback. Topic study pages are available for each listed syllabus heading and broad course area. See `docs/education-integrations.md` for privacy, refresh schedules, setup and the remaining coverage gaps.

### Social friends and private school

Apply `supabase/migrations/20261003190000_private_school.sql` and then
`supabase/migrations/20261003191000_social_friends.sql` to the existing
Supabase project. Until applied, the site hides the affected controls or shows
an unavailable state. School names are optional and private from other members;
friend requests are off by default and require the recipient to opt in.
Private messaging is not launched. Review `docs/social-privacy-review.md`
before considering direct messages or any end-to-end encryption claim.
