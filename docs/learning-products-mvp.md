# IlluminatED Learning: product separation and first lesson

The umbrella helps a visitor choose a product. Each product owns its homepage,
navigation and purpose. A subject session never requires playing the city.
IllumWorld uses subject resources as optional help beside a workplace task.

| Product | Local route | Production address after domain configuration |
| --- | --- | --- |
| IlluminatED Learning | `/` | `illumed.co.uk` (existing www alias retained) |
| IllumWorld | `/world` | `world.illumed.co.uk` |
| IllumMaths | `/maths` | `maths.illumed.co.uk` |
| IllumScience | `/science` | `science.illumed.co.uk` |
| IllumEnglish | `/english` | `english.illumed.co.uk` |

## Entry and compatibility

- `/dashboard` is the account's four-product chooser. The former dashboard is
  preserved at `/progress`. Its saved records and older study pages remain usable.
- `/curriculum`, individual lesson links, `/learn`, existing subject/course links,
  class codes and the existing game continue to work.
- `/schools` sends existing school marketing links to `/world/pilot`.
- The product switcher is available in the Learning website and the legacy app
  rail. Product pages use a focused header rather than the legacy app tabs.
- Existing city quests and the Venture Yard repair workshop offer the first
  assessed project. Direct mission entry is available without loading 3D.

## Shared account and subdomains

The four products share the existing Supabase project and one account identity.
On the exact umbrella and four product hosts, browser, server and middleware
clients use Secure, SameSite=Lax cookies scoped to `.illumed.co.uk`. Localhost and
preview deployments keep host-only cookies. Unrecognised subdomains are rejected
for shared cookie configuration; user-supplied `next` destinations remain local
paths only. The existing sign-in callback may stay on the umbrella domain.

The middleware rewrites each recognised product host's `/` to its product page.
Explicit paths such as `/maths/percentages` work on the single-app deployment too,
so current links remain valid. Public resources need no account. Existing session
cookies are refreshed before authenticated public pages render. New pupils still
complete the existing age/consent/account setup. The city character tutorial is
not required to use the Learning products or the school dashboard.

To activate the proposed addresses, add the four subdomains to the **same**
hosting project, configure their DNS records as directed by that project, and
verify TLS. Then set `NEXT_PUBLIC_PRODUCT_SUBDOMAINS=1` and rebuild so the product
switcher crosses to the separate hosts. Until then it uses working same-origin
paths. This change does not buy domains or change DNS. Test an existing account,
sign-in, refresh, switching and sign-out on real sibling hosts before enabling
the flag. Existing host-only login cookies may require signing out and back in
once during the cookie-scope transition.

## First lesson and independent revision

Tech Repair Trainee is a 35–40 minute Year 10 project: three fictional phones,
inspection evidence, acquisition/repair/resale costs, calculations,
recommendations and a customer-facing report. Calculation marking is automatic;
the teacher judges reasoning and communication. Class ownership and membership
are checked in the database, and only the teacher can request changes or approve.
An approved certificate is a project completion record, not an externally
accredited qualification. No employer contribution is claimed without an actual
partner's confirmed role. The pilot page includes a model brief/report and a
clearly marked sample certificate.

Nine original GCSE foundation topic packs are provided: percentages, ratio and
proportion, profit/financial maths, cells/microscopy, particles/materials,
electricity/circuits, reading for evidence, language analysis and writing for an
audience. Short guides and worked examples lead into practice and explanations.
Maths includes a solo accuracy-first race. Longer English/science writing uses
models and self-checks, with teacher review for assigned work. These are focused
MVP packs, not a claim to cover an entire GCSE specification or guarantee a mark.
Existing licensed resources remain available with their attribution.

## School and editorial workflow

`/school` reuses existing classes and school access. Teachers assign any of the
four products; pupils use the same join code/link and see their assigned work.
`/school/class/[id]` shows roster, status, marked scores and writing. World review
includes calculations, recommendations and the report. Pupil clients cannot
write scores, teacher feedback, approval or certificate status directly.

`/school/content` provides an admin-only draft/review workflow for resources,
questions and mission briefs. Board labels require an explicit verified mapping.
New executable question banks and interactive missions require validated authored
structures; a free-text editorial entry does not create a graded exercise by
itself. Shared help resources are defined once and reused in the subject page
and mission sidebar.

## Verification and release status

Meaningful tests cover route/cookie isolation, safe redirects, grading and
race ordering, class isolation, submission/teacher-review transitions and
certificate rules. Database fixtures run inside transactions and roll back.
Production compilation and lint/type checks should pass before release.

The local browser automation provider currently reports that browser use is
disabled in Work settings. HTTP checks and source/database tests can run; visual
and interactive browser QA must be completed when that capability is available.
Domain activation and employer brief review are separate launch tasks; neither is
represented as complete by this implementation.

## Resumption update (14 November 2026, afternoon)

Done after the handover, without touching the live database:

- **Certificate redesign.** `src/lib/illum-world/pdf.ts` now produces the
  navy-and-gold landscape certificate from the reference: a navy chevron band
  with a fine gold edge and IlluminatED/IllumWorld marks, a bold black
  heading, the pupil's name in gold, a sentence describing the actual project
  (not generic praise), the four skills, the approving teacher's username and
  class, the approval date, a certificate ID (`IW-` + first 8 hex characters
  of the project id) and an IlluminatED "project complete" seal. No drawn
  signatures, employer credit or accreditation wording are used; the scope
  disclaimer stays on every certificate. The public sample carries
  placeholders, a "SAMPLE - NOT AWARDED" label and a diagonal watermark.
  The teacher-approval gate is unchanged. The project PDF header moved from
  purple to the same navy and gold.
- **Verified certificate details.** The download route reads the teacher from
  `learning_world_projects.reviewed_by` and the class/assignment from the
  database. Anything RLS hides is omitted (the certificate then says "Class
  teacher"). Downloads now have descriptive file names.
- **Teacher review.** Approving a project with a wrong calculation, or
  requesting changes without feedback, now shows a clear message instead of
  "Could not save". The class view shows the project status, labelled
  recommendations, per-device "correct / expected £x" marking and a note when
  a submitted project cannot yet be approved.
- **Pupil views.** Recommendations show as words ("Acquire and repair")
  rather than codes, amounts as £/-£. "Resume work" on a project page appears
  only for its author; teachers get "Review in your class". Independent
  projects that were finished can be revised from My Work. The "revise and
  resubmit" hint stays visible after the first autosave following a teacher's
  change request.
- **Guest-to-account drafts.** If a pupil starts the mission signed out and
  then signs in on the same browser, the mission offers "Use that draft" or
  "Discard it". It never merges silently, because school laptops are shared.
- `npm run test:learning` runs the four Learning test files (20 tests).

Still required before release (could not be run from the remote session, which
had no install/network access or shell on this computer):

1. `npm run typecheck && npm run lint && npm run build` with preview mode off.
2. `npm run test:learning`, then the five `tests/*-database.sql` suites.
3. Browser QA of the teacher-to-pupil lesson, including downloading a real
   approved certificate and the sample at `/world/pilot/sample`.
4. Review the diff, commit only MVP files on `codex/learning-products-mvp`,
   push, deploy, then domains as described above.
