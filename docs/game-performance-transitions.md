# Rendering and scene handovers

Verified 3 November 2026, against the living UK world update (`063bbf1b`).

## Changes

- Bound resolution, shadow maps, ambient occlusion and antialiasing costs. Sustained slow frames lower resolution gradually; sustained headroom restores it. Background suspension is excluded from these decisions. Environment lighting, bloom, shadows and the illustrated materials remain enabled.
- Batch repeated static architecture inside its owning building, retaining independent cutaways. Conservatively cull static scenery using bounds that account for the curved-world shader. Player-following grass, leaves and light pools remain outside this static culling system.
- Hide distant resident models and remove their expensive sun shadow passes while retaining blob shadows and route/activity simulation.
- Capture one downscaled copy of the next presented canvas frame for handovers. Navigation no longer forces another full render and synchronous JPEG encoding.
- Lock overlapping navigation until the new renderer has presented a usable scene, then fade the saved frame. Reject stale renderer readiness and repeated interaction keys. Failed and stalled handovers have bounded cleanup.
- Preserve car momentum and hold player/autopilot movement while the next scene loads. Loading now reports its destination instead of relying on an arbitrary 180 ms timer.

Separate scene instances remain in use; these handovers are not continuous world streaming.

## Verification

- 156 targeted tests pass, including real Three.js bounds/geometry checks, resolution adaptation, duplicate navigation, same-map renderer changes, stale readiness, snapshot cancellation, driving, UK routes, boarding and existing gameplay regressions.
- Production build exits 0 and generates all 169 static pages. TypeScript passes as part of the build. Full source lint has 0 errors and 9 pre-existing warnings. The final build has no runtime assertions.
- Credential scan: 0 findings. Git whitespace check passes.
- Browser checks: London renders; entering home and walking back through the doorway completes without a menu redirect; London-to-M25 and M25-to-London handovers finish; car movement works after arrival; the final preview reports no console errors.
- An observed home handover retained the old frame until approximately 1.73 seconds, then completed its fade by 1.98 seconds. It did not reveal the first incomplete frame.

At a 1280×720 desktop preview, the initial London five-second sample was 14.7 FPS and 6,934 draw calls. A corresponding implementation sample was 35.6 FPS and 2,153 calls, with adaptive resolution active. The final London centre check reported 34.2 FPS / 2,084 calls, and the M25 check reported 60 FPS / 160 calls. These are local preview observations, not device-independent guarantees or production benchmarks. Later one-second browser compositor throttling in the earlier session was excluded from the comparison. Real iPhone/Android performance and the deployed Vercel version remain unverified.
