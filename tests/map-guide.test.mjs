import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";
const W = projectData("src/game/core/world.ts");
const { placesFor, walkingRoute } = projectData("src/game/core/map-guide.ts");
test("the location guide includes every workplace entrance, study space and named landmark", () => {
  const places = placesFor(W.CITY);
  assert.equal(new Set(places.map((p) => p.id)).size, places.length);
  for (const portal of W.CITY.portals.filter(
    (p) => p.to.kind === "map" && p.to.mapId.startsWith("workplace-"),
  ))
    assert.equal(places.find((p) => p.id === portal.id)?.kind, "job");
  for (const name of [
    "Buckingham Palace",
    "Big Ben",
    "London Eye",
    "Tower Bridge",
    "Study Quarter",
  ])
    assert.ok(
      places.some((p) => p.name.includes(name)),
      `${name} missing`,
    );
  assert.ok(places.some((p) => p.kind === "study"));
  assert.ok(
    places.every(
      (p) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= 0 &&
        p.y >= 0 &&
        p.x < W.CITY.width &&
        p.y < W.CITY.height,
    ),
  );
});
test("map walking routes follow connected collision-free tiles, never cut diagonally through walls", () => {
  const places = placesFor(W.CITY);
  for (const place of places) {
    const route = walkingRoute(W.CITY, W.CITY.spawn, place);
    // Some destinations are across disconnected grounds; those must say no route.
    if (!route.length) continue;
    for (let i = 0; i < route.length; i++) {
      assert.equal(
        W.blocked(W.CITY, route[i].x, route[i].y),
        false,
        place.name,
      );
      if (i)
        assert.equal(
          Math.abs(route[i].x - route[i - 1].x) +
            Math.abs(route[i].y - route[i - 1].y),
          W.TILE,
        );
    }
  }
  const job = places.find((p) => p.kind === "job");
  assert.ok(walkingRoute(W.CITY, W.CITY.spawn, job).length > 0);
});
test("unreachable and invalid map targets do not invent a route", () => {
  const map = {
    id: "test",
    cols: 5,
    rows: 3,
    width: 160,
    height: 96,
    spawn: { x: 48, y: 48 },
    tiles: ["#####", "#.#.#", "#####"],
  };
  assert.equal(
    walkingRoute(map, { x: 48, y: 48 }, { x: 112, y: 48 }).length,
    0,
  );
  assert.equal(
    walkingRoute(map, { x: NaN, y: 48 }, { x: 112, y: 48 }).length,
    0,
  );
});
