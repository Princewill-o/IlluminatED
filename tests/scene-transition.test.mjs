import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";
const { sceneTransitionGate } = projectData(
  "src/game/core/scene-transition.ts",
);

test("one transition owns the handover; repeated presses and stale ready events cannot replace it", () => {
  const gate = sceneTransitionGate();
  const trip = gate.begin("university-ucl", 3, 100);
  assert.ok(trip);
  assert.equal(gate.begin("home", 3, 120), null);
  assert.equal(gate.ready({ mapId: "city", rendererId: 4 }, 150), null);
  assert.equal(
    gate.ready({ mapId: "university-ucl", rendererId: 3 }, 160),
    null,
  );
  const ready = gate.ready({ mapId: "university-ucl", rendererId: 4 }, 180);
  assert.equal(ready.id, trip.id);
  assert.equal(
    gate.ready({ mapId: "university-ucl", rendererId: 5 }, 190),
    null,
  );
  assert.equal(gate.finish(trip.id + 1), false);
  assert.equal(gate.finish(trip.id), true);
  assert.ok(gate.begin("city", 4, 200));
});
test("returning to the same map requires a fresh renderer and old cleanup cannot unlock a newer trip", () => {
  const gate = sceneTransitionGate();
  const first = gate.begin("city", 8, 100);
  assert.equal(gate.ready({ mapId: "city", rendererId: 8 }, 120), null);
  gate.finish(first.id);
  const next = gate.begin("city", 9, 150);
  assert.equal(gate.finish(first.id), false);
  assert.equal(gate.begin("home", 9, 160), null);
  assert.ok(gate.ready({ mapId: "city", rendererId: 10 }, 200));
  assert.equal(gate.finish(next.id), true);
});
