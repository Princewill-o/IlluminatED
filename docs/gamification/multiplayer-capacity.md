# Multiplayer capacity assessment

Tested locally on 18 October 2026 against application commit `9cf275b79fe28f82d65b069bbb07c995bf209d97`. This is an accelerated client-handler simulation and traffic model, **not a live 2,000-user service or browser/GPU test**. No cloud connections, accounts, purchases or production settings were created or changed.

## Recommendation

Use **10 players per map/room as an initial staging target**, conditional on at least a 2,500-event/second project allowance, reliable admission and the fixes below. With the default Pro allowance of 500 events/second, target **5 players in one active room**. On Free, even 5 fully moving players exceed the documented message allowance; the comparable conservative planning target is 2. These are planning recommendations, not certified safe capacities. The actual project's plan and custom limits were not inspected.

The current configured cap is 40. Do not advertise 40 or 2,000 per room as load-tested capacity. A room is a Supabase topic, not an isolated dedicated game server. All room traffic competes for project-wide limits. Two rooms of 10 use roughly twice the traffic of one room of 10. A school class can have more registered members than simultaneously moving world players; this report measures the latter.

No production cap was changed: a single hardcoded number cannot account for unknown project quotas, other active rooms, admission defects or unmeasured device performance.

## Reproduction and measurements

Run `node scripts/benchmark-world.mjs` (or `npm run test:world:load`). The complete latest measurements and environment are saved in `output/world-load-benchmark.json`. The script transpiles and executes the real `useWorld` hook, mocking React and Supabase transport. It exercises presence joins/leaves, production movement callbacks, JSON message decoding, movement throttling, idle clients, admission and asynchronous identity reconciliation. It does not replace the application with an unrelated HTTP benchmark.

Environment: Windows, Node v24.19.0, Ryzen 5 5600, 12 logical CPUs. Each steady scenario has 12 samples; p95 includes warm-up and scheduler/GC variation. The installed SDK's `presenceState()` returns its current state directly; the mock does the same. All fixtures are synthetic. Office channels deliberately bypass current admission to exercise handler behaviour beyond the configured cap.

At 60 simulated frames/second, the real outgoing callback sent 450 movement updates over 60 simulated seconds (7.5 Hz). A stationary client sent zero movement updates. The traffic model conservatively uses the code's 120 ms threshold ceiling (8.33 Hz), with everyone moving. Vehicle changes and stop events can add traffic. Changing frame cadence changes observed send frequency.

| Players in one room | Modelled movement events/second | Estimated incoming movement per client | Measured p95 CPU for nine movement ticks |
| ---: | ---: | ---: | ---: |
| 5 | 208 | 7.1 KB/s | 0.18 ms |
| 10 | 833 | 16.1 KB/s | 0.43 ms |
| 20 | 3,333 | 33.9 KB/s | 0.54 ms |
| 40 | 13,333 | 69.6 KB/s | 1.09 ms |
| 100 | 83,333 | 176.6 KB/s | 3.45 ms |
| 500 | 2,083,333 | 889.9 KB/s | 10.77 ms |
| 2,000 | 33,333,333 | 3,564.9 KB/s | 38.20 ms |

Nine ticks represent approximately one second of incoming movement processed in an accelerated batch. **These CPU measurements are neither frame times nor network latency nor FPS.** Bandwidth uses a representative 214-byte JSON envelope, not a production packet capture. It excludes acknowledgements, TLS/WebSocket headers, presence, global lobby, chat, reconnects and asset downloads. Real encoded payloads and quota accounting need service telemetry.

For N moving players at frequency f, movement sends = Nf; recipient deliveries = N(N−1)f; their combined event count = N²f. The movement estimate is consequently quadratic. Local handler speed does not remove a cloud message quota.

Async identity-resolution reconciliation took approximately 2.6 ms at 40 peers, 91 ms at 500 and 1,457 ms at 2,000. Each resolved identity currently invokes a full presence sync. This test stubs the signature result to isolate reconciliation; it is not an authenticated end-to-end join. A separate batch verified 2,000 real Ed25519 signatures in about 87 ms using Node WebCrypto. Those measurements cannot simply be added to predict browser join latency.

## Cloud limits and total population

Official references checked 18 October 2026: [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits) and [settings/event accounting](https://supabase.com/docs/guides/realtime/settings). The published message allowances are 100/s Free, 500/s Pro and 2,500/s Pro without spend cap/Team, subject to project configuration or agreed increases. Published connection ceilings differ too; a connection ceiling is not moving-player capacity. No paid settings were changed.

The recommendation reserves headroom rather than filling the documented event quota. The report includes a conservative single-room model including movement, existing ping broadcasts and periodic presence, with 60% of an event allowance allocated to that room. It yields 2/5/13 players for 100/500/2,500-event allowances; 10 is a more cautious staging target than 13 for the last case. Remaining headroom is shared with other application activity and can still be insufficient during bursts.

Even splitting 2,000 moving users into 200 rooms of 10 produces approximately **166,667 movement events/second project-wide**, before other traffic. Splitting into 50 rooms of 40 produces about 666,667/s. Smaller rooms alone cannot make 2,000 simultaneously moving users fit the default project allowance. The shared global lobby also distributes presence across the population.

## Confirmed findings requiring work before live capacity certification

1. **Presence refresh is too frequent.** Moving clients call `track` every 3 seconds: 10 steady updates per 30 seconds, before the initial join. The current documented per-client allowance is 5 per 30 seconds. Use a slower, jittered refresh, avoid position-only presence churn, and verify reconnect behaviour under the configured limits.
2. **Full clients keep their subscription.** In the actual hook test, the 2,000th-ranked city client received `full` and called `untrack`, but did not remove its channel and still sent movement. Untracking visibility is not admission enforcement.
3. **The cap is client-side and non-atomic.** It runs only while the local remote-player map is empty. An admitted city client can retain 1,999 remote peers in the synthetic overcapacity case. Enforce admission with authoritative leases/reservations and reject excess subscriptions; client UI checks alone cannot protect capacity.
4. **Offices bypass the cap and share one topic across regional server selections.** The office simulation accepted 1,999 remote peers. Office instancing requires appropriate access controls and product decisions about meeting colleagues across instances.
5. **Identity arrivals trigger repeated full scans.** Batch reconciliation once per scheduling turn/frame, while preserving signature validation and expiry handling.
6. **No network interest management.** Every player receives every other player's movement even when far apart. The 3D loop creates and updates remote character groups/nameplates for the whole roster. Hidden labels and renderer frustum culling do not eliminate network fanout, CPU animation, model allocation or DOM work. Nearby-player subscriptions, visibility budgets, lower-detail distant avatars and bounded model lifetimes need browser tests.

## Next validation gate

After those fixes, run an isolated staging service with production-equivalent RLS, real signed test identities and explicit message/connection budgets. Ramp through 5, 10, 20 and 40 clients per room, then test the intended total population across rooms. Include sustained motion, idle periods, cars, joins/leaves, reconnect bursts, multiple tabs, chat, study writes and token refresh. A dedicated authoritative game relay with spatial subscriptions/batched snapshots should be evaluated for a 2,000-user target.

Suggested acceptance criteria: p95 delivered movement age below 200 ms, p99 below 500 ms, no quota disconnects, under 1% unexpected loss, at least 30 FPS on the lowest supported phone and 60 FPS on the desktop target, stable memory over 30–60 minutes, and at least 30–40% sustained infrastructure headroom. These are proposed criteria, not observed results. Record cloud telemetry and real browser frame/memory measurements before raising any cap. Do not interpret this assessment as evidence that the database, study APIs or AI service support 2,000 concurrent users.

The benchmark's assertions and the three existing multiplayer regression tests passed. Production code was left unchanged for this testing request.
