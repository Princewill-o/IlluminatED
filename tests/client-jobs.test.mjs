import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const C = projectData("src/game/core/client-jobs.ts");
const R = projectData("src/game/core/roles.ts");
const P = projectData("src/game/core/pursuit.ts");
const W = projectData("src/game/core/world.ts");

test("every practical role has NPC clients, stations, its own building and a uniform", () => {
  for (const role of R.ROLES) {
    const def = C.clientJob(role.id);
    assert.ok(def, role.id);
    assert.equal(role.place.mapId, `role-${role.id}`);
    assert.ok(R.ROLE_UNIFORMS[role.id]?.top, `${role.id} uniform`);
    const map = C.roleWorkplaceMap(`role-${role.id}`, role.title, role.colour);
    for (const st of C.roleStationSpots(def)) {
      const at = { x: (st.x + 0.5) * 32, y: (st.y + 0.5) * 32 };
      assert.equal(W.blocked(map, at.x, at.y), false, `${role.id}:${st.id} standable`);
      assert.ok(P.walkRoute(map, map.spawn, at).length > 0, `${role.id}:${st.id} reachable`);
    }
    // Different clients ask for different things, and every request uses real stations.
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      let a = (i + 1) * 0x9e3779b1 >>> 0;
      const rng = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const order = def.order(rng, i % 4);
      for (const n of order.needs) assert.ok(def.stations.some((s) => s.id === n), `${role.id} needs ${n}`);
      seen.add(order.needs.join(","));
    }
    if (def.mode === "counter") assert.ok(seen.size >= 2, `${role.id} varies its requests`);
  }
});

test("accuracy rewards the right things in the right order and penalises extras", () => {
  const order = { client: "A", line: "", needs: ["a", "b", "c"], ordered: true };
  assert.equal(C.serviceAccuracy(order, ["a", "b", "c"]), 1);
  assert.ok(C.serviceAccuracy(order, ["c", "b", "a"]) < 1);
  assert.ok(C.serviceAccuracy(order, ["a", "b", "c", "x"]) < 1);
  assert.ok(C.serviceAccuracy(order, ["a"]) < 0.5);
});
