# Live two-player verification

Tested on 19 October 2026 against the IlluminatED Supabase project using two distinct confirmed test users and independent authenticated clients.

## Failure and correction

The first run authenticated both users but room admission rejected a player with `service_busy`. The live `private.world_limits.event_budget` was 60. The configured estimate charges a two-person room 54 units and a three-person room 108, so another active player can prevent a two-player test. Updated the live budget from 60 to 180, retaining authentication, lease checks and the five-seat room limit. This is still a small shared project budget; it is not unlimited capacity or a load-test result.

## Retest results

- Both test accounts signed in independently.
- Both private city channels reported both players in presence.
- Movement broadcasts reached the other player in both directions.
- Noughts & Crosses: full five-move winning sequence synchronized.
- Connect Four: full seven-move winning sequence synchronized.
- Draughts: six alternating legal moves synchronized.
- Tycoon: initial board and a deterministic dice turn synchronized.
- Quiz Battle: eight question messages, eight cumulative score messages and the end message synchronized.
- The final test process exited successfully and released its own room leases/channels.

## Reproduce

Run `node scripts/test-live-multiplayer.mjs` with `CITY_TEST_PASSWORD_1` and `CITY_TEST_PASSWORD_2` set securely for the existing dedicated `illuminated.test1@example.com` and `illuminated.test2@example.com` accounts. Passwords are not stored in the script. The script uses the public publishable key, ordinary sign-in, production admission and private Realtime authorization. It creates temporary presence/game traffic and releases its leases on completion.

## Scope

This is a live transport integration test using the game rule functions and the application's channel/event conventions, not a browser UI test. Local browser control returned `Local browser use is disabled in Work settings`. Consequently rendered avatars, button workflows, animations, real-time quiz timing and a full Tycoon match have not been visually verified. No claim of complete end-to-end UI coverage is made.
