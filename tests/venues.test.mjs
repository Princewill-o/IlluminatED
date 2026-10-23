import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";

const { venueMap, VENUES, RAMP, DECK } = projectData("src/game/core/venues.ts");
const { londonMap, elevationAt, levelMap, blocked, TILE, portalAt } = projectData("src/game/core/world.ts");

test("every venue in the city has a walk-in inside with an exit and a counter", () => {
  const city = londonMap();
  for (const v of VENUES) {
    const map = venueMap(`venue-${v.id}`);
    assert.ok(map, v.id);
    assert.ok(map.portals.some((p) => p.id === "exit" && p.to.mapId === "city"), `${v.id}: exit`);
    assert.ok(map.portals.some((p) => p.id === "counter"), `${v.id}: counter`);
    assert.ok(city.portals.some((p) => p.to.kind === "map" && p.to.mapId === `venue-${v.id}`), `${v.id}: door from the city`);
    assert.ok(!blocked(map, map.spawn.x, map.spawn.y), `${v.id}: spawn is walkable`);
  }
});

test("upstairs is a real deck in the same room, reached by walking up the stairs", () => {
  const map = venueMap("venue-starbucks");
  assert.ok(map.deck, "the café has a mezzanine");
  assert.equal(venueMap("venue-starbucks-up"), null, "no separate teleport floor");
  const x = (RAMP.x + 1) * TILE;
  // Bottom of the stairs: ground floor. Top: up on the deck, at deck height.
  const bottom = elevationAt(map, x, (RAMP.y + RAMP.h - 0.1) * TILE, 0);
  const top = elevationAt(map, x, (RAMP.y + 0.1) * TILE, 0);
  assert.equal(bottom.level, 0);
  assert.ok(bottom.z < 0.2);
  assert.equal(top.level, 1);
  assert.ok(Math.abs(top.z - DECK.height) < 0.1);
  // Up on the deck you can walk the deck; you can also walk underneath it at ground level.
  const under = { x: (DECK.x + 2.5) * TILE, y: (DECK.y + 5.5) * TILE };
  assert.ok(!blocked(levelMap(map, 1), under.x, under.y), "deck floor walkable upstairs");
  assert.ok(!blocked(levelMap(map, 0), under.x, under.y), "space under the deck walkable downstairs");
  // You can't step off the deck's open edge.
  assert.ok(blocked(levelMap(map, 1), (DECK.x - 2) * TILE, (DECK.y + 4) * TILE));
  // The upstairs activity only triggers on the deck.
  const up = map.portals.find((p) => p.level === 1);
  const cx = up.rect.x + up.rect.w / 2, cy = up.rect.y + up.rect.h / 2;
  assert.equal(portalAt(levelMap(map, 1), cx, cy)?.id, up.id);
  assert.notEqual(portalAt(levelMap(map, 0), cx, cy)?.id, up.id);
});
