# iOS implementation and release handoff

The source app is at `ios/IlluminatED.xcodeproj`. It is a SwiftUI application, with native offline study and focus features plus a WKWebView for the existing account platform. It is not a full rewrite of the live Next.js/Three.js platform into Swift, and it still needs the hosted platform for accounts and online play.

## Current evidence

Authored on Windows on 26 October 2026. Thirteen Node tests passed for native routing/checkout protections, the bundled content/icon, the mobile dashboard and housing actions. Scoped ESLint and TypeScript passed. The Next.js production build passed; its static generation emitted an Undici network assertion before continuing and finishing successfully, and existing lint warnings remain. A separate check parsed all 18 Swift files (including package/tests) without syntax errors and parsed the Xcode object graph with three targets. Plist/storyboard/scheme XML passed parsing. These checks do not compile Swift against the iOS SDK.

Xcode compilation, Swift XCTest execution, simulator UI tests, physical-device tests and code signing are **pending on macOS**. No installable binary, TestFlight upload or App Store approval is claimed.

## Release checklist

- Deploy the matching web changes: native user-agent detection, mobile layout, membership page, middleware restriction and server-action checkout guards.
- Open the Xcode project on macOS. Resolve any compiler/SDK diagnostics, run unit and UI tests, and inspect the native screens on iPhone simulators in portrait/landscape and light/dark appearance.
- Choose the owner's Apple team and confirm or change `uk.co.illumed.app`. Configure App Store Connect and product age rating. The platform account flow requires age 13+; confirm the app's metadata and privacy disclosures accordingly.
- Test complete password, new-account, password-reset, email-link and deletion flows in the same app container. No dummy account credentials are included in source or review notes.
- Test free learning, existing paid/school entitlement access, digital checkout blocking after client-side navigation, and membership support/cancellation entry points. This build has no StoreKit implementation; determine the appropriate distribution/purchase configuration under the current App Review guidelines before submission.
- Confirm the deployed privacy policy and manifest match all actual server-side collection and friends' call behavior. No tracking/recording claims should be assumed from the wrapper alone.
- Verify no permission prompt on first launch. Enable and disable reminders; deny/revoke notification permissions. Start a focus timer, terminate/reopen the app, confirm its receipt is added once, and ensure canceled sessions do not notify.
- Test saved cards/results without connectivity, a failed/recovered platform request, memory termination, and export/download sharing. Confirm settings/history clearing and online account deletion are distinct.
- Test VoiceOver, large Dynamic Type, Reduce Motion, keyboards, phone safe areas, interruption handling and city frame rate/memory on an older physical device. The 3D world is optional and has not been ported to a native rendering engine.
- Provide App Review with owner-managed reviewer access and specific notes covering native offline practice, focus/reminders, the live platform, membership access and account deletion. Complete screenshots from the actual iOS build.
- Archive and validate with current Xcode, then distribute through TestFlight before any App Store release.

## Sources used

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — app completeness, minimum functionality, purchases and review access.
- [Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- [Privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files).
- [WKDownload](https://developer.apple.com/documentation/webkit/wkdownload).
- [Calendar notification triggers](https://developer.apple.com/documentation/usernotifications/uncalendarnotificationtrigger).

The checked-in CI workflow can perform the Mac build after the source is pushed; its result is not yet evidence of a successful build.
