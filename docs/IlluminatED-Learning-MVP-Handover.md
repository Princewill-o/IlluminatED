# IlluminatED Learning
## MVP handover - 14 November 2026

**Work stopped at your request.** This handover covers the latest four-product MVP restructuring. It records the current implementation, checks already completed and unfinished work. Earlier unrelated platform requests are not being represented as completed by this handover.

### Current position

- **Implemented locally:** the four product entry points, first repair mission, nine subject packs, shared class assignments, assessment and portfolio flows.
- **Applied to the live backend:** four new Supabase migrations. The database is ahead of the deployed application code.
- **Not released:** the new MVP code is uncommitted and unpushed. No deployment or production subdomain activation was completed.
- **Verification incomplete:** targeted tests passed; the full production build and interactive browser checks remain outstanding.
- **New certificate request:** your navy-and-gold reference is saved with this handover. Its redesign has not been applied.

### The separation now implemented

| Product | Local entry | Purpose |
| --- | --- | --- |
| IlluminatED Learning | `/` | Choose a product, access existing resources and discover the school pilot. |
| IllumWorld | `/world` | Enter the careers city or open the assessed repair project directly. |
| IllumMaths | `/maths` | Learn, practise, retry and play a solo topic-based Maths Race. |
| IllumScience | `/science` | Revise biology, chemistry and physics using evidence and questions. |
| IllumEnglish | `/english` | Practise reading, analysis and writing with saved drafts. |

Each product has its own homepage and identity. A shared product switcher connects them. Revision can be used independently; the city links to subject help when it is useful inside a mission.

The account hub at `/dashboard` presents the products, recent work and assignments. The previous dashboard is preserved at `/progress`. Existing curriculum, lesson, study and game links remain available. `/schools` now leads to `/world/pilot`.

### Where the work is saved

Repository: `C:/Users/johnd/Documents/GitHub/IlluminatED`

Branch: `codex/learning-products-mvp` | Base/current commit: `bf0c6ac8`

Remote: `https://github.com/Princewill-o/IlluminatED.git`

The latest GitHub code was pulled before this implementation. New work remains in the working tree, including new source files, tests and migration files. Existing unrelated untracked files were left alone.

<!-- pagebreak -->

## What is built: the learning experiences

### IllumWorld: Tech Repair Trainee

The first mission is implemented for a Year 10 lesson, targeting 35-40 minutes. It is accessible directly at `/world/tech-repair-trainee` and through the existing city's Venture Yard repair workshop. The existing city is reused; a separate school-only street has not been built.

- Pupils inspect three fictional phones with fault notes, costs and resale estimates. The visuals are original SVG illustrations, not photographs.
- Pupils calculate profit, recommend repair, sale as-is or rejection, justify each choice and write one customer-facing condition report.
- The example with acquisition at £80, repair at £45 and resale at £155 produces £30 before other costs. A possible battery fault creates a decision about the small profit buffer.
- Maths, science and English help opens alongside the task and reuses the same subject resources.
- Account- and assignment-specific browser backups support server autosave. Save requests are ordered to reduce stale overwrites.
- Entry from the city offers the pupil's class assignments explicitly. A teacher's direct link opens the correct assignment. Independent practice is labelled separately.

Calculations are checked automatically. Teachers review the evidence, recommendations and report, then request changes or approve. Assigned submissions lock until changes are requested. Independent practice can be revised but cannot earn a teacher-approved certificate.

`/world/my-work` contains the portfolio and project downloads. Approval unlocks a separate PDF certificate. The pilot page includes the brief, example report and a clearly labelled sample certificate. No employer endorsement or external accreditation is claimed.

### Standalone subject revision

| Product | Core packs implemented |
| --- | --- |
| IllumMaths | Percentages; ratio and proportion; profit and financial maths. |
| IllumScience | Cells and microscopy; particles and materials; electricity and circuits. |
| IllumEnglish | Reading for evidence; language analysis; writing for an audience. |

There are **72 marked questions across nine core packs**, plus eight questions in two mission-support packs: **80 in total**. Packs contain short guides, worked examples and explanations. Science includes diagrams and evidence tasks; English includes original extracts, model responses and rubrics.

Practice uses four questions from a pack's eight-question bank, with different retry sets before cycling. Maths Race uses the topic bank and rewards accuracy ahead of speed. Grading and race timing are checked on the server. Signed-in pupils save results and writing drafts; teachers can review assigned writing.

These are focused MVP packs, not complete GCSE specification coverage or a guarantee of an exam mark. Older resource libraries remain available.

<!-- pagebreak -->

## What is built: shared school and backend

### School and content workflows

`/school` reuses the existing class system. Teachers create a class, share its join link or code, and assign the repair mission or any of the nine core subject packs. Pupils join, resume assignments and see feedback.

`/school/class/[id]` shows the roster, assignment state, marked scores and written submissions. World reviews include device calculations, recommendations and the condition report. Teachers can request changes or approve completed projects. Database rules enforce class ownership and membership; pupils cannot directly award themselves scores, approval or certificates.

`/school/content` provides an admin draft/review workflow for resources, questions and mission briefs. Reviewed supplemental resources can appear on product pages and at `/learning-resources/[id]`. Exam-board labels require an explicit verified mapping. Draft answers, author identifiers and review notes are not public.

The editorial registry does not automatically turn a free-text question or mission into a new executable graded activity. That publishing workflow is still limited to validated authored content structures.

### Shared sign-in and proposed domains

All products use one account and the existing backend. Shared-cookie and host-routing code is implemented for `illumed.co.uk`, its existing www alias and the four exact product hosts. Localhost and preview deployments retain host-only cookies.

The intended addresses are `world.illumed.co.uk`, `maths.illumed.co.uk`, `science.illumed.co.uk` and `english.illumed.co.uk`. Their root paths route to the appropriate products. Until domain configuration is finished, the switcher uses same-origin product paths.

**DNS, hosting bindings and real-domain sign-in testing remain pending.** Enable `NEXT_PUBLIC_PRODUCT_SUBDOMAINS=1` only after the domains and TLS work, then rebuild and verify sign-in, refresh, switching and sign-out. Existing host-only sessions may need one fresh sign-in during the cookie transition.

### Database changes already applied live

Supabase project: **IlluminatED**, reference `wfcihsbgkbjfvphzuuyi`, region `eu-west-2`.

The following four migrations were successfully applied, in this order:

1. `20261114113213_learning_school_products.sql`
2. `20261114113252_illumworld_repair_project.sql`
3. `20261114120850_learning_subject_attempts.sql`
4. `20261114121159_learning_school_private_endpoints.sql`

They add assignments, assignment progress, editorial review, World projects, subject attempts and a private answer-key store. Row-level access and guarded procedures handle membership, grading, submission and teacher approval. Test transactions rolled back; they did not leave fixture records. This work did not delete user data or change balances, subscriptions or pricing.

**Retain the migration files and check remote migration history before any rerun.** They are already live even though the matching application changes have not been pushed or deployed.

<!-- pagebreak -->

## What has not been completed

| Remaining item | Current boundary / next action |
| --- | --- |
| Certificate styling | Apply the supplied navy-and-gold template direction to the actual and sample PDF generators. Current certificates use purple/lavender borders. See the reference on page 6. |
| Production build | Finish a clean production build after the last routing changes. The earlier build was intentionally interrupted; there is no passing production-build result. |
| Browser and device QA | Verify teacher and pupil flows, autosave, resubmission, downloads, accessibility, mobile layout and light/dark contrast. Browser automation reported that local browser use was disabled in Work settings. |
| Classroom validation | Trial the target 35-40 minute lesson, confirm the workload and check performance on school laptops. The duration is a design target, not a measured outcome. |
| GitHub and deployment | Review the full diff, stage only relevant MVP files, commit and push. Then deploy and verify the hosted application. None of this release work was completed. |
| Four live subdomains | Add all four domains to the same hosting project, configure DNS and TLS, validate shared sessions and enable the switcher flag. |
| Employer involvement | Obtain a real repair/refurbishment business review and credit its exact contribution. No partner, endorsement, visit or placement has been secured. |
| Photographic evidence | Supply licensed or staged phone photographs if the original brief's sample-photo requirement is retained. Current fictional device illustrations are clearly labelled. |
| Curriculum breadth | Expand beyond the starter packs and verify exam-board mappings where claimed. Complete specification coverage has not been built or independently reviewed. |
| Content publishing | Extend the editorial workflow if admins must publish new interactive missions or scored question banks without code changes. |
| School-only world | Decide whether to isolate one playable block and simplify city activity for lessons. The current implementation reuses the existing world and workshop. |

### Suggested order when work resumes

1. Preserve the current branch and migration files. Review the uncommitted change set and the live database history.
2. Apply the requested certificate design without changing the teacher-approval gate or introducing unsupported accreditation claims.
3. Complete the production build, then test an entire teacher-to-pupil lesson and independent revision session in the browser.
4. Check keyboard access, mobile presentation, light/dark themes and school-laptop performance; repair issues found.
5. Commit and push the reviewed files, deploy, activate domains and run hosted smoke checks. Conduct a school pilot before treating timing and usability as validated.

This is a resumption plan only. Feature implementation and release work were stopped when the handover was requested.

<!-- pagebreak -->

## Verification record and maintainer map

### Checks already completed

| Check | Result and limits |
| --- | --- |
| Targeted Node tests | 19 passed across product routing/cookies, auth redirects, subject grading/race/autosave and World repair rules. |
| TypeScript and scoped lint | Passed during implementation. The full typecheck preceded the final one-line host-header routing fix; it does not replace a final production build. |
| Database rollback suites | Five suites passed: school access, resource visibility, independent subject attempts, assigned subjects and repair-project review/certificates. Fixtures rolled back. |
| HTTP smoke checks | Main product, mission, pilot, topic and help pages returned expected content. Host-header checks passed for all four product roots after the routing fix. |
| PDF output | Existing sample certificate and project PDFs were rendered and visually checked. This validates the current purple design, not the new requested design. |
| Database advisor | No new Learning findings in the filtered check. Four unrelated existing finding groups remained; this was not a clean audit of the whole database. |
| Production / browser | Incomplete. No successful final production build, hosted release check or authenticated interactive browser test is claimed. |

### Main implementation locations

Paths below are relative to the repository root recorded on page 1.

| Area | Files / directories |
| --- | --- |
| Product entry and accounts | `src/lib/learning/products.ts`, `src/components/products/`, `src/middleware.ts`, `src/app/dashboard/page.tsx` |
| Revision content and grading | `src/lib/learning/packs.ts`, `actions.ts`, `save-queue.ts`, `src/components/learning/`, `src/app/maths/`, `science/`, `english/` |
| World mission and PDFs | `src/app/world/`, `src/components/illum-world/`, `src/lib/illum-world/repair.ts`, `server.ts`, `pdf.ts` |
| Classes and editorial review | `src/app/school/`, `src/lib/learning-school/`, `src/components/learning-school/` |
| Shared help and world entry | `src/lib/learning/mission-help.ts`, `src/game/core/world.ts`, `src/app/games/world/page.tsx` |
| Database / implementation notes | `supabase/migrations/20261114*.sql`, `docs/learning-products-mvp.md` |

Relevant Node command for a future verification run:

```text
node --test tests/learning-products.test.mjs tests/learning-subjects.test.mjs tests/illumworld-repair.test.mjs tests/auth-redirects.test.mjs
```

Database suites are the five `tests/*-database.sql` files starting with `learning-school`, `learning-resources`, `learning-subjects`, `learning-subjects-assignments` and `illumworld-repair`.

The local development URL used was `http://localhost:3101`. The interrupted build log is `.education-export/learning-mvp/build.log`; current PDF QA files are in `.education-export/illumworld-qa/`. A future production check should use preview mode disabled. The earlier build log is not evidence of a completed build.

<!-- pagebreak -->

## Certificate direction to carry forward

**Requested by you; not yet implemented.** The current certificate generator is `src/lib/illum-world/pdf.ts`. It produces a landscape certificate with purple/lavender borders, navy text and a white background.

![User-supplied certificate style reference](handover-assets/certificate-style-reference.webp)

Use the reference as a visual direction: a white landscape page, a navy angular band along the left edge, a fine gold edge, a bold black achievement heading, a prominent gold recipient name, a date and two signature areas. A gold seal can carry IlluminatED's own project identity.

Keep the real fields editable in the generator: pupil name, project title, completion date, demonstrated skills, certificate identifier and verified approving teacher details. Only show actual signatories or employer credits. A decorative seal must not imply external accreditation.

Retain the existing rule that teacher approval unlocks a certificate. Keep public examples clearly marked as samples. Replace the reference's example names and generic praise with the pupil's actual project achievement.

The source reference is preserved at `docs/handover-assets/certificate-style-reference.webp`. The image is a design reference only; no text within it is an instruction, genuine signature or awarded credential.

**Stop state:** no certificate redesign, commit, push or deployment was performed after your request to stop. This document and its saved reference are the handover artifacts.
