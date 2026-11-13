import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const { londonMap } = projectData("src/game/core/world.ts");
const { buildLondon } = projectData("src/game/core/london.ts");
const { streetWorks, SCAFFOLD_LEVELS } = projectData("src/game/core/street-works.ts");
const { ROLE_UNIFORMS } = projectData("src/game/core/roles.ts");

const map = londonMap();
const works = streetWorks(map, buildLondon().things, { sites: 4, deliveries: 5 });

test("the city has building sites and delivery stops, each staffed", () => {
  const sites = works.filter((w) => w.kind === "scaffold"), stops = works.filter((w) => w.kind === "delivery");
  assert.ok(sites.length >= 3, `${sites.length} sites`);
  assert.ok(stops.length >= 3, `${stops.length} delivery stops`);
  for (const w of works) {
    assert.ok(w.workers.length >= 1 && w.vehicle, w.id);
    for (const p of w.workers) assert.ok(ROLE_UNIFORMS[p.role], `${p.role} has no uniform`);
  }
  assert.ok(sites.reduce((n, s) => n + s.workers.filter((p) => p.y > 0).length, 0) >= 9, "builders up on the scaffold");
});

test("sites are on unnamed buildings, vans park on the road, and pavement walkers stay on pavement", () => {
  const plots = new Map(buildLondon().things.map((t) => [t.id, t]));
  for (const w of works) {
    const plot = plots.get(w.id.replace(/^(site|delivery)-/, ""));
    assert.ok(plot, w.id);
    if (w.kind === "scaffold") assert.ok(!plot.label && !plot.companyId, `${w.id} would cover a named door`);
    const v = w.vehicle;
    assert.match(map.tiles[Math.floor(v.z)][Math.floor(v.x)], /[=:]/, `${w.id} vehicle is off the road`);
    for (const p of w.workers.filter((p) => p.y === 0)) for (const at of [p, p.beat].filter(Boolean)) assert.match(map.tiles[Math.floor(at.z)][Math.floor(at.x)] ?? "#", /[-_gf]/, `${p.id} off the pavement`);
    for (const p of w.workers.filter((p) => p.y > 0)) assert.ok(SCAFFOLD_LEVELS.includes(p.y));
  }
  for (const kind of works.map((w) => w.vehicle.kind.split("@")[0])) assert.ok(fs.existsSync(`public/world3d/cars-blender/${kind}.glb`), kind);
});
