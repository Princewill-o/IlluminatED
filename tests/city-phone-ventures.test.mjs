import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const W = projectData("src/game/core/world.ts"),
  C = projectData("src/game/core/careers.ts"),
  V = projectData("src/game/core/ventures.ts"),
  S = projectData("src/game/core/city-social.ts");
function reachable(map) {
  const seen = new Set(),
    queue = [
      [Math.floor(map.spawn.x / W.TILE), Math.floor(map.spawn.y / W.TILE)],
    ];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i],
      key = `${x}:${y}`;
    if (seen.has(key) || W.blocked(map, (x + 0.5) * W.TILE, (y + 0.5) * W.TILE))
      continue;
    seen.add(key);
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ])
      queue.push([x + dx, y + dy]);
  }
  return seen;
}
function checkPortals(map) {
  const seen = reachable(map);
  for (const p of map.portals) {
    let accessible = false;
    for (let y = p.rect.y / W.TILE; y < (p.rect.y + p.rect.h) / W.TILE; y++)
      for (let x = p.rect.x / W.TILE; x < (p.rect.x + p.rect.w) / W.TILE; x++)
        if (seen.has(`${x}:${y}`)) accessible = true;
    assert.ok(accessible, `${map.id}: ${p.id} must be reachable`);
  }
}
test("every workplace has a distinct floor plan and reachable stations", () => {
  const signatures = new Set();
  for (const work of C.WORKPLACES) {
    const map = W.workplaceMap(work.id),
      key = map.tiles.join("\n");
    assert.ok(!signatures.has(key), `duplicate: ${work.id}`);
    signatures.add(key);
    checkPortals(map);
  }
});
test("employer offices vary their geometry and room identities", () => {
  const signatures = new Set();
  for (const work of C.WORKPLACES) {
    const map = W.officeMap({
      slug: work.id,
      name: work.name,
      sector: work.sector,
      accent: work.accent,
    });
    const key = map.tiles.join("\n");
    assert.ok(!signatures.has(key), `duplicate: ${work.id}`);
    signatures.add(key);
    checkPortals(map);
    assert.ok(map.rooms.every((r) => r.name.includes(work.name)));
  }
});
test("Venture Yard has three workspaces, three reachable NPC desks and a city entrance", () => {
  const map = W.ventureMap();
  assert.equal(map.rooms.length, 3);
  assert.equal(map.characters.length, 3);
  checkPortals(map);
  const city = W.londonMap(),
    p = city.portals.find((p) => p.id === "venture-yard");
  assert.ok(p);
  assert.ok(reachable(city).has(`${p.rect.x / W.TILE}:${p.rect.y / W.TILE}`));
});
test("venture pricing accounts for all wages and the increased team capacity", () => {
  for (const sector of V.VENTURE_SECTORS)
    for (let level = 1; level <= 5; level++)
      for (let hires = 0; hires <= 3; hires++) {
        const v = {
            sector: sector.id,
            level,
            staff: Array.from({ length: hires }, (_, i) => String(i)),
            orders_completed: 7,
          },
          o = V.ventureOrder(v);
        assert.equal(o.quantity, 4 + 3 + level + hires);
        assert.equal(o.revenue, o.quantity * sector.price);
        assert.equal(o.cost, o.quantity * sector.cost + 4 * hires);
        assert.ok(o.revenue > o.cost);
      }
});
test("NPC identity is stable across rendering budgets and scoped to its map and route", () => {
  const path = { x0: 1.5, z0: 2.5, x1: 8.5, z1: 2.5 };
  assert.deepEqual(
    S.residentIdentity("city", path),
    S.residentIdentity("city", { ...path }),
  );
  assert.notEqual(
    S.residentIdentity("city", path).id,
    S.residentIdentity("venture-hub", path).id,
  );
  assert.notEqual(
    S.residentIdentity("city", path).id,
    S.residentIdentity("city", { ...path, x1: 7.5 }).id,
  );
});
