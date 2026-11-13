import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { projectData } from "../scripts/lib/project-data.mjs";

const { lowpolyCityBuilding, LOWPOLY_LANDMARKS, downtownBuildingAsset } = projectData("src/game/core/supplied-building-assets.ts");
const { crayonBuildingAsset } = projectData("src/game/core/crayon-vegetation.ts");
const { buildLondon } = projectData("src/game/core/london.ts");
const { FURNITURE } = projectData("src/game/core/homes.ts");

const buildings = buildLondon().things.filter((t) => t.kind === "building");

test("LowPoly City buildings exist for every plot that uses them, and named places keep their names", () => {
  const ids = new Set(buildings.map((t) => t.id));
  for (const id of Object.keys(LOWPOLY_LANDMARKS)) assert.ok(ids.has(id), `${id} is not a city plot`);
  const used = buildings.map((t) => [t, lowpolyCityBuilding(t, crayonBuildingAsset(t) !== null)]).filter(([, a]) => a);
  assert.ok(used.length >= 40, `only ${used.length} plots use the kit`);
  for (const [t, asset] of used) {
    assert.ok(fs.existsSync("public" + asset), asset);
    if (!LOWPOLY_LANDMARKS[t.id]) assert.ok(!t.label && !t.companyId, `${t.id} is a named place`);
    assert.ok(!downtownBuildingAsset(t) || LOWPOLY_LANDMARKS[t.id], `${t.id} claimed by two kits`);
  }
  assert.match(fs.readFileSync("public/world3d/lowpoly-city/ASSET-NOTES.md", "utf8"), /LowPoly City/);
});

test("KayKit furniture and tools are CC0 and every mapped model exists", () => {
  for (const pack of ["furniture", "tools"]) assert.match(fs.readFileSync(`public/world3d/kaykit/${pack}/License.txt`, "utf8"), /CC0/);
  const src = fs.readFileSync("src/components/game/world/home-furniture.ts", "utf8");
  const block = src.slice(src.indexOf("KIT_FURNITURE"), src.indexOf("};", src.indexOf("KIT_FURNITURE")));
  const pairs = [...block.matchAll(/"?([a-z-]+)"?: "([A-Za-z_]+)"/g)];
  assert.ok(pairs.length >= 15);
  const ids = new Set(FURNITURE.flatMap((f) => [f.id, f.design].filter(Boolean)));
  for (const [, item, model] of pairs) {
    assert.ok(ids.has(item), `${item} is not furniture`);
    assert.ok(fs.existsSync(`public/world3d/kaykit/furniture/${model}.gltf`), model);
  }
  const world = fs.readFileSync("src/components/game/world/world3d.tsx", "utf8");
  for (const [, name] of world.matchAll(/kaykitTool\('([A-Za-z_]+)'\)/g)) assert.ok(fs.existsSync(`public/world3d/kaykit/tools/${name}.gltf`), name);
  for (const name of world.match(/\['wrench_A'[^;]+/)[0].match(/'[A-Za-z_]+'/g).map((s) => s.slice(1, -1))) assert.ok(fs.existsSync(`public/world3d/kaykit/tools/${name}.gltf`), name);
});
