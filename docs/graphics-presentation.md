# Stylised world presentation

The existing Three.js r169 world now has warm directional lighting, cooler sky
fill, contact-hardening sun shadows, depth-based ambient occlusion, HDR colour
grading, and restrained highlight bloom. An inexpensive generated outdoor sky
replaces indoor studio reflections on water, glass, and vehicle paint.

The subsequent [REA reference analysis](reference-analysis/README.md) adds
authored birch/cherry park trees, Bruno Simon's licensed foliage mask and palette,
coloured-shadow/bounce shading adapted to WebGL, player-readable foliage openings,
and a restrained Ultra-only miniature focus pass. The material adaptation reuses
Three.js's existing directional shadow sample rather than sampling it twice.

The map, collisions, controls, simulation, progression, and network messages
remain the gameplay source of truth. These additions affect presentation.

## Environment and movement

- Cutout leaf sprays use canopy normals, backlighting, wind, and matching animated
  shadow geometry. Street trees have autumn and blossom colour variants.
- Nearby grass and wildflowers use reusable instance buffers with fixed budgets.
  The buffers refresh at district boundaries, rather than rebuilding every frame.
- A bounded pool of drifting leaves follows nearby existing tree positions.
- River normals and texture offsets create slow flowing highlights.
- Cars use independent wheel pivots extracted from the existing model primitives,
  steering, suspension lean, clearcoat paint, chrome, headlights and brake lights.
  The bus model uses its own wheel axis. Teleports do not spin wheels wildly.
- Characters keep their existing clips and crossfades, with movement-driven pace,
  turn lean, idle looking, breathing, and facial expressions. Additive poses reset
  before each mixer update so idle movement cannot accumulate.
- Shared page, panel, button, and card transitions add brief interaction feedback.

Reduced-motion preferences stop decorative vegetation, drifting leaves, optional
vehicle dynamics, character lean/breathing, and the new CSS transitions. Existing
gameplay animation remains functional.

## Graphics settings

Use **Settings → Graphics** in the world:

| Preset | Behaviour |
| --- | --- |
| Automatic | Desktop effects with gradual adaptive resolution; lighter defaults on phones |
| Low | Direct rendering, no shadow maps, post-processing, meadow, or drifting leaves |
| Medium | Desktop shadows, environment, depth shading and 2-sample antialiasing; lighter mobile rendering |
| High | HDR grading, bloom, up to 4-sample antialiasing and more depth samples |
| Ultra | High presentation with 16 depth samples and slightly stronger highlight bloom |

Old `cinematic` preferences migrate to Ultra. Pixel ratio is capped at 1.5;
shadow maps are capped at 2048. Automatic resolution ignores warm-up and hidden
tabs and uses hysteresis before changing resolution. It does not establish an
FPS guarantee: foreground GPU measurements are still needed on target hardware.

## Local verification

Run the preview with `ILLUMINATED_PREVIEW=1` in development, then open:

`/games/city-showcase?map=city&time=day&weather=clear&x=40&y=36`

`time=day|dusk|night` previews lighting; `weather=clear` applies only in the
development-only showcase. Production account and multiplayer access are unchanged.

The development canvas exposes `data-graphics-fps`, `data-graphics-draws`,
`data-graphics-triangles`, `data-graphics-ratio`, and `data-graphics-preset` for
inspection. Background browser throttling makes those measurements unsuitable
for desktop performance claims.

Tests exercise the real car, bus, and character GLBs; geometry budgets; vegetation
placement; bounded dynamics; reduced motion; adaptive resolution; camera framing;
and existing driving, traffic, trains, and home behaviour.

Visual checks completed during implementation showed the outdoor lighting,
foliage, water, character movement, menus, and car rendering without browser shader
errors. Browser automation was subsequently disabled in Work settings, so final
visual checks after the marker, character-pose reset, and projection fixes remain
pending. This is a substantial rendering upgrade, not a verified claim of parity
with the reference's fully authored art assets or a measured 60 FPS result.
