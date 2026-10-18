# Multiplayer, map and coach fixes — 18 October 2026

## Result and deployment status

The load-test findings have code fixes and regression tests. The location map has been rebuilt, and the three requested airport coaches have been added to both road renderers.

**The database migration must be applied with the matching frontend deployment. It was tested in disposable PostgreSQL, but was not applied to the hosted project in this chat because a Supabase administration connection was unavailable.** The client fails closed when admission is unavailable; it does not silently reconnect through the old unrestricted channels. Existing old frontend clients use legacy channel names and need to reload after the migration/deployment. Plan a short multiplayer maintenance window.

No production plan, billing limit, credential, subscription or infrastructure setting was changed. Browser access was disabled in Work settings, so final browser/mobile visual verification remains outstanding. Local tests and the production build are separate evidence from a deployed multiplayer load test.

## Fixed behaviour

- The database serializes admission using a transaction advisory lock. Room occupancy and a shared project event budget are checked together. Browsers cannot supply their own capacity or counts.
- Full/busy clients do not subscribe. A defensive overflow check removes the entire channel, clears its roster and prevents further movement/chat. Offices obey the same limits and are instanced by the selected regional server.
- Leases expire after 90 seconds, renew before expiry, and are released during cleanup. Per-tab handoff tokens let map travel/reloads replace the previous lease atomically; late old-map cleanup cannot release the new lease. Claims in one browser are serialized. A different active browser session is refused unless it possesses the prior handoff token.
- Realtime RLS requires an active lease for the precise movement topic. Movement topics rotate at minute boundaries. Supabase caches channel authorization, so deleting a lease alone cannot immediately evict an already-open socket; rotation makes honest participants move to a new authorized topic, isolating stale sockets from the current room. This is not an instantaneous provider-side socket kill or an anti-abuse game relay. Reused/malicious credentials, duplicate sockets using a valid lease and message-level rate enforcement still need provider protections/an authoritative relay. Do not claim a hard provider connection cap from these leases.
- Moving presence refreshes use a 16-second minimum, including reconnect callbacks, rather than 3 seconds. Normal minute rotations remain below the documented five calls/30 seconds. Ping is estimated from the presence acknowledgement; extra broadcast pings have been removed.
- The global presence lobby has been removed. The server list polls aggregate lease counts every 15–18 seconds without exposing user identities. Counts are advisory; claims are authoritative.
- Identity results are coalesced into one queued reconciliation per batch. The roster and identity cache are bounded, departing/expired identities disappear, 3D models are limited to nearby players, and both renderers have an allocation ceiling. Room instancing bounds network fanout; it does not add spatial network subscriptions within a room.
- Departing/changing 3D characters dispose owned geometry, materials, canvas textures and animation mixers while keeping shared source assets. Late async loads are also disposed. Coach models and preview/train characters have matching cleanup paths.

## Conservative settings

`supabase/migrations/20261018120000_world_admission.sql` creates private settings with a **five-player room ceiling** and a **60-events/second allocation budget across all rooms**. The database reserves `9 × N × (N + 1)` events/second per room, accounting for movement send/recipient fanout plus an acknowledgement allowance. This is a conservative model, not measured cloud usage or a malicious-client rate limiter.

With the initial budget, two players can share one room (54 reserved events/s); a third there is refused. Three separate one-player rooms also reserve 54/s. The five-player ceiling is not a promise that five fit the default global budget.

After checking the actual project plan, message/connection settings and other application traffic, an operator may adjust the budget. For example, **only if a 500-events/second allowance is verified**, allocating 300/s leaves nominal headroom and allows one room of five (270/s reserved). It does not allow unlimited five-person rooms. The browser cannot change these private settings. No paid quota was increased here.

Example operator SQL after applying the migration and verifying the allowance:

```sql
-- Example only: do not run until the actual project quota is verified.
update private.world_limits set event_budget = 300 where singleton;
```

At 2,000 simultaneous moving users, a dedicated relay/spatial subscriptions/batched snapshots and a separately provisioned, load-tested budget remain necessary. This work does not certify 2,000 live users or automatic scaling. The previous capacity assessment is retained as a baseline; its former 40-player configuration and provisional 10-player staging suggestion have been superseded by the conservative limits above.

## Map and coaches

The full map has a search field, numbered destination pins matching a directory, category filters/legend, landmarks and named building destinations, a ten-tile grid, a north indicator, zoom controls and a live player/recentre marker. It is accessible from public interiors as well as the outdoor maps. It retains the search-area overlay.

Selecting a destination calculates a four-way walking route using the real collision grid, including bridges and entrances. Unreachable locations do not receive an invented route. Distances are approximate **game** metres, not real London journey distances or a live navigation service. The directory remains available on mobile, and map controls/pins support keyboard focus. Browser visual QA is still required.

The supplied reference informed three original procedural single-deck 3D coach models: blue/gold **the airline**, white **National Express**, and green **FlixBus**. Each has three axles/six wheels, mirrors, luggage details, panoramic windows and recreated wordmark/logo panels on both sides/front. These are code-built models, not extracted photographs or manufacturer CAD/GLB assets. Matching branded coach representations appear in the 2D fallback. They circulate on the existing London road loops using the same left-lane, traffic-light, crossing, spacing and reduced-motion logic as other vehicles. Full coach dimensions feed traffic/player collision footprints. They are ambient vehicles, not a new bookable airport-transfer service.

## Verification and credentials

- `node scripts/benchmark-world.mjs`: after-fix synthetic results in `output/world-load-after.json`; historical baseline in `output/world-load-benchmark.json`. Raw algorithm diagnostics deliberately override the client roster guard up to 2,000 to compare processing; separate guard checks use production limits. They do not override database admission in the live app.
- The 2,000-identity synthetic batch now uses two full scans and took about 6 ms of local processing, versus roughly 1,457 ms in the baseline. The controlled clock advances through the 16 ms reconciliation windows; that scheduling wait is excluded from the CPU measurement. Crypto is mocked in that comparison; GPU, mobile FPS, network latency and cloud throughput are not measured.
- `tests/world-capacity.test.mjs` and `tests/world-admission-client.test.mjs`: refused joins, overflow, batching, departure/expiry, presence frequency, topic rotation, cleanup, late replies and overlapping claims.
- `PGLITE_MODULE=<absolute module path> node tests/world-admission-database.mjs`: 46 checks for authentication/grants/RLS, room/project budgets, office instancing, lease expiry/release and map handoffs. PGlite serializes queries; this is not an independent-connection concurrency benchmark.
- `tests/map-guide.test.mjs`: locations and collision-free connected routes/unreachable cases. `tests/coaches.test.mjs`: three real Three.js model trees, wheel/logo coverage, dimensions, red-light and spacing behaviour.
- `node scripts/check-secrets.mjs --history`: current tracked/unignored text files and Git history checked for known private credential formats and privileged Supabase JWTs. No matches were detected. The guard prints rule names/paths, never matching secret values. A read-only GitHub workflow runs the current-file check on pushes/PRs. This is pattern-based detection, not a guarantee against every possible credential format.
- `.env` files and private-key containers remain ignored. Public Supabase/Stripe publishable identifiers and world-pass verification keys are intentionally browser-visible; privileged service keys, provider API keys, signing secrets and private keys are not.

Final validation: **152 Node tests, 46 admission database checks and 31 existing city database checks passed**. Full-source ESLint and the production Next.js build passed. All 108 original study seed questions match. The current-file and Git-history credential scans reported zero findings. The map reachability test now uses one complete flood-fill per map, preserving every door assertion while avoiding repeated searches per destination.
