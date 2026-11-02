import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";
import { projectData } from "../scripts/lib/project-data.mjs";
const { navigationRoute, remainingRoute, denseRoute, routeMetres } =
  projectData("src/game/core/navigation.ts");
const { TILE, blocked } = projectData("src/game/core/world.ts");
const map = {
  id: "navigation-test",
  cols: 7,
  rows: 5,
  width: 7 * TILE,
  height: 5 * TILE,
  spawn: { x: 1.5 * TILE, y: 1.5 * TILE },
  tiles: ["#######", "#..#..#", "#..#..#", "#.....#", "#######"],
};
const target = {
  id: "lesson",
  name: "Study Quarter",
  kind: "study",
  x: 5.5 * TILE,
  y: 1.5 * TILE,
};
test("the ground trail takes the connected path around a wall", () => {
  const route = navigationRoute(map, map.spawn, target);
  assert.ok(route.points.length > 5);
  assert.equal(route.driving, false);
  assert.ok(route.points.every((p) => !blocked(map, p.x, p.y)));
  assert.ok(route.points.some((p) => p.y === 3.5 * TILE));
  assert.equal(route.metres, (route.points.length - 1) * 8);
  const half = route.points.slice(Math.floor(route.points.length / 2));
  const remaining = remainingRoute(route.points, half[0]);
  assert.equal(remaining.length, half.length);
  assert.equal(
    remainingRoute(route.points, { x: 20 * TILE, y: 20 * TILE }),
    null,
  );
});
test("driving trails keep road turns and never suggest a shortcut through buildings", () => {
  const road = {
    ...map,
    tiles: ["#######", "#==#==#", "#==#==#", "#=====#", "#######"],
  };
  const route = navigationRoute(road, road.spawn, target, true);
  assert.ok(route.points.length > 5);
  assert.ok(route.driving);
  for (const p of route.points)
    assert.equal(
      road.tiles[Math.floor(p.y / TILE)][Math.floor(p.x / TILE)],
      "=",
    );
  assert.ok(route.points.some((p) => p.y === 3.5 * TILE));
  const sealed = {
    ...map,
    tiles: ["#######", "#..#..#", "#..#..#", "#..#..#", "#######"],
  };
  assert.equal(navigationRoute(sealed, map.spawn, target).points.length, 0);
});
test("long road segments are subdivided without cutting the corner", () => {
  const points = denseRoute([
    { x: 0, y: 0 },
    { x: 4 * TILE, y: 0 },
    { x: 4 * TILE, y: 2 * TILE },
  ]);
  assert.equal(points.length, 7);
  assert.equal(routeMetres(points), 48);
  assert.ok(points.every((p) => p.y === 0 || p.x === 4 * TILE));
});
test("3D ribbon animates its texture, respects reduced motion and releases its GPU resources", () => {
  const code = ts.transpileModule(
    fs.readFileSync("src/components/game/world/navigation-trail.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const exports = {};
  const context = {
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
  };
  vm.runInNewContext(code, {
    exports,
    document: {
      createElement() {
        return {
          getContext() {
            return context;
          },
        };
      },
    },
    require(name) {
      if (name === "three") return THREE;
      if (name === "@/game/core/world") return { TILE };
      throw Error(name);
    },
  });
  const scene = new THREE.Scene(),
    trail = exports.createNavigationTrail(scene, () => {}),
    route = navigationRoute(map, map.spawn, target);
  trail.update(route, 2, false);
  const [ribbon, beacon] = scene.children;
  assert.ok(ribbon.geometry.attributes.position.count > 0);
  assert.equal(ribbon.material.map.offset.x, -1.3);
  assert.equal(ribbon.material.color.getHexString(), "ffffff");
  assert.ok(beacon.visible);
  trail.update(route, 4, true);
  assert.equal(ribbon.material.map.offset.x, 0);
  assert.equal(beacon.scale.x, 1);
  let disposed = false;
  ribbon.geometry.addEventListener("dispose", () => (disposed = true));
  trail.update(null, 4, true);
  assert.ok(disposed);
  assert.equal(ribbon.visible, false);
  assert.equal(beacon.visible, false);
  trail.dispose();
  assert.equal(scene.children.length, 0);
});
