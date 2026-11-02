# Living UK world — implementation and checks

Updated 2 November 2026. Branch: `codex/living-uk-world`.

## What changes in the game

- Motorway traffic travels substantially faster. Player cars use a higher motorway speed cap with swept footprint collision, damage, sparks and the existing wanted-star consequences. Speeds are game units, not mph.
- Each of the five regional destinations has a 720-tile driven corridor between the M25 and its city, route boards and a diverging city slip. The through carriageway continues. Returning drivers face the correct carriageway and keep bounded momentum between scenes.
- The city population budget rises from 14 to 64 ambient residents, plus eight cyclists. Residents walk, pause, use phones, read, stretch, dance and chat. Walking time pauses during activities; wall-clock schedules give late joiners the same baseline positions. Office chairs receive seated typing workers.
- Community socials have a dance floor, moving lights, residents, refreshments and a study challenge. Find the entrance through Socials on the phone or the city map.
- Talk to nearby ambient residents, calm a disagreement, argue or shove. Attacks record the first landed hit. Police can continue indoors, including homes; changing scenes restarts their route at an entrance. Prison scuffles can add time. Existing prisoner uniforms, guard patrols and escape routes remain in use, with more furnished communal areas.
- Low energy triggers the complete ambulance/loading/hospital sequence. A prisoner receiving treatment retains their sentence and returns to their cell on discharge.
- Hearings have five evidence/reading/numeracy rounds and up to seven additional review rounds after mistakes. Named fictional witness statements can conflict; cross-checking shows how each relates to the actual incident record. Learning answers do not rewrite the evidence or decide guilt.
- Nine university discovery lounges have entrances in their cities: UCL, Imperial, King's and LSE in London; Kent in Canterbury; NTU in Nottingham; Birmingham, Manchester and Edinburgh in their corresponding cities. The old University Quarter bookmark returns to London. Existing official-event retrieval now covers all nine sources and falls back to each organiser's calendar when no dated event metadata is available.
- Every selected train journey lasts two minutes after the carriage is ready. There are three connected carriages, 28 passengers, aisle movement using keyboard, touch or controller, optional Study & homework, and follow/first-person/wide cameras. Destination platforms receive a stopped train with open doors.
- Doors trigger on approach and use a captured-frame handover with an opening-door effect, rather than the old title wipe. City camera presets include follow, wide and overhead. Help is grouped by activity and controls can be collapsed.
- Creator studio is available through the in-game phone and mobile life screen. It offers three channel layouts, character animation timelines, an explicit front-camera option, and a city recorder that shrinks while the player moves. Clips are reviewed before posting, limited to 30 seconds / 30 MB and 12 saved clips per account, and can be liked, exported or deleted.

## Deliberate boundaries

These are compressed fictional game environments, not navigational maps or real campus interiors. Scenes remain separate Three.js instances: saved-frame handovers soften the change; this is not a single streamed world. The city recorder copies presented frames into a stable canvas so a doorway does not destroy its video stream.

Ambient traffic, encounters and resident interactions still run locally. Wall-clock schedules do not make them an authoritative multiplayer simulation. Connected players keep their existing networking.

Creator channels are private to the account on the current browser/device, using IndexedDB. They do not publish to real social networks or share clips with other players. Camera access is requested only after Enable camera; no microphone is requested. Closing, hiding or abandoning a camera request stops its tracks. The city recorder captures the game canvas, excluding HTML chat and menus. Native SwiftUI app screens are outside this web-world change.

TfL, National Rail, NHS, Metropolitan Police and government crest assets have provenance recorded in `public/brand-marks/SOURCES.json`. These protected marks identify fictional game locations; their presence does not imply endorsement. HMP Thames is fictional. Other UK forces do not yet have individual force badges.

## Research

Route labels follow the existing primary-source route catalogue and the [National Highways network map](https://prod-upgrade.nationalhighways.co.uk/media/qe1cjb2b/nh-srn-simplified-map-2023.pdf). The [National Rail map collection](https://www.nationalrail.co.uk/travel-information/maps-of-the-national-rail-network/) informs railway context; the two-minute duration is a game rule.

The added university calendars are [Kent](https://www.kent.ac.uk/courses/visit/open-days), [Nottingham Trent](https://www.ntu.ac.uk/study-and-courses/open-days/undergraduate-open-days), [Birmingham](https://www.birmingham.ac.uk/study/visit-us), [Manchester](https://www.manchester.ac.uk/study/undergraduate/open-days-visits/) and [Edinburgh](https://study.ed.ac.uk/undergraduate/open-days-events-visits). No open-day dates are invented or hardcoded.

## Verification

Run the new scenario checks:

```text
node --test tests/living-world.test.mjs tests/creator-studio.test.mjs tests/creator-store.test.mjs tests/scene-recording.test.mjs
```

The wider regression suite covers UK roads/navigation/scenery, train boarding, driving law, civilian incidents, custody, rescue, prison routing, city layout, workplaces, mobile UI and existing vehicle/character assets. The new tests include full car footprints along slip roads, all university and party entrances, indoor officer routes, consistent resident timing, the two-minute deadline, conflicting testimony, camera request cancellation, recording limits, account-separated clip storage and stream survival across scene changes.

Verification completed: 118 targeted tests pass; TypeScript passes; the production build passes; ESLint has zero errors and nine existing warnings. Credential scanning found zero private credentials. The local showcase and NHS/Met assets respond with HTTP 200.

The local preview runs at `http://localhost:3000/games/city-showcase?map=city&time=day&weather=clear&x=35&y=24&server=lse-1` with its development-only preview flag. It binds to the loopback interface.

 Camera and recording tests use controlled media/IndexedDB stand-ins; they do not establish codec support, frame rate or visual quality on real hardware. Local browser access was disabled in Work settings, so visual and real-device acceptance remains outstanding.

When browser access is available, check London and every regional route in both directions; enter and leave an office, university and party; start a train ride and study while walking through its three carriages; record a city walk through a doorway; record/deny a camera request; reload saved clips and switch accounts; test collisions, shoving, indoor pursuit, low-health rescue and prison discharge. Check narrow phone portrait/landscape layouts and reduced motion, plus camera codecs, memory and frame rate on iPhone Safari and Android Chrome.
