import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { projectData } from "../scripts/lib/project-data.mjs";

const { downtownBuildingAsset, DOWNTOWN_LANDMARKS } = projectData("src/game/core/supplied-building-assets.ts");
const { pixelTreePlans, NATURE_TREES, NATURE_BEDS, natureAsset } = projectData("src/game/core/crayon-vegetation.ts");
const { buildLondon } = projectData("src/game/core/london.ts");
const { londonMap } = projectData("src/game/core/world.ts");

function glb(path) {
  const b = fs.readFileSync(path);
  assert.equal(b.toString("utf8", 0, 4), "glTF", path);
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)));
}

test("Quaternius packs from itch.io are CC0, credited and self-contained", () => {
  for (const dir of ["downtown", "stylized-nature"]) {
    assert.match(fs.readFileSync(`public/world3d/${dir}/LICENSE.txt`, "utf8"), /CC0 1\.0/);
    assert.match(fs.readFileSync(`public/world3d/${dir}/ASSET-NOTES.md`, "utf8"), /quaternius\.itch\.io/);
  }
  for (const name of [...NATURE_TREES, ...NATURE_BEDS]) {
    const d = glb("public" + natureAsset(name));
    assert.ok(d.buffers.every((b) => !b.uri), name);
    assert.ok((d.images ?? []).every((i) => i.bufferView !== undefined && i.mimeType === "image/webp"), name);
  }
});

test("downtown blocks only replace unnamed city-centre plots, never venues", () => {
  const buildings = buildLondon().things.filter((t) => t.kind === "building");
  const chosen = buildings.filter((t) => downtownBuildingAsset(t));
  assert.ok(chosen.length >= 6, `only ${chosen.length} downtown blocks`);
  for (const t of chosen) {
    assert.ok(DOWNTOWN_LANDMARKS[t.id] || (!t.label && !t.companyId && t.id.startsWith("b-")), t.id);
    assert.ok(fs.existsSync("public" + downtownBuildingAsset(t)));
  }
  assert.ok(fs.existsSync("public/world3d/downtown/planter.glb"));
});

test("most planted trees are the leafy stylized kit", () => {
  const plan = pixelTreePlans(londonMap());
  const leafy = plan.filter((p) => p.asset.includes("/stylized-nature/"));
  assert.ok(leafy.length >= plan.length / 2, `${leafy.length} of ${plan.length}`);
});

test("menu backdrop slides are real files", () => {
  const src = fs.readFileSync("src/components/game/menu-backdrop.tsx", "utf8");
  const slides = [...src.matchAll(/src: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(slides.length >= 4);
  for (const s of slides) assert.ok(fs.existsSync("public" + s), s);
});
