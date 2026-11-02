# Character styled looks

The Locker's **Styled looks** tab offers 24 coordinated IlluminatED Originals. These combine the existing real Blender garment meshes with free labels, glasses, held props and capes. They are 24 combinations from the 120-garment collection, not 24 additional garment meshes.

All 120 garment assets have also been rebuilt in Blender with original raised stitch geometry, a sewn geometric maker's mark and family-specific tailoring. Details include hoodie drawcords, blazer cuff buttons and pocket squares, reinforced utility panels, a block-built jersey number, police checker bands, coat pocket pens, segmented paramedic reflectors, apron binding, satchel clasps, weather piping and trail buckles. Every added piece carries the same `wearBone`/`wearPart` attachment metadata, so it moves with the supplied character rig. The 120 catalogue IDs and existing unlock/price rules are unchanged. The saved source is `blender/blocky-wardrobe.blend`.

Collections are London, Kent, Nottingham, Road crew and Signature. The supplied Hero, Knight, Wizard, Pirate, Astronaut, Robot, Zombie and Princess each receive appearance-based recommendations. Classic variants share their character's recommendations. Recommendations only change ordering: any character can wear any look.

Trying a look updates the live preview. It preserves the chosen character, skin, face, hair and companion, and restores each garment's authored colour palette. The player still uses the existing Save outfit or Apply to local game action. No currency is charged and no items are added to ownership. Every constituent item is already free without an unlock. Role-play uniforms retain the existing modest needs perks.

Definitions and pure try-on helpers are in `src/game/core/character-styles.ts`. Validation: `node --test tests/character-styles.test.mjs` checks all 24 looks, supplied-character recommendations, ownership validity, immutable try-on and preservation of character identity.

Regenerate with Blender: `Blender --background --python scripts/world/build_blocky_wardrobe.py`; then run `python3 scripts/world/prepare_blocky_wardrobe_thumbnails.py`. For a targeted geometry rebuild, append `-- --families hoodie business`; `--skip-thumbnails` is available when only source mesh validation is needed.
