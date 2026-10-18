# IlluminatED: launch record and pilot plan

Prepared 18 October 2026. Target beta announcement: Monday 19 October 2026.

## Product and customer

IlluminatED is a learning game for UK learners aged 13+. It connects short subject practice, explained answers and simulated workplace decisions with progress learners and teachers can review.

Initial commercial focus: a defined secondary-school or sixth-form cohort. Do not sell every subject, every qualification and every feature as a fully validated launch product. Select the pilot's exact subjects, boards, question bank and device requirements with the school.

Access: invitation only. Core study is free for invited individual learners. Premium is optional at £5.99/month when available. Schools agree seat count, price, duration, data terms and onboarding in writing. This is a product direction, not a claim of revenue, contracts or educational efficacy.

## Changes in this release

- Shorter homepage explains problem → practice → application → progress.
- Public /pricing and /investors pages distinguish current implementation from pilot hypotheses.
- Invitation activation no longer redirects invited learners to a sales form; database invitation checks remain in place.
- Dashboard offers one first-session action: the Study Quarter, with a lightweight Learn alternative.
- Auto graphics uses a maximum pixel ratio of 1; learners can explicitly select Low 3D or the existing 2D renderer. Preferences persist locally. No zero-lag guarantee is made.
- Career completions now submit signed session receipts and answers. The server reconstructs questions, marks answers and measures elapsed time. Database changes isolate old score-taking RPCs and deduplicate completion claims.
- Private /admin/launch shows configuration presence and manual release gates. It does not certify compliance or live provider behaviour.

## Mandatory deployment dependency: career rewards

Apply `supabase/migrations/20261018130000_verified_career_sessions.sql` through the normal database migration process before deploying the new career client. The migration moves the old public score-taking functions into the private schema, revokes learner execution, and adds verified readiness/completion functions plus atomic, single-use claims.

The application and private database setting `billing_callback_secret` must contain the same existing BILLING_CALLBACK_SECRET (at least 32 characters). Never publish, paste into reports or commit that value. No service-role key is introduced.

The readiness RPC makes sessions fail closed if migration/configuration is absent. Until the migration is applied, the old production RPCs remain an unresolved security issue. Application-only changes do not close that access.

Test in a non-production project first: correct/incorrect scores, altered receipt, other account, role changed mid-session, insufficient duration, expired receipt, duplicate claim and concurrent duplicate claim. Assert exact pay/skills and one database completion only. Then run the same controlled smoke tests in production. This migration has not been applied or database-tested by this release work.

A signed session does not prove physical presence in the game or stop a learner consulting exposed practice material. It prevents the browser choosing its own score/time; do not describe it as exam-grade anti-cheat.

## Release decision (no sign-offs assumed)

All items below are pending until the named owner records evidence. A local build is not production evidence.

| Gate | Accountable role | Evidence to record | Current status |
| --- | --- | --- | --- |
| Production deployment and migration | Technical owner | Commit, deploy URL, migration result, permission and replay tests | Pending |
| First learner journey | Product owner | Invitation → confirmation → setup → first session → return → password reset | Pending |
| Teacher journey | School pilot owner | Class creation, assigned work, learner submission, correct teacher visibility | Pending |
| Device performance | Technical owner | Device/browser, connection, cold load time, sustained FPS, graphics mode, session date | Pending |
| Multi-user reliability | Technical owner | Two real accounts, room join, movement, reconnect, full room and duplicate tab | Pending |
| Child safety and privacy | Operator/safeguarding lead | Applicable assessments, actual provider/data map, report response test and staffed escalation | Pending |
| Permissions, deletion and recovery | Technical owner | Cross-account negative tests, account deletion, backup restore and rollback drill | Pending |
| Payments (only if enabled) | Billing owner | Live transaction, webhook entitlement, cancellation, support/refund test | Pending |
| Support and monitoring | Operator | Working inbox, alert destination, rota and incident process | Pending |

Consult current ICO Children's Code/DPIA guidance and Ofcom's guide for services to determine applicable obligations. A policy page or invitation gate is not a substitute for assessment and operational controls. Use https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/ and https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/guide-for-services .

If messaging safety controls and staffing are not ready, disabling its navigation is insufficient: restrict the database/API feature before learner access. Do not launch social features on the assumption that mutual friendship or encryption removes safety duties.

## Pilot measurement and economics

Agree pilot duration and cohort size with the school before enrolment; no numerical success targets have been fabricated here. Record:

- Activation: learners completing one saved practice session / invited learners, with dates and failed activations.
- First-session completion: completed sessions / started sessions, excluding internal test accounts.
- Weekly practice: active learners and completed sessions, with the definition of active stated.
- Retention: original cohort returning in week four / eligible original cohort. Show dropouts.
- Learning: comparable baseline/follow-up topic assessments; distinguish repeated-question familiarity from transfer. Do not claim causation without appropriate evaluation.
- Teacher value: time spent assigning/reviewing work, identified gaps, continuation intent and paid renewal.
- Economics: receipts less refunds, payment fees, attributable hosting/realtime, AI and support. Separately track sales/onboarding costs. Report paying learners, revenue and gross margin only from reconciled records.

Do not enable session-replay tracking or message-content analytics as part of this plan. Use existing authorised first-party learning records and aggregate reporting, with the privacy assessment covering any new collection.

## Launch-day operations

Before inviting users, nominate a release owner and support contact. Check health and error alerts; record deployed commit. If sign-in, saving, permissions or safety controls fail, stop new invitations and disable the affected operation at its enforcing service. Roll back application code only in coordination with database compatibility: after the career migration, an old client cannot use the removed public reward functions.

Do not reverse the migration by re-exposing insecure score-taking functions as a convenience rollback. Pause career rewards and retain safe subject practice while repairing compatibility.

After the first invited cohort, review incidents and measurements before increasing capacity or buying promotion. Public product pages can be announced before gameplay access expands, but must accurately describe availability.
