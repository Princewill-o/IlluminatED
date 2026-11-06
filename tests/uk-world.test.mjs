import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const uk = projectData("src/game/core/uk-world.ts");
const { universityInteriorMap, blocked, TILE, CITY } = projectData("src/game/core/world.ts");
const regions = ["kent", "nottingham", "birmingham", "manchester", "edinburgh"];
function reachable(map) {
  const s = [Math.floor(map.spawn.x / TILE), Math.floor(map.spawn.y / TILE)],
    seen = new Set([s.join(",")]),
    q = [s];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [a, b] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      const k = `${a},${b}`;
      if (
        !seen.has(k) &&
        a >= 0 &&
        b >= 0 &&
        a < map.cols &&
        b < map.rows &&
        !blocked(map, (a + 0.5) * TILE, (b + 0.5) * TILE)
      ) {
        seen.add(k);
        q.push([a, b]);
      }
    }
  }
  return seen;
}
test("five distinct regions have reachable full-size housing and furnished interiors with exact door returns", () => {
  const signatures = new Set();
  for (const id of regions) {
    const scene = uk.buildUKScene(id),
      map = uk.ukWorldMap(id),
      seen = reachable(map);
    const homes = scene.things.filter(
      (t) => t.kind === "building" && t.id.includes("-home-"),
    );
    assert.ok(homes.length >= 12, id);
    assert.ok(
      scene.things
        .filter((t) => t.kind === "building")
        .every((t) => t.height >= 5),
    );
    signatures.add(
      scene.things
        .filter((t) => t.kind === "building")
        .map((t) => `${t.colour}/${t.roof}/${t.style}/${t.height}`)
        .join("|"),
    );
    for (const home of homes) {
      const door = map.portals.find(
        (p) => p.to.kind === "map" && p.to.mapId === home.id,
      );
      assert.ok(door, home.id);
      assert.ok(
        seen.has(`${door.rect.x / TILE},${door.rect.y / TILE}`),
        `${home.id} reachable`,
      );
      const inside = uk.ukWorldMap(home.id);
      assert.ok(inside);
      assert.ok(inside.tiles.some((r) => /[dksbo]/.test(r)));
      const exit = inside.portals.find(
        (p) => p.to.kind === "map" && p.to.mapId === id,
      );
      assert.ok(exit);
      assert.ok(
        reachable(inside).has(`${exit.rect.x / TILE},${exit.rect.y / TILE}`),
      );
      const back = uk.ukArrival(id, home.id);
      assert.ok(back && !blocked(map, back.x, back.y));
      assert.ok(
        Math.hypot(
          back.x - (door.rect.x + door.rect.w / 2),
          back.y - (door.rect.y + door.rect.h / 2),
        ) <
          TILE * 2,
      );
    }
  }
  assert.equal(signatures.size, regions.length);
});
test("all destinations and road connections are reversible, without pretending Kent is a city", () => {
  assert.equal(uk.UK_PLACES.find((p) => p.id === "kent").kind, "county");
  for (const id of uk.UK_SCENES) {
    const map = uk.ukWorldMap(id);
    assert.ok(map);
    const seen = reachable(map);
    for (const p of map.portals) {
      assert.ok(
        seen.has(`${p.rect.x / TILE},${p.rect.y / TILE}`),
        `${id}: ${p.id}`,
      );
      if (p.to.kind !== "map" || p.to.mapId === "city") continue;
      const next = uk.ukWorldMap(p.to.mapId) ?? (p.to.mapId.startsWith("university-")?universityInteriorMap(p.to.mapId.slice(11)):p.to.mapId.startsWith("party-")?projectData("src/game/core/party.ts").partyMap(p.to.mapId.slice(6)):null);
      assert.ok(next, p.to.mapId);
      assert.ok(
        next.portals.some(
          (q) =>
            q.to.kind === "map" && (q.to.mapId === id || q.to.mapId === "m25"),
        ),
        `${id} return from ${next.id}`,
      );
    }
  }
  assert.equal(
    uk
      .ukWorldMap("rotherhithe")
      .portals.filter((p) => p.to.kind === "map" && p.to.mapId === "city")
      .length,
    2,
  );
  assert.equal(uk.ukWorldMap("invented"), null);
});
test("traffic follows closed clear road loops and buildings never occupy their lanes", () => {
  for (const id of uk.UK_SCENES) {
    const scene = uk.buildUKScene(id);
    assert.ok(scene.routes.length);
    for (const route of scene.routes) {
      assert.deepEqual(Array.from(route[0]), Array.from(route.at(-1)));
      for (let i = 1; i < route.length; i++) {
        const [ax, ay] = route[i - 1],
          [bx, by] = route[i];
        assert.ok(ax === bx || ay === by);
        const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let j = 0; j <= n; j++) {
          const f = n ? j / n : 0,
            x = ax + (bx - ax) * f,
            y = ay + (by - ay) * f;
          for (const lane of [-1, 1])
            for (const edge of [-0.85, 0.85]) {
              const tx = Math.floor(x + (ax === bx ? lane + edge : 0)),
                ty = Math.floor(y + (ay === by ? lane + edge : 0));
              assert.ok(
                "=:".includes(scene.tiles[ty]?.[tx] ?? "?"),
                `${id} road ${tx},${ty}`,
              );
            }
        }
      }
    }
  }
});
test("loop exits preserve their lane, land on clear paired roads and reject unsafe inputs", () => {
  for (const id of regions) {
    const map = uk.ukWorldMap(id);
    for (const y of [20.5, 21.5, 22.5, 23.5]) {
      const point = uk.loopRoadPosition(id, 25, y * TILE);
      assert.ok(point);
      assert.equal(point.y, y * TILE);
      assert.ok(!blocked(map, point.x, point.y));
      assert.ok(point.x >= map.width - 4 * TILE);
    }
  }
  for (const bad of [
    [NaN, 20],
    [Infinity, 20],
    [-10000, 20],
    [20, -500],
  ])
    assert.equal(uk.loopRoadPosition("kent", ...bad), null);
  assert.equal(uk.loopRoadPosition("uk-home-kent-0", 25, 21 * TILE), null);
  assert.equal(uk.loopRoadPosition("kent", 25, 10 * TILE), null);
});
test("Rotherhithe entries and exits retain north and south physical endpoints", () => {
  const tunnel = uk.ukWorldMap("rotherhithe"),
    north = uk.ukArrival("rotherhithe", "city", "uk-tunnel-north"),
    south = uk.ukArrival("rotherhithe", "city", "uk-tunnel-south");
  assert.ok(north.x < south.x);
  for (const p of [north, south]) assert.ok(!blocked(tunnel, p.x, p.y));
  const n = uk.ukArrival("city", "rotherhithe", "rotherhithe-north"),
    s = uk.ukArrival("city", "rotherhithe", "rotherhithe-south");
  assert.ok(n.y < s.y);
  assert.equal(n.x, s.x);
  assert.ok(!blocked(CITY, n.x, n.y));
  assert.ok(!blocked(CITY, s.x, s.y));
});
test("M25 is a long six-lane separated motorway, with reversible exits and endless carriageways", () => {
  const map = uk.ukWorldMap("m25"),
    scene = uk.buildUKScene("m25");
  assert.equal(map.cols, 720);
  assert.equal(map.rows, 72);
  assert.equal(scene.routes.length, 3);
  for (let x = 24; x < 696; x++) {
    for (const y of [28, 30, 32, 40, 42, 44])
      assert.ok("=:".includes(map.tiles[y][x]));
    for (let y = 34; y < 38; y++) assert.equal(map.tiles[y][x], "X");
  }
  for (const y of [28.5, 30.5, 32.5, 40.5, 42.5, 44.5]) {
    const east = uk.loopRoadPosition("m25", map.width - 60, y * TILE),
      west = uk.loopRoadPosition("m25", 60, y * TILE);
    assert.ok(east && west);
    assert.equal(east.y, y * TILE);
    assert.equal(west.y, y * TILE);
    assert.ok(!blocked(map, east.x, east.y));
    assert.ok(!blocked(map, west.x, west.y));
    assert.equal(uk.loopRoadPosition("m25", east.x, east.y), null);
    assert.equal(uk.loopRoadPosition("m25", west.x, west.y), null);
  }
  assert.equal(uk.loopRoadPosition("m25", 40, 35 * TILE), null);
  for (const id of ["city", ...regions])
    assert.equal(
      map.portals.filter((p) => p.to.kind === "map" && p.to.mapId === (id === "city" ? id : `road-${id}`))
        .length,
      2,
    );
});
test("district plans differ and building meshes always cover their exact collision footprints", () => {
  const layouts = new Set();
  for (const id of regions) {
    const scene = uk.buildUKScene(id);
    layouts.add(scene.tiles.join("\n"));
    for (const b of scene.things.filter((t) => t.kind === "building"))
      for (let y = b.y; y < b.y + b.h; y++)
        for (let x = b.x; x < b.x + b.w; x++)
          assert.equal(scene.tiles[y][x], "X", `${b.id}: ${x},${y}`);
    const home = uk.ukWorldMap(`uk-home-${id}-0`);
    assert.ok(home.layout.some((f) => f.item === "bed"));
    assert.ok(home.layout.some((f) => f.item === "desk"));
  }
  assert.equal(layouts.size, 5);
});
