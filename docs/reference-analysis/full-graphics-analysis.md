# Comprehensive graphics investigation

## Evidence and scope

This extends the earlier ten-file pass. The reference is Bruno Simon's
[published folio-2025](https://github.com/brunosimon/folio-2025), pinned to
`41046b57eeed8d156d9c3fd7fa259900baef7816`, alongside the running
[reference site](https://bruno-simon.com/).

- REA 6.7.0 analysed the complete authored JavaScript selection, including the
  build script, without a `source-path` filter: **128 parsed JavaScript files,
  131 relevant files, 145,918 visited AST nodes, zero parse failures**. The Git
  inventory contains another seven bundled third-party decoder/transcoder JS
  files; these are listed separately in `rea-full-provenance.json`.
- `rea-full-provenance.json` records result identity, coverage and limitations;
  `rea-full-summary.json` is REA's summary view of the complete evidence.
- `repository-inventory.json` inventories all **1,226 Git tree entries**, with Git
  blob identities. This inventories models, textures, Blender sources, sounds
  and code; it does not claim every model was rendered or remodelled.
- REA launched an isolated Edge profile, loaded the live reference, waited for
  graphics, captured a 1280×720 screenshot and DOM, and recorded network/console
  events. Capture completed with **457 retained events**, including 150 requests;
  `rea-live-reference.json` records the result and limitations.
- Four deployed JavaScript URLs were observed in the live page asset inventory.
  Separately downloaded byte identities are in `deployed-scripts.json`. Decoder
  wrappers and minified bundles have separate bounded analysis results; they
  must not be mistaken for complete semantic recovery of vendor code.

Full evidence is retained outside application dependencies in
`%TEMP%/illuminated-reference-research/`. It is not shipped to players. Source
evidence alone is approximately 115 MB. REA was not registered globally or added
to application dependencies.

## Findings and implementation

Findings come from source inspection supported by REA's static graph. Runtime
observations corroborate rendered presentation, not every internal relationship.
Adaptations are WebGL/r169 implementations: the reference's TSL/WebGPU modules
cannot be copied directly into r169.

| Published subsystem | Finding and IlluminatED adaptation |
| --- | --- |
| `Cycles/DayCycles.js`, `Ligthing.js` | Sun, shadow, emission and fog change together. Shared palettes now coordinate sunlight, hemisphere fill, reflections and haze. |
| `Fog.js` | Radial screen-space fog matches the background. Shared shader colour now drives distance fog and one background triangle, retaining the culling envelope. |
| `Materials.js`, `Materials/MeshDefaultMaterial.js` | Palette-driven diffuse gradients, terrain bounce and radial emissives. Extends existing coloured shadows/bounce with restrained lamp pools and bulb haloes. |
| `World/PoleLights.js` | Night-switched glass and a small insect swarm. Modelled bulb positions, fixed nearby glow buffers and drifting insects; static lights remain with reduced motion. |
| `World/Lanterns.js` | Authored lanterns and physical interactions. Licensed original model retained; reference physics are not imported. |
| `World/Trees.js`, `World/Foliage.js`, `World/Bushes.js` | Authored trunks, canopy transforms and masked cards. Existing licensed birch/cherry models, mask, layered canopy and wind shadows retained. |
| `World/Grass.js`, `World/Flowers.js`, `World/Leaves.js`, `Wind.js` | Local foliage buffers and shared motion. Existing local meadow, flowers and drifting leaves remain budgeted and respect reduced motion. |
| `World/WaterSurface.js`, `Water.js` | Terrain-aware shore masks, waves and weather ripples. Per-tile exposed-bank flags now add narrow moving foam and rain rings without extra passes. |
| `Weather.js`, `World/RainLines.js`, `World/Snow.js` | Weather affects water, wind and particles. Softly masked precipitation, lower sunlight, overcast reflections and wet materials now agree. |
| `World/Scenery.js`, `World/Floor.js` | Authored surface details and highlights. Surface atlas/masonry finish retained; road roughness and masonry colour respond to rain. |
| `World/VisualVehicle.js`, `Physics/PhysicsVehicle.js` | Visual suspension and independent wheels. Existing steering, wheel spin, suspension, paint and lamps remain driven by the education game's movement. |
| `Rendering.js`, `Passes/cheapDOF.js`, `Quality.js` | Bloom/focus are budgeted. Existing HDR grade, AO, AA, Ultra focus and adaptive resolution retained; no added lighting postprocessing pass. |
| `InstancedGroup.js`, `World/Scenery.js`, `PreRenderer.js` | Reuse and precomputation support dense scenery. Static batching, fixed particle buffers and sky rebakes only on phase/overcast changes. |
| Characters / application UI | A different product and assets. Preserve IlluminatED clips, motion, school/career flows and UI transitions. |

## Boundaries

All authored JavaScript files and build scripts were selected. REA explicitly excludes the inline
body in `sources/index.html:46`; manual review shows only Google Analytics
`dataLayer`/`gtag` setup, with no graphics code. CSS, topology, Blender authoring
and textures were inventoried and inspected where relevant; these are not JS AST
analysis. No claim of inspecting every Blender object is made.

The live page reports Three.js r183, consistent with the source dependency range.
This **does not prove** the deployed bundle came from the pinned revision. The
four downloaded hashes identify those bytes only. One network request failed
during capture; this window does not cover every possible interaction or asset.

REA successfully parsed the deployed rendering and Rapier JavaScript files,
visiting 1,036,832 AST nodes. Their semantic graph is bounded and truncated;
`rea-deployed-provenance.json` records those limits. Basis parsed in the broad
deployment run. The Draco wrapper repeatedly hit REA's analysis timeout, including
an isolated bounded request. It remains unresolved; no native decoder/WASM
decompilation or complete vendor-code recovery is claimed.

Fantasy vehicle skins, destruction, freezing-water physics, secrets, events and
the separate backend are game features, not missing graphics settings. They are
not ported into the education platform. MIT notices remain with copied assets.

Implementation checks are recorded in `runtime-validation.json` and
`../graphics-presentation.md`. These do not establish exact visual parity,
exhaustive asset recreation or guaranteed frame rates across devices.
