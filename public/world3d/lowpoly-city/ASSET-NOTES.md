# LowPoly City 01

- Source: `LowPoly_City_01.blend` and its `textures_1` palette, supplied by Princewill (November 2026).
- Licence: not included with the files. **Confirm the pack's licence allows commercial use** before launch.
- Exported per building from the .blend: each model is centred on its footprint with its base at 0,
  textured with the shared 512 px colour palette. Normals were dropped (the game shades flat and
  recomputes them on load), then welded and quantised (KHR_mesh_quantization) to keep downloads small.
- Used for: named places (bank, hospital, hotels, restaurants, police station, school, post office,
  supermarkets, petrol station, travel agency, business centre), city-centre flats and shops, and
  most neighbourhood houses. See `lowpolyCityBuilding` in src/game/core/supplied-building-assets.ts.
