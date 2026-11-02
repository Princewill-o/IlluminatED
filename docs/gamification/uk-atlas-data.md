# UK atlas geography

The atlas coastline and major road lines use real Natural Earth geographic data. City markers, coastlines and roads all share the same Mercator projection in `src/game/core/uk-geography.ts`; the UI has no hand-placed city coordinates or invented island outline.

- Country geometry: Natural Earth 1:50m Admin 0 Countries, United Kingdom feature. Includes Northern Ireland and offshore Scottish islands.
- Road geometry: Natural Earth 1:10m Roads, UK major highway extract (63 segments). It is suitable for a national overview, not live navigation. Smaller approach roads are described in the researched route itinerary rather than invented as geographic lines.
- The Kent destination is represented by Canterbury's coordinates and labelled Canterbury · Kent on the map; Kent is a county, and the game combines Canterbury and Medway architecture.
- The national atlas shows the real M25 orbital. The playable motorway is a long, straight, compressed section with paired exits and continuous looping; district road layouts are original game maps.

Data fetched 2 November 2026 from the [Natural Earth repository](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson). Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Rebuild the two small bundled extracts with `node scripts/world/build_uk_atlas.mjs`; the app does not fetch geographic data during gameplay.

Geography tests verify the real coast, city-on-land placement, correct relative positions, Northern Ireland membership and exclusion of Dublin. Core UK map tests separately verify playable roads, building access and return routes.
