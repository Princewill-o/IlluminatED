# Bruno Simon reference: REA findings and adaptations

## What was inspected

The live site's **Behind the scene → Source code** link points to
[brunosimon/folio-2025](https://github.com/brunosimon/folio-2025). This analysis pins
revision `41046b57eeed8d156d9c3fd7fa259900baef7816` rather than assuming the repository
exactly matches a deployed bundle. Its `license.md` grants MIT reuse; the original
notice is preserved with all copied assets at
`public/world3d/folio-reference/LICENSE.txt`.

REA (`rea-agents@6.7.0`) was installed in an isolated temporary research folder,
outside IlluminatED's dependencies. Its `analyze-javascript-application` command
parsed ten selected rendering files, followed by `inspect-analysis-view` to save
the evidence summary. It reported ten parsed JavaScript files and no parse
failures. `rea-provenance.json` records the exact evidence ID, revision, selection,
and limitations; `rea-summary.json` is REA's summary response.

**This was static analysis of the site's published source, not a live REA browser
capture.** Browser tools reported that local browser use was disabled in Work
settings. The selected analysis leaves 120 inventoried files outside scope;
imports, dynamic behaviour, and the deployed build's identity are not proven.
The complete 10 MB evidence remains in the temporary research folder and is not
bundled with the application.

## Why the reference looks different

These conclusions come from reading the selected source alongside REA's static
evidence. They are implementation observations, not a measurement of visual
quality or performance:

| Source at the pinned revision | Observed design |
| --- | --- |
| `sources/Game/Materials/MeshDefaultMaterial.js` | Lambert-based custom output, a directional normal gradient, coloured cast shadows, and height/direction-dependent terrain bounce; this is deliberately art-directed rather than stock PBR |
| `sources/Game/Cycles/DayCycles.js` | Daylight uses `#ffd2c2`, with saturated `#6d3fff` shadows; dusk and night have separate light, fog and shadow palettes |
| `sources/Game/World/Foliage.js` | Approximately 80 leaf cards per cluster, outward canopy normals, an RGB signed-distance mask, camera-oriented instances, sun-dependent colour mixing, and a see-through opening near the vehicle |
| `sources/Game/World/Trees.js` | Authored trunk geometry and several modelled canopy reference transforms per tree, instanced across the world |
| `sources/Game/Rendering.js` | Three.js WebGPU/TSL, antialiasing, bloom strength 0.25, and a quality-dependent focus pass |
| `sources/Game/Passes/cheapDOF.js` | Screen-band blur outside the centre, using a hash blur; it does not depend on a physical lens simulation |
| `sources/Game/World/Grass.js` | Local reusable geometry around the camera, terrain masks, variable blade heights, and shared wind |
| `readme.md` | Blender assets and an export pipeline with ETC1S/KTX texture compression |

The source currently declares Three.js `^0.183.2`. IlluminatED uses r169 WebGL,
so copying the TSL material classes directly would break the existing renderer.

## What was obtained and applied

- Original birch-tree, cherry-tree, and lantern GLBs, the foliage mask, and palette
  texture are saved locally. Their sizes and SHA-256 hashes are in `assets.json`.
- `trees.json` contains decoded trunk attributes, indices and authored canopy
  transforms. `scripts/extract-folio-trees.mjs` reproduces the conversion from the
  original GLBs using `draco3dgltf@1.5.7` in the research directory. No decoder is
  shipped to the player.
- Existing park-tree tiles now use those birch/cherry trunks and layered canopy
  references, scaled to the game. Existing navigation/collisions remain authoritative.
  Other trees retain the lighter shared geometry.
- Foliage samples the original grayscale mask as **alphaMap**, not PNG alpha (the
  image's black background is opaque). It retains a local generated fallback,
  animated wind/shadows, camera-facing cards, and a small player-visibility opening.
- `illustrated-light.ts` adapts coloured core/drop shadows and low bounced light
  to r169 GLSL. It blends with the current diffuse lighting and preserves PBR
  specular/emissive response. The palette is softened for the larger city and
  disabled indoors.
- `miniature-focus.ts` adapts the screen-band focus idea with a bounded nine-tap
  filter. It runs only for Ultra desktop outdoor views and leaves HTML UI sharp.
- The lantern GLB is retained as a reference asset; it is not placed throughout
  the map or represented as an integrated gameplay prop.

## Validation and limits

Typechecking and tests cover decoded geometry, texture integrity, shader hook
composition, existing map preservation, scenery resource budgets, and quality
gating. The production build passed, lint on the new rendering files passed, and
the final targeted run passed 25 tests. The prior broader gameplay run passed 65
checks. The final material optimization reuses the already-sampled sun-shadow
factor and passed shader-composition checks. A passing build does
not compile every GPU shader variant. Final visual/GPU checks remain necessary
when browser access is available. There is no claim of exact reference parity
or a measured 60 FPS result.

Sources: [reference site](https://bruno-simon.com/),
[pinned source](https://github.com/brunosimon/folio-2025/tree/41046b57eeed8d156d9c3fd7fa259900baef7816),
[licence](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/license.md),
[REA](https://github.com/morluto/rea).
