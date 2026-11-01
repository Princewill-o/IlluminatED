# Blender wardrobe: 120 outfit sets

Twelve generated clothing families × ten distinct material palettes = 120 clothing sets, each with a real GLB and a Blender-rendered WebP thumbnail. These are garments for the supplied sixteen Blocky characters; they do not add character families.

Families: everyday tee, hoodie, business blazer, utility workwear, training kit, police costume, pharmacy coat, paramedic uniform, kitchen apron, study cardigan, rain shell and explorer outfit. Distinct mesh details include collars, pockets, belts, radio, reflective strips, satchel and backpack. Uniforms are fictional costumes and confer no police authority, emergency authority, armour, damage or wanted-level advantage.

Rebuild:

1. `python3 scripts/world/blocky_outfit_spec.py` generates manifest definitions.
2. `Blender --background --python scripts/world/build_blocky_wardrobe.py` generates the 120 modular GLBs, PNG product renders and source `blender/blocky-wardrobe.blend`.
3. `python3 scripts/world/prepare_blocky_wardrobe_thumbnails.py` converts PNG product renders to WebP and removes PNG intermediates.

Each exported mesh carries `wearBone` and `wearPart` extras and the source rest transform. `blocky-garments.ts` converts these transforms to the corresponding supplied bone local coordinates. The original character head and hands remain visible, while authored body surfaces are replaced by the generated clothing; eyes, face, hair and helmets remain the supplied design. There is no separate replacement human mesh.

120 palette/silhouette combinations are distinct files, not 120 entirely independent hand-modelled silhouettes. Blender recipe, material palettes, manifests and rendered thumbnails are versioned alongside the runtime files. Default colors remain the palette named on the card; explicit dyes update cloth, legwear or footwear.

All generated sets are free cosmetic items. Small optional life/study perks are declared in `src/game/core/blocky-outfits.ts`; the maximum activity gain is one point, and decay reduction is at most three percent. There are no combat effects. Production account persistence is provided by migration `20261101010642_blocky_wardrobe_120.sql`, not applied remotely during this work. The migration was applied twice in a disposable local PostgreSQL database: 120 unique free rows, second application inserted zero rows.

Source character rig is from the user-supplied CC0 Blocky sample by Popyca / Vuena; character source notices remain in `../blocky-characters`. New wardrobe geometry and palette recipes are original project work.
