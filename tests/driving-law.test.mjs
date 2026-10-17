import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const law = projectData("src/game/core/law.ts");
const storage = projectData("src/game/core/life-storage.ts");

test("a driving offence earns a capped star and keeps the correct court charge across a save", () => {
  let state = law.addStar(law.freshLife(), 1000, "Driving through a red light");
  assert.equal(state.stars, 1);
  const entries = new Map([[storage.lifeStorageKey("driver"), JSON.stringify(state)]]);
  const saved = storage.readAccountLife({ getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) }, "driver", 2000);
  assert.equal(law.wantedCharge(saved), "Driving through a red light");
  for (let i = 0; i < 8; i++) state = law.addStar(state, 2000 + i, "Causing a road collision");
  assert.equal(state.stars, law.MAX_STARS);
  assert.equal(law.wantedCharge(state), "Causing a road collision");
});

test("clearing, cooling and release remove the old driving charge without losing rewards", () => {
  const wanted = { ...law.addStar(law.freshLife(), 1000, "Driving against traffic"), cardsUsed: 2, prisonWork: 3 };
  for (const cleared of [law.clearWanted(wanted), law.cooled(wanted, 1000 + law.STAR_FADE_MS), law.releaseFromPrison(wanted)]) {
    assert.equal(cleared.stars, 0);
    assert.equal(cleared.lastOffence, null);
    assert.equal(cleared.cardsUsed, 2);
    assert.equal(cleared.prisonWork, 3);
  }
});

test("old saves and a new non-driving incident do not reuse a traffic charge", () => {
  assert.equal(typeof law.wantedCharge({ ...law.freshLife(), stars: 2 }), "string");
  const fighting = law.addStar(law.addStar(law.freshLife(), 1000, "Driving through a red light"), 2000);
  assert.equal(fighting.lastOffence, null);
  assert.notEqual(law.wantedCharge(fighting), "Driving through a red light");
});
