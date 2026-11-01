# KayKit character and world art

The local game uses the user-supplied KayKit Adventurers 2.0 FREE character models and their Rig_Medium animations. Six free base characters are available in the Locker: Ranger, Knight, Mage, Rogue, Hooded Rogue and Barbarian. The existing avatar `head` slot stores the model choice; legacy head values render Ranger until the player selects another base. Existing cosmetic ownership and saved fields remain compatible.

Supported controls are base character, skin, hair colour, outfit dye, legwear dye, boots, original/custom headwear, eyewear, held items, badges and companions. The imported models retain their own faces. The Clothes tab now offers Blender-authored T-shirt, hoodie, polo and blazer shapes, plus jeans/tailored trousers and trainers/smart shoes. Original kit clothing remains available. The Locker hides old mesh-specific hair/face controls and unsupported garment options. Avatar icons are rendered from the same models through one shared offscreen WebGL context, with a bounded snapshot cache.

SkeletonUtils creates independent skeletons; shared source geometry/textures are cached. Standard Rig_Medium clips are retargeted to gameplay bone aliases. Wave, seated and cycling poses adapt those clips to existing interactions. Materials preserve source texture shading, and colour uniforms compose with the world's curvature shader. Per-character materials, generated badges and skeleton resources are disposed without deleting shared source assets.

The five additional supplied FREE packs are under `public/world3d/kaykit`, with their licenses and a manifest. City Builder buildings replace generic London terraces and company exteriors; existing signs, landmarks, plots and workplace entrances are retained. Medieval buildings appear in Highlands village plots. Restaurant furniture replaces applicable hospitality/Venture Yard fixtures. Resource props furnish Venture Yard storage and logistics offices. Platformer blocks provide flush walkable floor platforms in the Study Quarter and Venture Yard. Collision grids, portals and gameplay are unchanged; these are art replacements, not a new vertical platforming physics system.

All six archives contain CC0 licenses; the originals are retained next to the imported assets. Credit: Kay Lousberg, www.kaylousberg.com.

Apply the generated `kaykit_adventurer_characters` migration before deploying the new model picker so the existing avatar-save RPC recognises the six free cosmetic IDs. No existing avatar rows, paid-item ownership, RPC permissions or RLS policies are changed by the migration. The database test uses disposable PostgreSQL and does not connect to production.

Design refinement: imported fixtures use explicit game-scale heights instead of shrinking vertically with a one-tile footprint. Dining runs form one table, chairs face nearby tables, ovens have extractor hoods, and kitchen/dining/reception floor zones have distinct colours. Wall joinery and warm interior lighting improve contrast. Venture Yard has café counters, separate repair benches with KayKit parts, studio bookcases and green platform flooring. The second uploaded Restaurant Bits archive has the same SHA-256 as the first. No extra duplicate assets were imported.

## Additional uploaded packs

`public/world3d/ar-hospital` contains the supplied Atomic Realm GLBs and original licence/readme. The hospital uses four bed bays, alternating bed models, bedside monitors and trolleys, wall storage, overhead fixtures and a teal ward/reception palette. Each two-row bed block renders once. Equipment stays inside the original solid bay footprints; doctor and exit portals remain accessible. The included licence permits commercial/non-commercial project use and editing, and prohibits repackaging/reselling/redistributing the assets themselves. Keep the original licence with this integration; do not distribute these files as a standalone asset pack.

`public/world3d/free-city` contains the supplied city GLBs. Selected generic office plots use its building, while reserved street-furniture tiles use benches, bins, hydrants and some modern lights. Existing traffic-control signals and roads retain their gameplay logic. The uploaded archive has no licence or author information; no CC0 or other licence is assumed. Its provenance is recorded in `public/world3d/additional-packs.json`.

These are local source changes. The primary Documents folder currently contains output artifacts; the editable source is the existing `yc-reviewer-login/IlluminatED` worktree. Its Git metadata points to a missing primary repository, so these changes have not been committed, pushed or deployed. Browser scene checks use the actual world renderer and maps in an isolated local capture harness. Locker tests stub only the server action boundary; the catalogue migration is checked separately against disposable PostgreSQL. A full application typecheck/build remains limited by missing Supabase dependencies in this checkout.

Accessory close-up correction: attachments now fit the animated idle pose and preserve their world orientation when attached to the head/hand bones. Headphones use an upper headband across the crown rather than a ring through the face. The dedicated accessory geometry regression test checks the face clearance.

## Kit expansion: workplace identity and Highlands scenery

`kit-dressing.ts` builds deterministic, bounded dressing plans for seven office themes. Prototype labs show mechanical parts, finance desks have bullion display props, creative studios have production/material samples, dispatch offices have packaging and retail rooms have textiles. Science counters use clean cabinet modules and the supplied clinical instruments. Restaurant counters alternate prep units, sinks and hobs, with cutting boards, sliced ingredients and table settings. Existing desks, storage and collision maps are retained. All small details must stand over existing solid furniture and avoid portals; each room has at most 48 dressing props. Every real workplace map is covered by the placement tests. Workplace signs and wall joinery use the existing sector palette.

Selected London rooftops gain a small water tower or planted bush. The eight Highlands mountain plots now use the Medieval Hexagon pack's mountain/forest models, with the original geometry retained as a load-failure fallback. Their footprints fit inside the existing blocked ellipses. Roads, hiking routes, ground levels, business actions and multiplayer state are unchanged.

Verification: `node --test tests/kit-expansion.test.mjs tests/kaykit-world-assets.test.mjs` plus browser renders of London, Highlands, all seven office themes, Pizzazz and Venture Yard. The expansion uses only already supplied assets and adds no new external services or database migration.

## Learning hub and landscape pass

Highlands pines and rocks use the Medieval pack's single-tree and single-rock models with deterministic variants and game-scale heights. These stay within existing solid scenery tiles; any scenery cleared for an interaction is omitted. Village benches use City Builder seating and Glen Lorne station uses the blue Medieval tavern model fitted to its existing plot, with the original station name and train interaction.

Study Quarter has kit benches, planted corners, a shared maker worktable with mechanical parts and separate computer desks for study and careers. Its floor zones and wall signs distinguish the areas without changing any learning flows. `kit-learning-landscape.ts` verifies all new details against solid tiles and portal rectangles. Scene previews use the actual local renderer.

## Blender modern wardrobe

Rebuild with `blender --background --python scripts/characters/build_modern_clothes.py`. Editable scenes are `blender/modern-clothes/{tee,hoodie,polo,blazer}.blend`. Exports and a build manifest live in `public/world3d/modern-clothes`. Each of the four outfits is fitted to all six original KayKit head/rig variants (24 GLBs). The generator replaces fantasy bodies, capes, quivers, gloves and boots with authored torso/sleeve meshes, skin hands/forearms, two trouser silhouettes and two footwear styles. It retains each original face/headwear and the Rig_Medium skeleton. Garments are grouped by material and visibility group to bound draw calls (nine visible groups on the checked Ranger hoodie).

Skin weights follow hips/chest, upper/lower arms, hands, upper/lower legs and feet. Existing supplied movement clips drive the new garments. Seated arms aim forward using the actual idle bone axes, preserving each skeleton's wrist twist. Fabric, skin, shirt inserts and soles have separate materials; dyes apply to the intended pieces. Modern clothing does not recolour the original helmet/hat.

The existing `top-tee`, `top-hoodie`, `top-polo`, `top-suit`, `bottom-jeans`, `bottom-smart`, `shoes-trainers` and `shoes-smart` IDs are reused. Prices, unlocks, ownership and server save contracts are unchanged. No additional database migration is required for clothing. `top-stripes` selects the original kit outfit in the Locker; its built-in trouser and shoe shapes remain part of that outfit. Old saved/earned top IDs without a modern model continue to render the original kit body.

Verification: `tests/modern-clothes.test.mjs` checks all 24 skinned exports, existing ownership rules and exclusive leg/shoe selection. Browser checks render all 24 combinations in idle, walk and seated poses, verify independent skeleton clones and forward seated hands, exercise Locker save payloads with only the server boundary stubbed, and check modern garments in London, Microsoft and Study Quarter through the real renderer. Full application build remains unverified because the checkout has missing Supabase dependencies; no deployment or Git push was performed.

## Crayon city and pixel vegetation

`public/world3d/crayon-city` contains the supplied Crayon City Architecture v1.1.1 textured and flat GLBs, manifest, collision notes and original licence. Existing London venue roles select among all ten architectural models: cottage and apartment homes, offices, school, cafe, market, hospital, fire station, garage and tower. The existing map plots, signs, front doors, roads and collision tiles remain the game’s source of truth. Crayon collider helper nodes are removed from each visual clone; the game does not use embedded collider metadata for movement.

`assets/pixel-vegetation-source` retains the supplied Godot vegetation tutorial source, textures and MIT licence. `scripts/world/prepare_pixel_vegetation.py` converts its tree, rock, flower and grass GLBs in Blender into self-contained files at `public/world3d/pixel-vegetation`. The export keeps baked textures and masked leaf/grass cutouts; Godot shaders and postprocessing are not runtime dependencies. Selected existing London tree tiles and bounded Highlands scenery use these models. Trees stay within original solid tiles, away from portals; no routes or gameplay collisions are altered.

The Crayon licence permits inclusion in commercial projects, editing and redistribution when the assets remain free of charge; it prohibits selling the assets standalone or as a competing library. The vegetation pack is MIT-licensed; the original notices are kept with the source and exports.

Verification: `tests/crayon-vegetation.test.mjs`, `tests/imported-pack-helpers.test.mjs`, and the existing landscape and asset tests; actual-renderer captures cover London streets, the park, district plots and Highlands. The local browser check reports all ten Crayon variants loaded, 53 pixel vegetation instances in London, 36 in Highlands, no leftover collider helpers, and no page or WebGL errors.

## Voxel office props and controller prompts

The supplied 3D Voxel Office Pack OBJ set is converted to seven textured GLBs by `scripts/world/convert_voxel_office.py`. The runtime uses both voxel computer models and colour variants of the chairs on existing office desk/chair tiles, coffee machines on existing kitchenette counters, and plants on selected desktop spots. The original grid continues to control movement and collision. Credit and the CC BY 4.0 attribution notice are retained at `public/world3d/voxel-office/ATTRIBUTION.txt`.

The gameplay HUD and first-visit guide show WASD and arrow-key movement, E/Enter to interact, and Space to jump. Browser Gamepad API input is also supported: left stick or D-pad moves, Cross interacts, Square jumps, and Circle brakes while driving. Controller face-button artwork is from Arks' PS4 Buttons UI Elements pack, with its README and credit notice kept in `public/game-controls/ps4`. PlayStation marks are owned by Sony; IlluminatED is not affiliated with Sony.
