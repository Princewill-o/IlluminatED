# Performance changes — 18 October 2026

This change preserves the restored homepage UI and makes its wording explicit: subject revision, simulated career practice, teacher-set homework and saved progress.

## Removed work

- Limit expensive game simulation/render updates to 60 per second on high-refresh displays. Simulation uses elapsed time, so the cap does not change movement speed. Tests cover 30, 60, 75, 120, 144, 165 and 240Hz, plus return from a suspended tab.
- Default desktop rendering starts at 0.85 pixel ratio (72.25% of the previous pixel count at ratio 1). Low graphics starts at 0.65. Both adapt down to 0.5 after sustained slow frames. These are pixel-work reductions, not measured FPS gains.
- Disable multisample antialiasing; retain inexpensive contact shadows.
- Reduce decorative London residents from 24 to 12 on desktop and from 16 to 8 on mobile. Low mode uses six. Do not increase office populations beyond their previous limits. Real players and admission limits are unchanged.
- Halve the default ambient cyclist count and nearby point-light pool. Low graphics has no point lights.
- Load decorative residents sequentially with short yields. Player and multiplayer character loads retain priority. Skip animation-mixer updates for invisible or distant bodies.
- Clip outdoor drawing beyond the fully opaque fog, rather than drawing hidden blocks out to 200 units.
- Start independent world-entry queries together, including cars and the employer staff request, rather than waiting behind unrelated player data.
- Cache viewport dimensions through ResizeObserver; eliminate repeated layout-size reads between per-frame nameplate writes.
- Stop automatic link prefetch in shared navigation/footer/app tabs and homepage links. Requested pages still load on click; this trades speculative navigation preparation for lower initial work/bandwidth.
- Remove remote user verification from display-only sign-in controls. They use the cached session and auth-change listener; protected server pages/actions continue verifying identity.
- Remove the sticky navigation backdrop blur and defer the gameplay video's download until playback.
- Compress the five used local font files from 334,668 bytes to 130,528 bytes (61% smaller) using WOFF2. Keep the original font files and licence. The font metrics and character mappings remain the same.
- Cache public 3D models for one hour, with background revalidation. Do not cache protected HTML or private account data.

## Verification and limits

Frame-budget, movement/network, camera, resident-path and workplace tests cover timing and behaviour. Browser checks use the local offline city preview, not a two-account production session. Build/type/lint checks do not measure end-user GPU performance or internet speed.

No zero-lag promise is made. Measure cold loading, long tasks and sustained FPS on the target Windows device against the same scene and browser before expanding the public cohort. Use Low 3D or 2D if a device still struggles. Keep the existing capacity and server-admission tests as separate production release gates.
