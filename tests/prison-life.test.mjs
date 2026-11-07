import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";
const P = projectData("src/game/core/prison-life.ts");
const W = projectData("src/game/core/world.ts");
const R = projectData("src/game/core/pursuit.ts");

const DAY = P.PRISON_DAY_MS;
const at = (frac, day = 100) => (day + frac) * DAY;

test("the routine covers the whole day, with strict roll calls and a lights-out", () => {
  let t = 0;
  for (const p of P.PERIODS) { assert.equal(p.from, t); assert.ok(p.to > p.from); t = p.to; }
  assert.equal(t, 1);
  assert.ok(P.PERIODS.filter((p) => p.strict).length >= 2);
  assert.ok(P.PERIODS.some((p) => p.night));
  assert.equal(P.prisonClock(at(0.01)).period.id, "roll-am");
});

test("being seen ticks a period; missing roll call means lockdown, missing a meal adds heat", () => {
  const stay = at(0.9, 99);
  let s = P.freshPrison(stay);
  s = P.attend(s, at(0.02), "landing").state; // morning roll call
  let j = P.judgePrevious(s, at(0.08));
  assert.equal(j.lockdown, false); assert.equal(j.missed, null);
  s = j.state;
  j = P.judgePrevious(s, at(0.17)); // skipped breakfast
  assert.equal(j.lockdown, false); assert.ok(j.state.heat >= 15);
  s = j.state;
  j = P.judgePrevious(s, at(0.84)); // skipped evening roll call
  assert.equal(j.lockdown, true); assert.equal(j.state.heat, 100);
  // Judged once only.
  assert.equal(P.judgePrevious(j.state, at(0.84)).lockdown, false);
});

test("arriving part-way through a period doesn't count as missing it", () => {
  const s = P.freshPrison(at(0.12)); // arrived late in breakfast
  assert.equal(P.judgePrevious(s, at(0.17)).missed, null);
});

test("crafting needs the ingredients and enough intellect", () => {
  let s = P.freshPrison(0);
  assert.equal(P.craft(s, "screwdriver").ok, false); // no wire yet
  s = P.addItem(s, "wire");
  const made = P.craft(s, "screwdriver");
  assert.equal(made.ok, true);
  assert.ok(P.has(made.state, "screwdriver"));
  assert.ok(!P.has(made.state, "toothbrush"));
  let t = P.addItem(P.addItem(P.freshPrison(0), "key-mould"), "wire");
  assert.equal(P.craft(t, "staff-key").ok, false, "needs 60 intellect");
  t = { ...t, stats: { ...t.stats, intellect: 60 } };
  assert.equal(P.craft(t, "staff-key").ok, true);
});

test("every escape route can actually be completed", () => {
  const night = at(0.95);
  const rollOk = () => 0.99; // never seen
  // Tunnel.
  let s = { ...P.freshPrison(0), stats: { strength: 50, fitness: 50, intellect: 60 } };
  s = P.addItem(s, "sturdy-shovel");
  let out;
  for (let i = 0; i < P.TUNNEL_LENGTH; i++) { out = P.dig(s, night, rollOk); s = out.state; }
  out = P.dig(s, night, rollOk);
  assert.equal(out.escape, "tunnel");
  // Vents.
  s = { ...P.freshPrison(0), stats: { strength: 50, fitness: 50, intellect: 60 } };
  for (const i of ["screwdriver", "rope", "bed-dummy"]) s = P.addItem(s, i);
  s = P.vent(s, night).state;
  s = P.applyItem(s, "bed-dummy").state;
  assert.equal(P.vent(s, night).escape, "vents");
  // Fence.
  s = { ...P.freshPrison(0), dummyInBed: true };
  s = P.addItem(P.addItem(s, "cutters"), "cutters");
  for (let i = 0; i < P.FENCE_SECTIONS - 1; i++) s = P.cutFence(s, night, rollOk).state;
  assert.equal(P.cutFence(s, night, rollOk).escape, "fence");
  // Front gate.
  s = P.addItem(P.addItem(P.freshPrison(0), "guard-uniform"), "staff-key");
  assert.equal(P.frontGate(s).escape, "front-gate");
  assert.equal(P.frontGate(P.freshPrison(0)).ok, false);
});

test("contraband, detectors, cell searches and solitary all bite", () => {
  let s = P.addItem(P.freshPrison(0), "file");
  const beep = P.detector(s);
  assert.equal(beep.ok, false); assert.ok(!P.has(beep.state, "file"));
  s = P.addItem(P.addItem(P.freshPrison(0), "file"), "pouch");
  assert.equal(P.detector(s).ok, true);
  s = { ...P.freshPrison(0), heat: 100, tunnel: 3, holeCovered: false };
  const search = P.cellSearch(s, () => 0);
  assert.ok(search); assert.equal(search.state.tunnel, 0);
  const hidden = P.cellSearch({ ...s, holeCovered: true }, () => 0);
  assert.equal(hidden.state.tunnel, 3);
  const sol = P.sendToSolitary(P.addItem(P.freshPrison(0), "file"), 1000);
  assert.ok(sol.solitaryUntil > 1000); assert.ok(!P.has(sol, "file"));
});

test("the prison map: every area reachable from your cell, guards on the staff side only", () => {
  const map = W.prisonMap();
  for (const portal of map.portals) {
    const end = { x: portal.rect.x + portal.rect.w / 2, y: portal.rect.y + portal.rect.h / 2 };
    assert.equal(W.blocked(map, end.x, end.y), false, portal.id);
    assert.ok(R.walkRoute(map, map.spawn, end).length > 0, `${portal.id} reachable`);
  }
  for (const id of ["prison-dig", "prison-vent", "prison-fence", "prison-escape", "prison-jobs", "inmate-riley", "desk-office"])
    assert.ok(map.portals.some((p) => p.id === id), id);
  assert.equal(W.prisonRoomAt(2, 3, null).room, "cell");
  assert.equal(W.prisonRoomAt(10, 9, null).room, "landing");
  assert.equal(W.prisonRoomAt(20, 20, "laundry").room, "work");
  for (let t = 0; t < 120; t++) for (const g of R.prisonGuardPositions(t)) assert.ok(g.x >= 27 * 32, "guards stay on the staff side");
});
