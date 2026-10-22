import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const W = projectData("src/game/core/world.ts");
const D = projectData("src/game/core/driving.ts");

test("hop-on bus routes stay on roads with clean corners", () => {
  const map = W.CITY, T = W.TILE;
  const onRoad = (x, y) => ["=", ":"].includes(map.tiles[Math.floor(y / T)][Math.floor(x / T)]);
  const route = D.roadRoute(map, { x: 34 * T, y: 26 * T }, { x: 146 * T, y: 80 * T });
  assert.ok(route.length >= 2, "found a route");
  for (const p of route) assert.ok(onRoad(p.x, p.y));
  // Every leg is a straight line along one axis and every tile along it is road.
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    assert.ok(a.x === b.x || a.y === b.y, "axis-aligned leg");
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / T;
    for (let s = 0; s <= steps; s++) assert.ok(onRoad(a.x + (b.x - a.x) * s / steps, a.y + (b.y - a.y) * s / steps));
  }
  assert.ok(route.length < 30, `few corners (${route.length})`);
});
