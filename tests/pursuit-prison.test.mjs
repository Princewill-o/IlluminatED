import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const W = projectData("src/game/core/world.ts");
const P = projectData("src/game/core/pursuit.ts");
const L = projectData("src/game/core/law.ts");

test("A real responding car follows road tiles and officers can catch a stationary player", () => {
  const map = W.londonMap(),
    player = map.spawn;
  let s = P.startPursuit(map, player);
  assert.ok(s.route.length >= 8);
  for (const p of s.route)
    assert.ok(
      "=:".includes(
        map.tiles[Math.floor(p.y / W.TILE)][Math.floor(p.x / W.TILE)],
      ),
    );
  for (let t = 0; t < 90000 && s.stage !== "challenge"; t += 200) {
    s = P.tickPursuit(s, map, player, t, 0.2);
    for (const o of s.officers) assert.equal(W.blocked(map, o.x, o.y), false);
  }
  assert.equal(s.stage, "challenge");
});
test("Leaving the search field clears stars only after six uninterrupted seconds", () => {
  const map = W.londonMap(),
    start = P.startPursuit(map, map.spawn);
  const far = { x: start.origin.x + start.radius + W.TILE, y: start.origin.y };
  let s = P.tickPursuit(start, map, far, 100, 0.2);
  assert.equal(s.outsideSince, 100);
  assert.equal(s.escaped, false);
  s = P.tickPursuit(s, map, map.spawn, 2000, 0.2);
  assert.equal(s.outsideSince, null);
  s = P.tickPursuit(s, map, far, 3000, 0.2);
  assert.equal(P.tickPursuit(s, map, far, 8999, 0.2).escaped, false);
  assert.equal(P.tickPursuit(s, map, far, 9000, 0.2).escaped, true);
  const wanted = { ...L.freshLife(), stars: 3, heatAt: 100 };
  assert.equal(
    L.cooled(wanted, 200000).stars,
    3,
    "high wanted levels need a spatial escape",
  );
});
test("The prison cell, study desk, inmate conversations and maze exit are connected", () => {
  const map = W.prisonMap();
  assert.ok(map.cols >= 48 && map.rows >= 34);
  for (const portal of map.portals) {
    const end = {
      x: portal.rect.x + portal.rect.w / 2,
      y: portal.rect.y + portal.rect.h / 2,
    };
    assert.equal(W.blocked(map, end.x, end.y), false, portal.id);
    assert.ok(
      P.walkRoute(map, map.spawn, end).length > 0,
      `${portal.id} reachable from an open cell`,
    );
  }
  for (let seconds = 0; seconds < 120; seconds++)
    for (const guard of P.prisonGuardPositions(seconds))
      assert.equal(W.blocked(map, guard.x, guard.y), false);
  assert.equal(
    P.caughtByPrisonGuard(map, map.spawn, 1),
    false,
    "you cannot be caught inside the safe cell block",
  );
  const guard = P.prisonGuardPositions(10)[0];
  assert.equal(P.caughtByPrisonGuard(map, guard, 10), true);
});
test("New Study Quarter destinations are reachable, with a working station and a larger world", () => {
  const map = W.londonMap();
  assert.equal(map.cols, 112);
  assert.equal(map.rows, 88);
  for (const id of ["makerspace", "study-club", "reading-garden"]) {
    const p = map.portals.find((p) => p.id === id);
    assert.ok(p, id);
    assert.ok(
      P.walkRoute(map, map.spawn, {
        x: p.rect.x + p.rect.w / 2,
        y: p.rect.y + p.rect.h / 2,
      }).length > 0,
      `${id} reachable`,
    );
  }
  assert.ok(W.tubeStations().some((s) => s.id === "study-quarter"));
});
