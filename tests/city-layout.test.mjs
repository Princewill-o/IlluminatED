import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";

const { buildLondon } = projectData("src/game/core/london.ts");
const { COMPANIES } = projectData("src/game/core/companies.ts");
const { BUS_WIDTH, CAR_WIDTH } = projectData("src/game/core/vehicles.ts");
const { londonMap, SOLID, TILE, blocked } = projectData(
  "src/game/core/world.ts",
);

function reachableTiles(map) {
  const start = [
    Math.floor(map.spawn.x / TILE),
    Math.floor(map.spawn.y / TILE),
  ];
  const seen = new Set([start.join(",")]);
  const queue = [start];
  for (let at = 0; at < queue.length; at++) {
    const [x, y] = queue[at];
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      const key = `${nx},${ny}`;
      if (
        seen.has(key) ||
        nx < 0 ||
        ny < 0 ||
        nx >= map.cols ||
        ny >= map.rows ||
        blocked(map, (nx + 0.5) * TILE, (ny + 0.5) * TILE)
      )
        continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

test("Every main road and bridge has four clear driving tiles across", () => {
  const { tiles } = buildLondon();
  for (const y of [20, 60, 76])
    for (let x = 0; x < tiles[0].length; x++)
      for (let dy = -1; dy <= 2; dy++)
        assert.ok("=:".includes(tiles[y + dy][x]), `road ${x},${y + dy}`);
  for (const x of [15, 34, 52, 70, 100])
    for (let y = 0; y < tiles.length; y++)
      for (let dx = -1; dx <= 2; dx++)
        assert.ok("=:".includes(tiles[y][x + dx]), `road ${x + dx},${y}`);
});

test("All traffic routes run along clear four-tile roads, including closing segments", () => {
  const { tiles, routes } = buildLondon();
  for (const route of routes)
    for (let i = 0; i < route.length; i++) {
      const [ax, ay] = route[i],
        [bx, by] = route[(i + 1) % route.length];
      assert.ok(ax === bx || ay === by, "axis-aligned route segments");
      const distance = Math.hypot(bx - ax, by - ay);
      for (let step = 0; step <= distance; step += 0.5) {
        const f = distance ? step / distance : 0;
        const x = ax + (bx - ax) * f,
          y = ay + (by - ay) * f;
        for (const lane of [-1, 1])
          for (const edge of [-Math.max(BUS_WIDTH, CAR_WIDTH) / 2, Math.max(BUS_WIDTH, CAR_WIDTH) / 2]) {
            const tx = Math.floor(x + (ax === bx ? lane + edge : 0));
            const ty = Math.floor(y + (ay === by ? lane + edge : 0));
            assert.ok(
              "=:".includes(tiles[ty]?.[tx] ?? ""),
              `route lane ${tx},${ty}`,
            );
          }
      }
    }
});

test("HQs, every building door, stations and game entrances stay physically reachable", () => {
  const london = buildLondon(),
    map = londonMap(),
    reachable = reachableTiles(map);
  assert.equal(
    london.things.filter((t) => t.kind === "building" && t.companyId).length,
    COMPANIES.length,
  );
  const buildings = london.things.filter(
    (t) => t.kind === "building" || t.kind === "station",
  );
  for (const b of buildings) {
    const x = Math.floor(b.x + b.w / 2),
      y = b.y + b.h;
    assert.ok(
      !SOLID.has(london.tiles[y]?.[x] ?? "#"),
      `${b.id}: physical front door`,
    );
    assert.ok(reachable.has(`${x},${y}`), `${b.id}: connected front door`);
  }
  for (const station of london.stations)
    assert.ok(
      reachable.has(
        `${Math.floor(station.exit.x)},${Math.floor(station.exit.y)}`,
      ),
      `${station.id}: exit reachable`,
    );
  for (const portal of map.portals.filter((p) => p.to.kind !== "bus")) {
    const x = Math.floor((portal.rect.x + portal.rect.w / 2) / TILE),
      y = Math.floor((portal.rect.y + portal.rect.h / 2) / TILE);
    assert.ok(
      reachable.has(`${x},${y}`),
      `${portal.id}: game entrance reachable`,
    );
  }
});

test("Buildings and stations never overlap a landmark, each other, or a road", () => {
  const { things, tiles } = buildLondon();
  const footprints = things.filter(
    (t) =>
      (t.kind === "building" ||
        t.kind === "station" ||
        t.kind === "landmark") &&
      t.id !== "tower-bridge",
  );
  for (let i = 0; i < footprints.length; i++) {
    const a = footprints[i];
    for (const b of footprints.slice(i + 1))
      assert.ok(
        !(
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y
        ),
        `${a.id} overlaps ${b.id}`,
      );
    for (let y = a.y; y < a.y + a.h; y++)
      for (let x = a.x; x < a.x + a.w; x++)
        assert.equal(tiles[y][x], "X", `${a.id}: intact footprint ${x},${y}`);
  }
});

test("Named food venues have their own clear plot and a public forecourt", () => {
  const { things, tiles } = buildLondon();
  for (const [id, label] of [
    ["mcdonalds", "McDonald's"],
    ["kfc", "KFC"],
    ["starbucks", "Starbucks"],
  ]) {
    const shop = things.find((t) => t.id === id);
    assert.ok(shop && shop.kind === "building" && shop.style === "shop", id);
    assert.equal(shop.label, label);
    assert.ok(
      shop.w >= 5 && shop.h >= 4,
      `${id}: substantial dedicated building`,
    );
    for (let x = shop.x; x < shop.x + shop.w; x++)
      for (let y = shop.y + shop.h; y <= shop.y + shop.h + 1; y++)
        assert.ok(
          ["-", "_"].includes(tiles[y][x]),
          `${id}: two-tile forecourt`,
        );
    assert.ok(
      !things.some(
        (t) =>
          t !== shop &&
          (t.kind === "building" || t.kind === "station") &&
          t.x < shop.x + shop.w + 1 &&
          t.x + t.w > shop.x - 1 &&
          t.y < shop.y + shop.h + 2 &&
          t.y + t.h > shop.y - 1,
      ),
      `${id}: separate plot`,
    );
  }
});

test("Neighbourhoods contain many homes and remaining green land is divided by paths", () => {
  const { tiles, things } = buildLondon();
  assert.ok(
    things.filter((t) => t.kind === "building" && t.style === "terrace")
      .length >= 90,
    "at least ninety homes",
  );
  const visited = new Set();
  let largest = 0;
  for (let y = 0; y < tiles.length; y++)
    for (let x = 0; x < tiles[0].length; x++) {
      if (!"gf".includes(tiles[y][x]) || visited.has(`${x},${y}`)) continue;
      const queue = [[x, y]];
      visited.add(`${x},${y}`);
      for (let at = 0; at < queue.length; at++)
        for (const [nx, ny] of [
          [queue[at][0] - 1, queue[at][1]],
          [queue[at][0] + 1, queue[at][1]],
          [queue[at][0], queue[at][1] - 1],
          [queue[at][0], queue[at][1] + 1],
        ]) {
          const key = `${nx},${ny}`;
          if (visited.has(key) || !"gf".includes(tiles[ny]?.[nx] ?? " "))
            continue;
          visited.add(key);
          queue.push([nx, ny]);
        }
      largest = Math.max(largest, queue.length);
    }
  assert.ok(largest <= 110, `largest uninterrupted lawn is ${largest} tiles`);
  assert.ok(
    things.filter((t) => t.kind === "bench").length >= 12,
    "landscaped public seating",
  );
  assert.ok(
    things.filter((t) => t.kind === "tree").length < 200,
    "parks use deliberate tree groups",
  );
});
