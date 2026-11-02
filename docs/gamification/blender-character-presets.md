# 100 Blender character presets

`scripts/world/build_character_presets.py` builds 100 new full-character GLBs, 100 rendered PNG previews, a preset manifest and `blender/character-presets-100.blend` with one editable collection per preset. It derives the rig, head and hands from the supplied Blocky City Hero, retaining the original face proportions and 22-bone skeleton. It builds original clothing and hair/headwear geometry around that rig.

The collection has ten character groups and ten coordinated variations in each: city creative, campus coder, studio founder, workshop maker, track captain, community officer, pharmacy scientist, emergency responder, design student and trail explorer. Ten hair/headwear silhouettes include quiffs, curls, ponytails, braids, bobs, caps, beanies, headphones, coils and buns; eight skin tones and varied clothing palettes are baked into the models. These are presets built from a shared modular rig, not 100 independently sculpted body meshes.

In the Locker, **Character presets** is a separate selection group. Applying one changes the character and its coordinated free outfit, then uses the existing explicit save/apply step. Further wardrobe choices replace the preset's baked clothing while preserving its head, hair and bone attachments. Failed garment loads retain the baked outfit. Body scale is measured before replacing clothing, keeping player height consistent.

Runtime animation reuses the supplied character's ten clips on the compatible rig: idle, walk, run, jump, fall, wave, punch, death, cheer and dance. The preset GLBs contain the compatible skeleton rather than duplicating the animation data 100 times.

The original 16 supplied designs remain in **Character**. New preset heads and the 120 original clothing sets are free catalogue items; paid accessories retain their existing ownership checks. The insert-only migration registers the heads without changing accounts, policies, permissions or paid item prices.

The catalogue seed was applied to the IlluminatED Supabase project on 2 November 2026: 116 free head choices and 120 free outfits, with insert-on-conflict behavior for safe re-runs.

Run Blender in background with `--python scripts/world/build_character_presets.py`. `ILLUMED_PRESET_LIMIT=1` is an artist's quick preview, not a complete catalogue build. `ILLUMED_PRESET_START=N` resumes after N existing exports and assembles the full editable library after generation. `tests/blender-character-presets.test.mjs` checks all 100 models, their distinct files, embedded textures, compatible rigs, modelled accessories, rendered previews and normal ownership sanitization.
