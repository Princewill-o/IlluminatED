import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";

const { CITY, TILE } = projectData("src/game/core/world.ts");
const { cityFallbackPlan } = projectData("src/game/core/fallback-city.ts");

test("fallback scenery covers the current city including the expanded eastern Study Quarter", () => {
  const plan = cityFallbackPlan(CITY);
  assert.equal(plan.width, CITY.width);
  assert.equal(plan.height, CITY.height);
  assert.ok(plan.width > 96 * TILE);
  assert.ok(plan.buildings.some(b => b.id === "study-club" && b.x > 96 * TILE));
});

test("fallback buildings never paint across roads, walkways or carved door openings", () => {
  const roofs = cityFallbackPlan(CITY).buildings.flatMap(b => b.solid);
  assert.ok(roofs.length > 500);
  for (const roof of roofs) {
    assert.equal(CITY.tiles[roof.y / TILE][roof.x / TILE], "X");
    assert.equal(roof.w, TILE);
    assert.equal(roof.h, TILE);
  }
  const building = cityFallbackPlan(CITY).buildings.find(b => b.id === "study-club");
  const tile = building.solid[0];
  const changed = { ...CITY, tiles: [...CITY.tiles] };
  const x = tile.x / TILE, y = tile.y / TILE;
  changed.tiles[y] = changed.tiles[y].slice(0, x) + "-" + changed.tiles[y].slice(x + 1);
  assert.equal(cityFallbackPlan(changed).buildings.find(b => b.id === building.id).solid.some(r => r.x === tile.x && r.y === tile.y), false);
});

test("fallback restaurant brands have distinct named frontages and doors aligned to their live portals", () => {
  const buildings = cityFallbackPlan(CITY).buildings;
  const accents = new Set();
  for (const id of ["mcdonalds", "kfc", "starbucks"]) {
    const b = buildings.find(item => item.id === id);
    const p = CITY.portals.find(item => item.id === id);
    assert.ok(b && b.label);
    accents.add(b.accent);
    assert.ok(b.doors.some(d => d.x === p.rect.x + p.rect.w / 2 && d.y === p.rect.y));
  }
  assert.equal(accents.size, 3);
});

test("every solid city obstacle has a visible building or street fixture in fallback", () => {
  const plan = cityFallbackPlan(CITY);
  const painted = new Set([...plan.buildings.flatMap(b => b.solid), ...plan.fixtures].map(r => `${r.x / TILE},${r.y / TILE}`));
  for (let y = 0; y < CITY.rows; y++) for (let x = 0; x < CITY.cols; x++)
    if (CITY.tiles[y][x] === "X") assert.ok(painted.has(`${x},${y}`), `${x},${y}: visible collision obstacle`);
});
