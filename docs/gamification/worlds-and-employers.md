# Worlds, employers and messaging

## Worlds
- Maps are tile grids (32 px tiles) built in `src/game/core/world.ts`: `CITY`, `campusMap(orgs)` and `officeMap(org)`. They are pure, deterministic and covered by tests.
- Rendering: the static scenery is painted once to a canvas (`tiles.ts`). A second canvas draws the live effects every frame (`fx.ts`: clouds, leaves, sparkle, dust, and UK-time lighting). Players are SVG sprites on top.
- Networking (`use-world.ts`): one private Supabase Realtime channel per map and server (`world:<map>:<server>`; offices use `world:office-<slug>`). Presence (keyed by user id) holds who is here. Broadcast `m` carries movement (throttled to 120 ms) and `c` carries emotes/phrases. A heartbeat runs every 3 s and the client reconnects when the browser comes back online.
- Servers: regions with up to 40 players per server. `pickServer` fills the busiest server that has room and otherwise falls back to a nearby region.

## Safety model
- Only signed-in, non-banned members can join world channels (RLS on `realtime.messages`).
- There is no free-text chat in worlds, only preset phrases and emotes. Players can hide or report anyone.
- Learners can only message verified employer staff, never other learners.
  - 18+: end-to-end encrypted. The server stores ciphertext only. A report sends just the one decrypted message, which the reporter chooses to share.
  - Under 18: a moderated plain-text thread, blocked until a parent/carer approves through an emailed link (valid for 7 days). Emails, phone numbers, social handles and blocked terms are refused. Moderators can read these threads.
- Employer verification is a 6-digit code to a work email. Only its hash is stored, it expires after 15 minutes, allows 5 attempts and up to 5 sends an hour. Free-mail domains are refused.

## Not built yet
- A moderator queue for message reports (the data and policies exist).
- Employer-uploaded logos.
- Video meetings (meetings currently happen in the office meeting rooms).
