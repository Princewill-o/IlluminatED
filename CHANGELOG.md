# Changelog

## 2026-10-15 · App shell, characters v2, Worlds, employers and messaging

### Added
- **App-style shell** for signed-in pages: bottom tabs (Home · Learn · Play · Social · Me) on phones and a side rail on desktop, in purple and black. The landing website stays navy and cream. New `/learn` and `/me` hub pages. The PWA manifest now opens on `/dashboard`.
- **Characters v2:** full-body avatars with 15 categories (skin, head, eyes, brows, mouth, extras, hair, hair colour, top, bottom, shoes, hat, face, held, pet), 127 items, rarity tiers, outfit sets, and a styled boss character for each of the 13 companies. The Locker has grouped tabs, preview-before-buy, set progress and "Surprise me".
- **Parody company logos** (`src/game/core/logos.ts`): original flat badges for every company (a paw for Barklays, a cow-spotted basket for Tescow, and so on). They are shown on the game cards, in Promotion Panic and on building roofs. No real brand marks are used.
- **Worlds** (`/games/world`): walkable top-down maps (IlluminatED City, Careers Campus and one office per verified employer) with region-based servers of up to 40 players. They have live presence over private Realtime channels, preset phrases and emotes only (no free chat), a joystick and tap-to-walk, and reconnect handling for bad Wi-Fi. The scenery follows UK time: day, dusk and night, with lit windows and street lamps. There are drifting clouds, falling leaves, fountain sparkle, footstep dust, a smoothed camera, ambient sound and a fade between maps.
- **Employers** (`/employers`, `/employers/join`, `/employers/office`): staff verify with a code sent to their work email (free-mail domains are refused). Their company gets an office map, a profile page (`/companies/[slug]`), advice posts and bookable office hours in the office meeting rooms.
- **Messaging** (`/messages`): learners can message verified staff only. Adults get end-to-end encryption (ECDH P-256 + AES-GCM; private keys never leave the device). Under-18s get moderated plain-text threads that only open after a parent/carer approves by email (`/guardian/messages`). Contact details are blocked, and any message can be reported.

### Database
- `20261015150000_games_characters_v2.sql` (**applied to live**): the 15 slots, `rarity` and `set_id` columns, 127 catalogue rows and an updated `game_set_avatar`.
- `20261015170000_worlds_employers_messaging.sql` (**not yet applied**): Realtime policies for `world:*` channels, plus organisations, members, advice, office slots, public keys, threads, messages and reports, all with RLS. Server-only RPCs use the existing shared secret. Run `supabase db push` (or apply it from the dashboard) before using Worlds, Employers or Messages.

### Environment
- `RESEND_API_KEY` and `EMAIL_FROM` are needed to send employer codes and parent/carer approval emails.

### Tests
- `tests/game-core.test.mjs`: 9 passing, covering the catalogue against the migration, boss outfits, world walkability (a path-finding check from spawn to every door), meeting rooms, walking speed and server selection.

## 2026-10-15 · IlluminatED City: Promotion Panic

The first game on IlluminatED. It's a fast, funny revision arcade where you climb from Intern to CEO at a made-up parody company by answering real questions against the clock.

### Added
- **IlluminatED City** (`/games`): a city map of 13 parody companies, each mapped to real courses. Goggle (Computer Science), Macrosoft (IT), Barklays (Maths, a bank run by dogs), Tescow (Business), St Plaster's Hospital (Biology/Health), Tesler Motors (Physics), Gregz (Chemistry), Lawz & Order LLP (Law/English/History), Netflics (Media/English), Bodge & Sons (Construction), Psyke Sports (Sport), Tiny Humans Nursery (Early Years), Atlas & Co. Travel (Geography). Companies matching the learner's own subjects show first as "For you".
- **Promotion Panic** (`/games/promotion-panic/[company]`): a 12-task shift with a timer, streak multipliers (×2/×3/×4), a promotion ladder (Intern → … → CEO → Galactic Overlord), 3 strikes ("you're FIRED"), power-ups (Coffee Break, Blame the Intern, Ask Tiggy), comic boss reactions, sound effects (with a mute toggle), keyboard play (1–4, Enter) and an end-of-shift "Performance review" with your revision notes for every question you missed.
- **Questions:** the existing question bank, plus key terms turned into "which term means…?" questions, plus endless Mathletics-style generated questions (binary/hex, percentages, compound interest, ratio, best buys, profit margin, magnification, speed, Ohm's law, power, weight, density, Mr, moles, area/volume, scale, pace, homophones). Decks are seeded, so challenges replay identically.
- **Progression:** XP and levels, Clout (currency), daily streaks, the "Daily Grind" double-Clout bonus on your first shift each day, and best rank per company.
- **The Locker** (`/games/locker`): a dress-up avatar (skin, hair, hair colour, outfit, hat, eyewear, held item, desk pet). 64 items: free starters, Clout purchases, and rare unlocks for becoming CEO at each company, reaching level 5/10, or a 7-day streak.
- **Challenge a friend:** share a link (`/games/challenge/CODE`) that anyone can open without signing in. Friends play the exact same 12 tasks and see whether they beat you, which brings new sign-ups in.
- A dashboard banner, a "IlluminatED City 🎮" item in the Practise menu, and the old "Study games are coming soon" line now links to the game.

### Database (`supabase/migrations/20261015130925_games_promotion_panic.sql`, applied to live)
- New tables: `player_stats`, `game_company_progress`, `game_runs`, `game_challenges`, `cosmetic_items`, `player_items`. RLS is on everything, and players can only read their own rows.
- Every score and currency change goes through security-definer functions (`game_finish_run`, `game_buy_item`, `game_set_avatar`, `game_create_challenge`, `game_challenge`). These reject impossible runs (score above 800 per correct answer, answers faster than 1.2 s each), rate-limit saves (one per 20 s), cap rewards at 40 shifts a day, and recompute rank and rewards server-side.
- `feature_usage` now accepts `games`.
- Nothing existing was renamed or dropped. Game data is deliberately kept out of the public `profiles` table.

### Design
- Purple on black, flat colours, no gradients, in a `.arcade` theme in `globals.css`. Games get their own header, like Social. Reduced-motion mode switches off the animations, and feedback never relies on colour alone (✓/✕ icons and text).

### Tests
- `tests/game-core.test.mjs`: generator correctness over thousands of seeds, valid and repeatable 12-task decks for every company, scoring/strikes/power-ups, a check that ranks, levels and rewards match the SQL, and a check that the Locker catalogue matches the migration rows. `node --test tests/*.test.mjs`: 26 passing. `tsc`, `eslint` and `next build` are clean.

### What to test manually
1. Dashboard → the new black "Promotion Panic" banner → City map shows your subjects first.
2. Play a shift at Barklays: answer some right (watch the streak banner and promotion pop-up), get one wrong (the explanation shows), try each power-up once.
3. Results: XP/Clout saved and the header updates; the first shift of the day shows "Daily Grind ×2".
4. Locker: buy the Beanie (100 Clout), wear it, save, and check it shows in the header and on the city page.
5. "Challenge a friend" → open the link in a private window (works signed out) → sign in → same tasks → the win/lose banner shows.
6. Existing features still work: Social, onboarding, dashboard charts, countdown, grade calculator, tutoring.
