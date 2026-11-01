# Selected city and train update

The live local app is served from the yc-reviewer-login IlluminatED worktree. The Documents/IlluminatED folder currently contains output files; the worktree's original Git metadata is missing.

## Buildings and scenery

Ten individual buildings were extracted from the two supplied city scenes, rather than placing either entire city over the existing collision map. Live replacements include McDonald's, Nike's shop, Starbucks, Microsoft's office, the design studios, discovery labs and the wharf cafe. Existing businesses keep their portals. Models fit their reserved plots; named destinations reserve three rows of clear frontage before smaller houses and props are placed.

Foreground buildings fade to 16% opacity when they obstruct the player or nearby portal approaches. Material copies preserve the world curvature shader and restore when the sightline clears. Building meshes remain out of static instance batches so visibility remains independent for each building.

Highland cottages have 6×5 tile footprints, a minimum rendered height of six tiles, two rows of clear frontage and wider spacing. The cafe and lodge have larger plots and a seven-tile height. Four recoloured trees from the supplied Blender file are used among the Highland pines. Solid collision tiles and destination portals use the same expanded building dimensions.

City model sources and original CC BY notices are in public/world3d/selected-city. Public credits are displayed at /about#credits. Tree geometry comes from the user-supplied LowPolyTreePack.blend; only geometry and the local game palette were exported.

## Train

The journey runs for 15 seconds after loading, or after the rendering fallback is ready. WASD, arrow keys, touch buttons and the controller's left stick move the character in the aisle. Movement is bounded by the carriage ends, benches and poles. Key listeners use capture while the journey is mounted and are removed on exit. The camera follows inside the carriage. Skip remains available.

## Recordings

Five real instrumental audio files replace oscillator music in SceneMusic. They are hosted locally and are loaded after user activation. Existing mute, volume and page-visibility controls remain connected. Recordings repeat at their file boundaries; no claim is made that every composition is a sample-perfect seamless loop.

Source: https://github.com/jfpx/cc0-media-library, release music-v1. The downloaded files were verified against the release catalog's SHA-256 hashes. Per-track sources, author names and original licence notices are in public/audio/credits.json and public/audio/*.txt. No GitHub account fork was created because authenticated GitHub access is unavailable; only the selected released audio assets were vendored.

The supplied monsters .zip is a small JSON download descriptor. Its target archive was successfully retrieved to /tmp/illumed-monsters.zip. Creatures are not placed into learning scenes by this update.

## Validation

TypeScript and 21 targeted city layout, station, boarding, kit, visibility and recorded-audio lifecycle tests pass. Browser preview evidence is stored in output/asset-update when captured.
