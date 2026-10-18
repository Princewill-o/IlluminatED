# City assets, Illumship, challenges and friends

## Routes and scope

- `/games/wealth`: Clout holdings, fictional investment quotes, purchases/sales, cost basis and transaction history; links to existing houses and drivable cars. Aircraft and watercraft are collectible ownership assets, not flight or sailing mechanics. Quotes are deterministic per London day; sales pay 95% of the quote. No real securities, money deposits or withdrawals.
- `/games/illumship`: benefits from the existing Premium entitlement, with no second subscription. Contextual game ads are hidden (including event requests/billboards), exotic companion cards can be bought with Clout, and local style previews and encouragement interactions are unlimited. Companions do not follow the player in the city. Tiggy still has its published 200-message daily limit; this does not implement unlimited AI generation.
- `/games/weekly`: three saved study sessions plus ten correct answers earns 100 Clout; two weekend study sessions earns 75. Claims are once per reward per London week, calculated from server-scored study sessions. Themes rotate around society and skills with official background references; this is not a live current-affairs feed. Reward receipts are collection stamps.
- `/games/expansions`: original cartoon characters, short stories, practice Q&A and collectible badges purchased with Clout. Autumn Makers has a database-enforced purchase window ending 1 November 2026 at 00:00 GMT; previously bought packs stay accessible. No licensed famous-character content is included. Obtain character licences before adding third-party commercial DLC.
- `/games/friends`: private mutual requests, up to 30 accepted friends, remove/block/unblock and encrypted conversations. Exact usernames are used rather than a student directory. `/games/friends/reports` is available only to moderators and shows voluntary disclosures.
- `/games/sources`: course/year lesson discovery, official papers/mark schemes, question answers, source check dates and stale/unavailable states. `/games/careers/sources` provides original simulated workplace Q&A with skill-specific reference links. Reference publishers have not certified the scenarios.

The city phone and game subnavigation link to the new areas. Existing homes, furniture, careers and multiplayer edits were preserved.

## Persistence and security

`supabase/migrations/20261018100842_city_wealth_friends_seasons.sql` was applied to the IlluminatED database. Its filename matches the returned remote migration version. Every new table has RLS and explicit grants. Public RPC wrappers are security invokers; private definers validate active membership, lock balances or profile rows and enforce prices, ownership, reward eligibility and friendship state. No client can write Clout, asset prices, scored progress or accepted friendships directly. The post-migration security advisor returned no findings referring to the new city objects; pre-existing project notices remain.

Messaging uses the existing WebCrypto ECDH P-256/AES-GCM helper with a fresh IV and authenticated thread/sender context. The server stores ciphertext; public keys are immutable in the friend-key table. Keys are browser-specific and non-extractable in IndexedDB. Security codes are locally pinned and can be compared out of band. The UI fails closed on key errors, mismatches, blocked friendships or missing crypto support. Messages poll every five seconds, and sends are limited to 20/minute.

This is a single-browser initial E2EE implementation, without forward secrecy, multi-device keys, recovery, an independent security audit or routine content moderation. Initial key distribution trusts the service. Clearing browser storage can lose message access. Reports disclose one selected plaintext message; that disclosure is user-supplied and cannot independently prove the encrypted content. Privacy, safeguarding and subscription copy explain these limits. Do not present this as independently audited encryption.

## Workplace uniforms and overhead icons

Active simulated jobs select their actual role uniform and company chest logo. All eight workplaces have logo coverage, including an original Pizzazz symbol. Both the sprite and WebGL world display an affiliation badge above the username; without a job, the first selected subject supplies a subject icon. Subject scores are never exposed. Staff/employer membership can supply a workplace identity when there is no simulated job.

Occupation and affiliation are included in the server-signed world pass. Remote clients verify the pass, apply its role uniform and reject forged or expired identities. The verification cache is partitioned by signing key and rechecks expiry. The identity expresses an in-game job, not real employment. Signing requires the existing `BILLING_CALLBACK_SECRET` configuration.

## Learning freshness and backup

`node scripts/check-learning-sources.mjs` checks only fixed publisher URLs and records reachability separately from curriculum review. One previous source-health snapshot is retained with a SHA-256 digest on subsequent runs. The existing weekly GitHub refresh now backs up curriculum snapshots, original topics, workplace material and the registry using a 30-day Actions artifact before refreshing. It also checks reference links. Workflow execution, artifact retention and live publication require the repository workflow/secrets to be configured; local edits do not activate a deployed schedule.

The 18 October refresh retrieved 70 Oak programmes and 21 AQA syllabus outlines. The EPQ project page still needs manual mapping; the synchroniser preserves previous entries on failure. Eleven of twelve reference URLs were reachable; MoneyHelper returned HTTP 403 to automated checking. The app shows failures and stale dates rather than inventing current coverage. `newestCurriculum` prevents an older database snapshot from displacing a newer bundled programme/specification. Year filters do not silently substitute another year. Original question practice retains original review/version metadata. Oak quizzes need `OAK_API_KEY`; official paper files are linked, not copied into the app.

## Media and preview

Landing media includes actual Study Quarter/city captures, a labelled illustrative friend conversation and a 12-second silent WebM captured from the real game canvas. No real student messages/accounts were used. The local capture route `/games/city-showcase` requires both development mode and `ILLUMINATED_PREVIEW=1`; it returns 404 in production. Preview data and screenshots are not evidence of live multi-user adoption.

Browser access was disabled in Work settings during final visual checks. The staff nameplate and phone navigation were observed before that; the close-up 3D chest-logo review and final landing-page visual pass could not be completed. The screenshot assets, types, build and automated rules can still be checked locally.

## Validation

- `node --test tests/city-identity-crypto.test.mjs`: uniform/logo coverage, signed identity/forgery rejection, encryption round trip, IV uniqueness, tampering, wrong keys and wrong sender/thread contexts.
- `PGLITE_MODULE=<absolute path to @electric-sql/pglite/dist/index.js> node tests/city-features-database.mjs`: disposable embedded PostgreSQL; 31 checks for grants, RLS isolation, purchases, VIP, expiry, balances, sales, rewards/replay, friends/caps, blocks, reporting and bans. PGlite is a test dependency installed outside the app, not a production dependency. This suite does not simulate concurrent independent database connections.
- Existing education, study, awards, multiplayer and workplace-learning suites pass.
- Final verification: all 136 Node tests and 31 disposable database checks pass. TypeScript, full-source ESLint and the production Next.js build pass. All 108 seed questions match the reviewed local bank; the seed checker now handles Windows line endings. The education-store endpoint returns the expected board providers and explicitly reports the missing Oak key. No frontend deployment was performed.
