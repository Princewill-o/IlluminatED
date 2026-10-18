import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const H = projectData("src/game/core/homes.ts");
const N = projectData("src/game/core/needs.ts");
const W = projectData("src/game/core/world.ts");

test("the furnished starter house has a clear entrance and usable furnishings", () => {
  assert.equal(H.validLayout(H.STARTER_LAYOUT), null);
  assert.ok(H.STARTER_LAYOUT.some(p => p.item === "shower"));
  const map = W.homeMap(0);
  for (const p of H.STARTER_LAYOUT) {
    const portal = map.portals.find(portal => portal.id === `f-${p.key}`);
    assert.equal(portal.to.kind, "home-use");
    assert.equal(portal.to.key, p.key);
  }
});

test("all furnishings have an activity, finite duration and a valid need effect", () => {
  assert.equal(H.HOMES.length, 5);
  assert.equal(H.FURNITURE.length, 36);
  for (const f of H.FURNITURE) {
    const use = H.homeUse(f.id);
    assert.ok(use.duration >= 4000 && use.duration <= 8000);
    assert.ok(N.ACTIVITIES[use.effect], f.id);
    assert.ok(use.label.length > 4);
  }
  assert.equal(H.homeUse("linen-bed").animation, "sleep");
  assert.equal(H.homeUse("cinema-tv").animation, "watch");
  assert.equal(H.homeUse("rain-shower").animation, "shower");
  assert.equal(H.homeUse("kitchen").animation, "eat");
});

test("layout validation rejects overlaps, duplicates, blocked doors and unreachable furniture", () => {
  assert.match(H.validLayout([{ key: "a", item: "bed", x: 1, y: 2 }, { key: "b", item: "sofa", x: 1, y: 2 }]), /overlaps/);
  assert.match(H.validLayout([{ key: "a", item: "plant", x: 1, y: 2 }, { key: "a", item: "plant", x: 4, y: 2 }]), /unique/);
  assert.match(H.validLayout([{ key: "a", item: "plant", x: 9, y: 12 }]), /door/);
  assert.match(H.validLayout([{ key: "a", item: "plant", x: 1, y: 12 }]), /space in front/);
  assert.match(H.validLayout([{ key: "a", item: "plant", x: 1.5, y: 2 }]), /position/);
  for (const layout of [
    [{ key: "rug", item: "woven-rug", x: 5, y: 5 }, { key: "chair", item: "armchair", x: 5, y: 5 }],
    [{ key: "chair", item: "armchair", x: 5, y: 5 }, { key: "rug", item: "woven-rug", x: 5, y: 5 }],
  ]) assert.equal(H.validLayout(layout), null, "floor textiles can sit below furniture regardless of order");
});

test("existing saved needs gain hygiene safely, and finishing a shower restores it", () => {
  const old = { energy: 60, focus: 60, mood: 60, hunger: 60, social: 60, at: 1000 };
  const migrated = N.decay(old, 2000);
  assert.ok(Number.isFinite(migrated.hygiene));
  const after = N.apply({ ...migrated, hygiene: 10 }, "shower", 2000);
  assert.equal(after.hygiene, 65);
});

test("new catalogue prices and footprints match the server migration", () => {
  const sql = fs.readFileSync("supabase/migrations/20261018090959_home_living_and_furnishings.sql", "utf8");
  for (const match of sql.matchAll(/\('([^']+)',(\d+),(\d+),(\d+),(true|false)\)/g)) {
    const f = H.furnitureById(match[1]);
    assert.ok(f);
    assert.deepEqual([f.price, f.w, f.h, Boolean(f.starter)], [+match[2], +match[3], +match[4], match[5] === "true"]);
  }
});
