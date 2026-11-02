# Mobile life experience

Phone players entering `/games/world` automatically see a touch-first life dashboard. Desktop players keep the city view. Narrow windows and small touch tablets also use the dashboard; iPhone/Android phone identification keeps it active in landscape.

The phone arrangement uses a compact brand bar, pinned avatar/occupation and account balance, a scrollable life journal, and a fixed bottom learning action, six real needs meters and five category tabs. The blue/purple palette and existing educational content remain IlluminatED�s. Grouped iOS-style rows remain on Study, Work, Assets and More. See [the reference investigation](mobile-reference-analysis.md) for the supplied IPA evidence and its limits.

## Play flows

- **My life:** current avatar, actual job or unemployed/studying status, account Clout/XP, needs and a diary of completed actions.
- **Study:** the existing subject session and awards dialogs, plus assigned homework.
- **Work:** search workplaces, apply through the existing interview, or clock in to the current role. Uses the existing server-scored career sessions and refreshes the dashboard after closing.
- **Assets:** the existing house purchase confirmation, owned homes, dealership and wealth view. Purchases still use server-authoritative Clout and ownership checks.
- **More:** short self-care actions, arcade, friends, outfits, the existing What If life game and an explicit exit to the games menu.
- **Explore:** optional 3D city with touch joystick. My life returns to the dashboard; reopening Explore restores the last position. No automatic menu exit.

The dashboard does not mount WorldView/WebGL. Returning to it unmounts the city renderer and world connection. Dialogs reuse the same account systems as desktop. The existing server rewards and authoritative state are unchanged. The diary alone is local to this browser and account, bounded to 30 entries; it is not proof of XP, purchases or employment.

Phone layouts fill the dynamic viewport, respect safe-area insets, offer large tap targets, avoid input zoom and respect reduced motion. Background HUD controls are hidden and inert while the dashboard is open. A brief layout detection screen prevents starting the desktop renderer on phones before client detection completes.

## Verification

`node --test tests/mobile-life.test.mjs tests/home-purchases.test.mjs`

Also run TypeScript, scoped ESLint and the production build. Browser checks cover phone-sized tabs, job opening/closing, study opening/closing, housing affordability, local diary actions, narrow/landscape layouts, Explore return and desktop routing. Browser-sized tests do not substitute for physical iOS Safari/Android device testing.

Validated on 25 October 2026: 20 tests passed across mobile life, house purchases, home living and the existing life story suite; TypeScript and the production build passed. Scoped ESLint had no errors (two existing hook dependency warnings). Browser checks used 320×568, 390×844, 412×915, 667×375 and 1280×800 viewports. The dashboard had no horizontal page overflow; Explore mounted the Three.js scene and My life removed it. Desktop retained the scene. No browser console errors were recorded in that preview session. The offline preview exercised navigation and presentation, while purchases and career scoring continue to rely on the existing authenticated server actions.
