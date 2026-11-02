# Mobile arrangement reference · 27 October 2026

The user supplied BitLife 3.24.1 for arrangement analysis with [REA](https://github.com/morluto/rea). IlluminatED implements its own interface using the existing blue/purple identity, questions and account systems. No BitLife binaries, sprites, icons, question text or decompiled code are included in the application.

## Evidence and scope

- IPA SHA-256: `2dd2e9ccaca59d801238e0089d06362142c3233c8b7873bbdf76173a3856cc68`.
- REA inventoried 403 occurrences (archive root plus 402 entries), with no integrity contradictions. Full inspection: `ev_eba827168f07fbb7379f0b1e4298824698ac22b15b95fadbc3f555e7ee9de8ba`; inventory: `ev_5e0991daa598067adf27c1e34f0c43f37b44ce6707d63fa743fef11eb5dc381e`.
- REA extracted the regular files to a containment-verified temporary folder. Extraction: `ev_2fb1b21ec5f2f6b68a29b2212f323c08fb03631641afda52c9b75c47c2b70f46`.
- REA's plist operation needs macOS utilities on this provider and was unavailable on Windows. Supplemental Python `plistlib` parsed version `3.24.1`, build `3.24.1.60`, bundle `com.wtfapps.apollo16` from the extracted Info.plist.
- The package contains Unity assets and IL2CPP metadata. Supplemental **UnityPy 1.25.4**, operating on REA-extracted `Data/data.unity3d`, decoded serialized objects without executing the target. This is supplemental static evidence, not a REA layout decoder or runtime capture.
- [Selected decoded hierarchy records](mobile-reference-layout.json) preserve source digest, object IDs, parents, anchors, offsets and sizes. The full REA evidence bundle was exported locally to `C:/Users/johnd/AppData/Local/Temp/illuminated-rea-python/ipa-evidence.json` and the active REA target was closed.

## Observed structure and original adaptation

| Static observation in `level0` | IlluminatED implementation |
| --- | --- |
| `NavBar` and `HeroBar` are siblings; HeroBar contains an avatar, occupation text and name/balance group; balance is right anchored | Compact brand bar and persistent avatar, actual employment status and account Clout header |
| `LifeLog` contains `CandyScroller` with a stretching `Viewport` | Main area is an independently scrollable journal of real completed actions |
| Bottom-anchored `Toolbar-Stats` contains `Toolbar` and `Stats`; a nested `AgeUp` graphic has a 352×352 size | Fixed Continue learning action, compact needs meters and category tabs; study opens the existing educational flow |
| Reusable list/scroller and entry objects exist | Existing grouped workplace, study and assets rows remain functional |

The broad arrangement is supported by the hierarchy. Exact final pixel positions, runtime resizing, button behavior and every screen are **not** proven by these serialized records. The IPA was not installed or run on iOS in this Windows session. This was a targeted arrangement investigation, not a full behavioral decompilation.

Native SwiftUI Today uses the same hierarchy with actual device-local revision records, latest score, focus total and safe-area controls. Its account character and currency remain inside the signed-in online My life screen. Existing offline questions, explanations, scoring, tabs and onboarding remain intact.

## Validation

Web validation includes TypeScript, scoped ESLint, existing mobile/native/housing tests and responsive browser checks. Native source validation includes the Swift syntax parser and generated project/content consistency checks. These do not substitute for compilation, simulator or physical iOS/Android testing.

Validation on 27 October 2026: the arrangement changes passed TypeScript, scoped ESLint and all 13 existing mobile/native/housing tests. All 18 Swift files parsed without syntax errors; project and 108-question content checks passed. The browser displayed the new arrangement at 390×844 and opened Work. The Continue learning handler was invoked, but the loaded study dialog was not verified before local browser use became disabled in Work settings. Remaining narrow/landscape interaction checks and physical-device testing are pending. Native compilation and simulator tests require macOS/Xcode.

The production Next.js build completed successfully (exit 0, 169 static pages). Existing unrelated lint warnings and nonfatal Undici network assertions were logged during static generation; see `output/graphics/mobile-arrangement-build.log`. The final narrow-screen CSS rule hides the City text below 361px while retaining its labelled 44px icon button. Browser coverage for that final rule remains pending.
