# Game graphics modes

The world uses Three.js/WebGL2 raster rendering. This change adds physically based surfaces, studio environment lighting on desktop, ACES filmic tone mapping, soft directional shadow maps, anti-aliasing, and subtle colour grading. Cinematic enables restrained HDR bloom where EXT_color_buffer_float is supported. These are not hardware ray tracing or physical 4DX effects. Existing geometry and gameplay remain stylised.

## Controls and budgets

The bottom-left Graphics selector stores Balanced, Cinematic or Performance locally. Balanced is the default. Performance bypasses post-processing, environment lighting and real shadow maps. Immersive motion is off by default, has small bounded walking/driving camera accents, and responds live to the operating system reduced-motion preference.

| Mode | Desktop DPR cap | Mobile DPR cap | Shadows | Desktop MSAA request |
| --- | --- | --- | --- | --- |
| Balanced | 1.25 | 1 | Desktop 1024 | 2 |
| Cinematic | 1.5 | 1.25 | Desktop 2048 / mobile 1024 | 4 |
| Performance | 0.75 | 0.75 | Off | 0 |

MSAA uses only sample counts supported by the render target format; otherwise FXAA is used. Non-HDR devices use unsigned-byte targets and skip bloom. GPU construction failures fall back to direct rendering. Shadow depth and receiver coordinates use the same world curvature as the visible meshes, including instanced objects. Post-processing resources and environment maps are released when changing maps or quality.

## Validation (19 October 2026)

- Browser: actual London city in Cinematic and Performance, indoor Study Quarter in Cinematic; no Three.js warnings/errors captured. Screenshot: output/graphics/cinematic-city.png.
- New visual-quality tests: three passing tests cover display budgets, optional motion/reduced motion, and curved standard/depth shaders against installed Three.js shader sources.
- TypeScript and full source ESLint pass. Production build completes successfully (164 pages); it also logs two non-fatal Node/Undici parser assertions during network-backed static generation. Credential scan: zero findings.
- Full repository regression run: 172/180 pass. Eight failures outside changed graphics modules: career harness missing stripe mock (3), resident budget expectation (1), overlapping hospital/hotel portal (1), pursuit state expectation (1), old map width expectation (1), and traffic junction count (1). These require separate investigation; this graphics change does not claim a clean full regression suite.

Visual checks are functional checks, not a representative device FPS benchmark. Cinematic costs more GPU time; use Performance on slower hardware.
