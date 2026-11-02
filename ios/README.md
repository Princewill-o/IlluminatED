# IlluminatED for iPhone

A SwiftUI iPhone app for iOS 17 and later. Open `IlluminatED.xcodeproj` in Xcode. No CocoaPods, Capacitor, npm modules or third-party Swift packages are needed to build the app.

The app has native Today, Revise, Focus and Settings screens. The account platform runs in a persistent WKWebView at `https://www.illumed.co.uk`, including mobile My life, study quests, careers, houses and the optional Three.js city. The existing Next.js server remains online; it is not embedded inside the app.

Today uses a compact branded header, device-practice identity and latest result, a scrollable learning journal, and fixed Continue learning controls above the native tab bar. Entries come from actual local revision results and focus totals. The online My life screen uses the same broad arrangement with account character, Clout and needs. The [reference investigation](../docs/mobile-reference-analysis.md) documents the supplied IPA analysis and its static-only limits.

## Included

- Native onboarding, launch screen, app icon, light/dark appearance and system navigation.
- 108 original offline revision questions across 31 subjects; five-question sessions, answer explanations, saved flashcards and device-local history.
- A native focus timer based on absolute end time, with restart recovery, background completion alerts when notification permission is available, and duplicate receipt prevention.
- Optional daily study reminders. Permissions are requested only after enabling the reminder.
- Persistent account cookies, password login, email-link paste support, browser back gestures, connection errors/retry, memory-recovery screen, external links in Safari View Controller, native file-export sharing and camera/microphone prompts for the trusted platform only.
- Explicit return from the platform to native screens. Leaving or backgrounding the app stops camera/microphone capture and pauses media.
- Native account settings, privacy and account-deletion entry points.
- Restricted internal host navigation, HTTPS, known-screen deep links, no privileged JavaScript bridge, and no credentials packaged into the app.

Offline revision does **not** award online XP, Clout, qualifications or simulated employment experience. Local practice is separate from the signed-in account. No push-notification service, social OAuth provider, StoreKit subscription flow or production universal-link association is configured in this version. Daily reminders are local notifications, not server pushes.

## Build on a Mac

1. Install Xcode with an iOS 17+ simulator runtime. Prefer the current Xcode release for submission.
2. Open `ios/IlluminatED.xcodeproj` (or `IlluminatED.xcodeproj` if this folder was downloaded separately).
3. Select the **IlluminatED** scheme and an iPhone simulator; press Run.
4. For a physical iPhone, choose your Apple development team under **Signing & Capabilities** and confirm the bundle identifier `uk.co.illumed.app` is available for your team. All three targets must have a valid team for signed tests.
5. Run Product → Test. `bash ios/scripts/test-simulator.sh` from the repository also runs portable core tests and simulator tests.
6. To create a signed archive, select **Any iOS Device** and Product → Archive, or set `APPLE_DEVELOPMENT_TEAM` locally and run `bash ios/scripts/archive.sh`.
7. Use Organizer → Distribute App → App Store Connect → TestFlight after completing App Store Connect metadata, privacy disclosures, age rating and reviewer access.

Signing credentials, team membership and App Store Connect access remain with the owner. This project has no signing keys. The Windows environment used to author it cannot run Xcode, the iOS Simulator, device signing or TestFlight uploads. A compiled `.ipa` has **not** been produced here.

## Deploy the matching web changes first

Deploy the web source changes in the same repository before testing the native app against production. They add native user-agent detection, force the phone experience inside the iOS container, and restrict digital subscription checkout in middleware **and** checkout actions. The native shell independently blocks checkout navigation, but Next.js client navigation requires the server changes too.

The user-agent marker is `IlluminatED-iOS/1`. It is a presentation hint, never an authentication or entitlement check. Existing server authorization and membership checks remain authoritative.

This first iOS build consumes existing account/school access and offers free functions. It does not sell subscriptions or open Stripe digital checkout. It has not been approved by Apple. Verify the current rules for multiplatform subscriptions and games with App Review before submission; add StoreKit if the chosen product distribution requires it. Website billing cancellation/support must remain available to existing subscribers outside this build; the in-app membership support link is accessible.

## Accounts and links

Use the account's existing email/password inside the app. WKWebView retains its own persistent session; it does not import Safari's cookies. If an email login link opens in Safari, the in-app Platform options → Sign-in help → Paste flow accepts only the trusted site's `/auth/callback` or `/account/password` URL. Request the email from this app so the PKCE verifier remains in the right browser storage. Never share or log a sign-in link.

Custom links select screens only, for example `illuminated://open?screen=study`. Accepted screens: `life`, `study`, `homework`, `account`. These links do not accept tokens, arbitrary destinations, or perform sign-in. No Apple team ID has been invented for Associated Domains; production email universal links require an owner-approved association deployment if wanted later.

## Tests and generated content

From the repository root:

```sh
node scripts/build-ios-content.mjs --check
node scripts/generate-ios-project.mjs --check
node --test tests/native-ios.test.mjs tests/mobile-life.test.mjs tests/home-purchases.test.mjs
```

On macOS (portable policy, revision and focus tests):

```sh
cd ios
swift test
```

When questions change, run `node scripts/build-ios-content.mjs`. When Swift files are added, run `node scripts/generate-ios-project.mjs`. Both generated artifacts are committed source and can be checked without Xcode. `Configuration/App.xcconfig` holds version, bundle ID and deployment target. Swift source, resource and test memberships are generated deterministically without an external project generator.

The `iOS app` GitHub Actions workflow runs Swift core tests and Xcode simulator tests on a Mac runner after the changes are pushed. It does not sign, upload, publish or spend on a build service. The workflow has been authored but has not been run from this Windows session.

## Privacy and release checks

`Resources/PrivacyInfo.xcprivacy` declares app-local UserDefaults use (`CA92.1`) and the existing platform's account, study/gameplay, support and interaction data. Review it against the deployed platform and the App Store privacy questionnaire before submission. The native app adds no analytics SDK, tracking permission, location collection or native collection of camera/voice recordings. Friends' calls use the existing platform and require on-device verification, including denial and interruption paths.

Before release, test on physical iPhones: existing/new accounts, reset/email links, account deletion, state after termination, offline launch, notification denial/revocation, Dynamic Type/VoiceOver, landscape safe areas, downloads, voice/video denial, and city performance on the oldest supported device. Complete the checklist in `docs/ios-release.md` in the full repository. A syntactic source check is not an Xcode compile or an on-device test.
