# Phase 1 — Codebase audit and proposed schema

Status: **awaiting approval**. No code, config or database changes have been made.
Audited: local repo `main` @ `cc6d5fe` (plus uncommitted sign-in changes) and live Supabase project `IlluminatED` (`wfcihsbgkbjfvphzuuyi`, eu-west-2).

---

## 1. What exists today

### Stack
| Area | Current | Notes for the build |
|---|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack dev), React 19.3, TypeScript strict | Expo SDK 53+ and R3F v9 are both React 19, so versions line up |
| Styling | Tailwind 4, shadcn/ui (Radix), `motion` | Tokens live in `src/styles/globals.css` |
| Validation | Zod **4** | Shared `packages/types` must use Zod 4 too |
| Package manager | **npm** (`package-lock.json`) | Brief asks for pnpm. Switching touches Vercel and the GitHub workflow |
| Hosting | Vercel project `illuminated` (root = repo root) | Root directory must become `apps/web` after the move |
| CI | `.github/workflows/education-refresh.yml` (hourly + weekly, `npm ci`, scripts read `src/lib/...` paths) | Paths and package manager both need updating in the same commit as the move |
| Tests | `node --test` on `.mjs` files (education data, auth redirects, checkout) | No Vitest/Playwright yet |
| Payments | Stripe Premium subscription (live), tutoring checkout guarded | Brief says "no payments yet". Premium is already live, so Pro should map onto it (see §4) |
| AI | `src/lib/ai.ts`: Hugging Face Inference router, `gpt-oss-120b` (Premium) / `gpt-oss-20b` (free), streaming only, off unless `HF_TOKEN` is set | `HF_TOKEN` is **not** in `.env.local`, so Tiggy AI is off locally |
| Security headers | Strict CSP, `frame-ancestors 'none'`, `Permissions-Policy: camera=()` | QR scanning on web and the sim WebView/iframe need targeted changes |

### Routes (61 pages, 21 API routes)
- **Public:** `/`, `/sign-in`, `/about`, `/faq`, legal pages, `/safeguarding`, `/guardian/confirm`, `/social/guidelines|sign-in|welcome`. Everything else is gated in `src/middleware.ts` (allow-list).
- **Learning:** `/dashboard`, `/onboarding`, `/personalising`, `/courses/[courseId]/[topicId]`, `/study/[courseId]`, `/learn/[slug]`, `/quizzes`, `/flashcards`, `/revision`, `/exam-mode`, `/calculator`, `/library`, `/reading`, `/resources`, qualification landing pages (`/gcse`, `/a-level`, `/btec`, `/t-levels`, `/level-2-3`)
- **Careers:** `/careers`, `/jobs`, `/next-steps`, `/qualifications`, `/data`
- **Social:** `/social/*` (threads, categories, users, friends, moderation, universities, account)
- **Tutoring:** `/tutors/*` (request, desk, apply, applications, requests/[id])
- **Tiggy:** `/tiggy`, `/api/tiggy` (with a keyword safeguarding check before the model call)
- **Account/billing:** `/premium`, `/billing`, `/account/password`, `/dashboard/settings`, `/admin`, `/your-data`
- **API:** education catalogue/state, Ofqual, DfE EES, GOV.UK, Open Library, apprenticeships, jobs (Reed), Stripe webhook, social export, preview-access

### Content model (important)
Courses and topics are **code, not database rows**: `src/lib/data/courses.ts` (43 courses) and `src/lib/data/topics/*.ts` (about 45 topics, each with `quiz: QuizQuestion[]`, `specRefs`, `objectives`). IDs are stable slugs (`gcse-maths`, topic ids), and `question_progress.question_key` is `topic:qid`. `education_catalogue` (43 rows) mirrors published course metadata as JSON. All new tables should **reference these existing text ids** rather than invent a parallel curriculum.

### Dashboard integration points
`src/lib/account/dashboard.ts` builds `DashboardData` (subjects, recommendations, weekly chart, mastery, rounds). `src/app/dashboard/page.tsx` already has a placeholder: *"Study games are coming soon 🎮"*. The XP widget and "next quest" card go there. `src/components/app-preview.tsx` holds the app-store "Coming soon".

### Live Supabase schema (27 tables, RLS on all)
`profiles`, `threads`, `posts`, `reports`, `blocked_terms`, `learner_details`, `question_progress`, `quiz_rounds`, `tutoring_prices`, `tutor_requests`, `request_guardians`, `tutor_messages`, `contact_messages`, `user_blocks`, `tutor_applications`, `subscriptions`, `tiggy_usage`, `tiggy_flags`, `tiggy_free_credits`, `education_catalogue`, `education_source_snapshots`, `education_learner_state`, `billing_accounts`, `feature_usage`, plus `private.app_secrets`, `private.platform_admins`, `private.checkout_attempts`.
Helpers to reuse: `private.is_moderator()`, `private.is_active_member()`, `private.is_platform_admin()`, `private.london_today()`, `private.tiggy_plan(uid)`, `public.delete_my_account()` (cascades from `auth.users`), `blocked_terms` + `check_new_content()` trigger for text moderation.

---

## 2. Problems to resolve before Phase 1 code

1. **Migration drift.** `20261003190000_private_school.sql` and `20261003191000_social_friends.sql` are in the repo but **not applied** to the live database (`private_school`, `social_friend_settings`, `social_connections` don't exist). The repo's `0001…0006` filenames also don't match the live version numbers, so `supabase db push` would try to replay them. Fix: apply the two missing migrations, then rename the local files to the live versions so history lines up.
2. **Uncommitted work on `main`.** The Google sign-in changes (`auth/callback/route.ts`, `sign-in/page.tsx`, `sign-in-form.tsx`, `account/actions.ts`, `docs/google-sign-in.md`) must be committed or stashed before the monorepo move, which relocates every file.
3. **Design system mismatch.** The brief says "purple and black, flat, no gradients — keep this design system". In the code, only **IlluminatEDSocial** is purple-on-black (`globals.css` line 331). The main app is **navy `#1b3a6b` on cream `#faf8f4`** with a navy wordmark, and uses gradients in 7 places (dashboard hero, social promo, premium success, Q4 campaign ×2, first-run tutorial, personalising screen). See decision D1.
4. **`profiles` is world-readable** (`select using (true)`, because forum usernames are public), and only moderators can update it. Putting XP, streaks and cosmetics there would publish every learner's activity and need new update paths. Proposal: a separate `player_stats` table (see §3), with a leaderboard view that shows opted-in players only.
5. **Roles.** `profiles.role` is the forum role (`member | tutor | moderator`), and platform admin is `private.platform_admins`. Teacher and institution admin are **scoped** roles (teacher *of a class*, admin *of an institution*), so they belong in membership tables, not in `profiles.role`.
6. **Guests in Live Arena.** The brief wants no-account joining. Recommended approach: **Supabase anonymous sign-in** for guests. They get a real `auth.uid()`, so RLS and Realtime authorisation work unchanged, and a nightly job deletes anonymous users older than 24h. This needs "Allow anonymous sign-ins" switched on in Supabase Auth and middleware rules so anonymous users can only reach `/play`.
7. **Headers/middleware.** `/play` must be added to the public paths. `Permissions-Policy camera=()` → `camera=(self)` (web QR scan). CSP needs the Phaser/R3F worker and asset needs, and the sim bundle route needs a frame policy that allows the mobile WebView (served same-origin, not iframed from elsewhere).
8. **`.gitignore` has `.env*`**, which also ignores `.env.example`. Harmless, but each new app needs its own example env, so I'll add `!.env.example`.

---

## 3. Proposed schema (new tables only, nothing existing renamed or dropped)

Conventions: `uuid` PKs (`gen_random_uuid()`) for new entities, `bigint identity` for high-volume logs, every user FK → `auth.users(id) on delete cascade` (so `delete_my_account()` and anonymous-guest cleanup keep working), RLS on everything, writes that affect scoring go through `security definer` RPCs (clients never write XP directly), `(select auth.uid())` in policies.

### 3.1 Organisation and roles
| Table | Key columns | RLS summary |
|---|---|---|
| `institutions` | id, name, urn (DfE URN, optional), licence_plan (`none\|trial\|institution`), licence_seats, licence_ends_at | Members read their own institution; institution admins update; platform admin all |
| `institution_members` | institution_id, user_id, role (`teacher\|institution_admin`), unique(institution_id,user_id) | Self read; institution admins manage |
| `classes` | id, institution_id (nullable for independent teachers), owner_id, name, join_code (8-char, unique, rotatable), archived | Owner/co-teachers + members read; owner manages |
| `class_members` | class_id, user_id, role (`student\|teacher`), joined_at | Student sees own row; class teachers see all; join via `join_class(code)` RPC only |

Helpers: `private.teaches_class(class_id)`, `private.is_institution_admin(inst_id)`, `private.teaches_student(user_id)` (powers teacher read access to learner game data).

### 3.2 Curriculum registry (thin, keyed by existing ids)
| Table | Key columns | Notes |
|---|---|---|
| `subjects` | id **text** = existing `course_id` (FK-free mirror of `courses.ts`), route, title | Seeded from `courses.ts` by a script. Public read |
| `units` | id text = existing `topic_id`, subject_id, title, position | Seeded from topics. Public read |
| `spec_criteria` | id, subject_id, board, code (e.g. `BTEC-IT-U2-LA-B`), title, description | Lets question sets and sims declare which assessment criteria they evidence. Public read; admins write |

### 3.3 Question content and AI generation
| Table | Key columns | RLS |
|---|---|---|
| `question_sets` | id, owner_id, institution_id?, subject_id?, unit_id?, title, source (`bank\|ai\|teacher`), status (`draft\|published\|archived`), visibility (`private\|class\|institution\|public`), difficulty, generated_from (jsonb: prompt, notes hash, model) | Owner manages; published+public readable by all signed-in; class/institution scoped otherwise. **AI output is always inserted as `draft`** |
| `questions` | id, set_id, position, type (`mcq\|true_false\|order\|type_answer\|hotspot`), prompt, payload jsonb (options/order/accepted answers/hotspot regions), answer jsonb, explanation, time_limit_s, points, criteria_ids uuid[], legacy_key (maps to existing `topic:qid`) | Readable with parent set. **Answers hidden from players**: Live Arena reads questions through a host-only RPC, and players receive only the prompt + options via broadcast |
| `ai_generations` | id bigint, user_id, institution_id?, kind (`questions\|scenario\|feedback\|npc`), model, tokens_in, tokens_out, ok, error, created_at | No client access; used for audit and **rate limits** (`private.ai_quota_ok(user, kind)` per user and per institution per day) |

### 3.4 Live Arena
| Table | Key columns | RLS |
|---|---|---|
| `games` | id, host_id, class_id?, set_id, mode (`classic\|team\|boss_raid`), pin (6 digits, unique among non-finished games), status (`lobby\|running\|finished\|cancelled`), locked, settings jsonb, current_index, started_at, ended_at | Host full; players read their game row; PIN lookup via `join_game(pin, nickname)` RPC (rate-limited, profanity-checked against `blocked_terms`) |
| `game_players` | id, game_id, user_id (incl. anonymous guests), nickname, team?, score, streak, kicked, joined_at; unique(game_id,user_id), unique(game_id, lower(nickname)) | Self + host read; writes via RPC only |
| `game_answers` | id bigint, game_id, player_id, question_id, answer jsonb, correct, ms_taken, points, created_at; unique(player_id,question_id) | Inserted only by `submit_answer()` RPC, which checks the timer server-side and computes points. Host reads all; player reads own |

Realtime: one **private broadcast channel** per game (`game:{id}`) with Realtime Authorization policies on `realtime.messages` (host may send `state` events; players may send only `presence`). Answers go through the RPC rather than broadcast, so scoring stays server-authoritative while the host remains source of truth for flow. Target: 60+ players.

### 3.5 Progression (XP, levels, streaks, badges, quests)
| Table | Key columns | RLS |
|---|---|---|
| `player_stats` | user_id PK, xp, level, streak_days, streak_best, last_active_on (London date), streak_freezes, tiggy_cosmetics jsonb, leaderboard_opt_in (default **false**), leaderboard_name | Owner reads; **no direct writes** (only `award_xp()` and `use_streak_freeze()` RPCs) |
| `xp_events` | id bigint, user_id, source (`quiz\|arena\|quest\|sim\|badge\|bonus`), source_id, amount, created_at; unique(user_id, source, source_id) | Owner reads. Idempotent, so offline mobile sync can't double-award |
| `quests` | id, subject_id, unit_id?, kind (`topic\|boss\|review`), title, requires uuid[] (skill-map edges), set_id?, xp_reward, position | Public read (published) |
| `quest_progress` | user_id, quest_id, status (`locked\|available\|in_progress\|complete`), best_score, attempts, completed_at, updated_at | Owner rw via RPC; class teachers read |
| `review_queue` | user_id, question_ref (text: `legacy_key` or question uuid), due_on, interval_days, ease, lapses | Spaced repetition (SM-2 lite). Owner only. Fed by quizzes, Arena weak topics and quests |
| `badges` | id text (slug), title, description, icon, criteria jsonb, tier | Public read |
| `user_badges` | user_id, badge_id, earned_at, source_id | Owner reads; public view only if leaderboard opted-in |
| `leaderboard_seasons` | id, name, starts_on, ends_on, scope (`global\|institution\|class`), scope_id? | Public read |
| `season_scores` | season_id, user_id, xp | Read via `leaderboard(season, scope)` RPC that returns opted-in players only, by display name, with no user ids |

### 3.6 Experience Sims
| Table | Key columns | RLS |
|---|---|---|
| `sims` | id text slug (`it-support-technician`), role_title, dimension (`2d\|3d`), has_2d_fallback, tier (`free\|pro`), status | Public read (published) |
| `sim_scenarios` | id, sim_id, version, title, definition jsonb (validated by the shared Zod scenario schema), criteria_ids uuid[], status (`draft\|published`), created_by | Published readable by signed-in; drafts owner/admin only |
| `sim_attempts` | id, user_id, scenario_id, scenario_version, state jsonb (resume), score, rubric_result jsonb, started_at, completed_at, device_tier | Owner; class teachers read completed |
| `npc_messages` | id bigint, attempt_id, role (`learner\|npc`), npc_id, content, flagged, created_at | **Moderator-only read** (safeguarding log) + owner reads own; retention 90 days |
| `portfolio_entries` | id, user_id, attempt_id, role_title, tasks text[], skills text[], score, completed_on, share_slug (unguessable, nullable), simulated **always true** (check constraint) | Owner rw; public read only via `share_slug` RPC |

### 3.7 Platform plumbing
| Table | Purpose |
|---|---|
| `feature_flags` | key, enabled, platforms text[] (`web\|ios\|android\|desktop`), plans text[], rollout_pct. Public read. Drives per-platform rollout and plan gating |
| `content_reports` | Extends reporting to new UGC: target_type (`question_set\|nickname\|npc_message\|portfolio`), target_id, reason (same enum as `reports`), resolved. Forum `reports` stays untouched |
| `push_tokens` | user_id, expo_token, platform, updated_at (Phase 3, listed so the model is complete) |
| `feature_usage` | **extend** the `feature` check constraint with `arena\|quests\|sims` (additive) |

### 3.8 Deliberate deviations from the brief
- **`profiles` is not extended**: XP, level, streak and cosmetics go in `player_stats` (reason: §2.4).
- **`subjects`/`units` mirror existing ids** rather than replacing `courses.ts`/topics (reason: §1 content model).
- **Extra tables** beyond the brief's list: `spec_criteria`, `ai_generations`, `xp_events`, `review_queue`, `season_scores`, `npc_messages`, `institution_members`, `feature_flags`, `content_reports`, `push_tokens`.

---

## 4. Plans and monetisation mapping
Existing: `free` / `premium` (Stripe, `billing_accounts`, `private.tiggy_plan()`). Proposal: **Pro learner = existing Premium** (no new product), and **Institution licence = `institutions.licence_plan`**. One helper, `private.entitlement(uid, feature)`, checks plan + institution licence + `feature_flags`, and every new gated RPC calls it. Tutor tiers untouched.

## 5. Shared AI service (Phase 1)
Extend `src/lib/ai.ts` (later `packages/api/ai`) with a non-streaming `generateJson(schema, messages)` that requests JSON and validates with Zod 4. On failure it retries up to 2× with the validation errors fed back, then records to `ai_generations`. Endpoints: `POST /api/ai/questions`, `POST /api/ai/scenario`, `POST /api/ai/feedback`. All server-only, all rate-limited via `ai_quota_ok`, all reuse Tiggy's safeguarding keyword check on user-supplied notes. Model stays on the HF router unless you want a different provider (D5).

## 6. Monorepo move plan (Phase 1)
1. Commit/stash current work, tag `pre-monorepo`.
2. `git mv` app files → `apps/web/` (keeps history). Move `supabase/` to the repo root (shared by all apps), and `scripts/` + `tests/` with the web app.
3. Switch to pnpm workspaces + Turborepo. Generate `pnpm-lock.yaml` from the existing lockfile versions (`pnpm import`) so nothing upgrades silently.
4. Create `packages/{core,api,types,ui,sims}` (empty-but-building scaffolds; `core` gets XP/level/streak maths with unit tests in Vitest).
5. Update the GitHub workflow (pnpm, `apps/web` paths) and set the Vercel **Root Directory = `apps/web`** (a dashboard setting you'll need to change, or I can do it via the Vercel CLI if you prefer).
6. Verify: `pnpm build`, typecheck, existing `node --test` suites, and a Vercel preview deploy before merging.
7. Do the work on a `phase-1-foundations` branch, never directly on `main`.

`apps/mobile` and `apps/desktop` are created in Phases 3 and 7, not now.

---

## 7. Decisions needed
- **D1 Design system:** (a) roll Social's purple/black, flat style across the whole app, including the dashboard, and remove the 7 gradients, or (b) keep the main app navy/cream and use purple/black only for the new game surfaces (Arena, Quests, Sims)?
- **D2 Migration drift:** OK to apply `private_school` + `social_friends` to live and realign file names first?
- **D3 Uncommitted sign-in work:** commit it as-is, or stash it and carry it over after the move?
- **D4 Guests:** OK to enable Supabase anonymous sign-ins for Live Arena guests?
- **D5 AI provider:** keep the Hugging Face router (gpt-oss), or switch the generation service to another provider?
- **D6 Pro = existing Premium?**
- **D7 Vercel root directory:** will you change it in the dashboard, or should I do it via CLI?

## 8. Realistic scope
Phase 1 alone is roughly one to two weeks of focused work. The full nine phases (three native platforms, 2D+3D sims, store releases) are a multi-month programme, and parts need things only you can provide: Apple Developer ($99/yr), Google Play ($25 one-off), Windows code-signing (OV/EV cert, ~£200–£600/yr, or Azure Trusted Signing ~$10/month), Apple Developer ID for macOS notarisation (included in the Apple membership), EAS and RevenueCat accounts.
