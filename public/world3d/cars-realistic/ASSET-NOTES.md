# Realistic Car Pack

Converted from the supplied Realistic Car Pack (November 2018) FBX models: NormalCar1, NormalCar2, SportsCar, SportsCar2, SUV, Taxi and Cop. The included license identifies the assets as CC0 1.0 / public domain.

All live motor-car aliases (including old saved van IDs, delivery traffic and unknown/future IDs) resolve through `src/game/core/realistic-cars.ts`. The source pack contains no van: the saved van and delivery aliases use NormalCar2, and ambulance traffic uses SUV. Existing garage prices, IDs and driving physics remain valid.

The first FBX-to-GLB conversion preserved an FBX material alpha of zero on solid bodies. `scripts/world/normalize_realistic_car_materials.py` corrects these untextured solid-color materials to OPAQUE without changing the source geometry or RGB colors. This avoids invisible body panels and wheels.

The live renderer fits each car uniformly inside the shared collision dimensions and preserves its roof height and wheel proportions. The same corrected GLBs generate all seven dealership previews (`previews/`) and 32 directional motor-car fallback sprites under `public/world/movers/`. Bus, boat, coach and train assets are unchanged.

Reproduction:
- Run the normalizer with Python after FBX-to-GLB conversion.
- Run `scripts/world/render_realistic_cars.py` and `scripts/world/render_realistic_car_sprites.py` with Blender.
- Convert PNG intermediates to WebP with Pillow; fallback sprite outputs must be resized to the existing `public/world/movers.json` w/h values. Metadata anchors stay unchanged.
