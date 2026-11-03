import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const { retainLifeSnapshot, retainNearbySnapshot } = projectData("src/game/core/world-ui-snapshots.ts");
const { readAccountLife, lifeStorageKey } = projectData("src/game/core/life-storage.ts");
const { freshLife, STAR_FADE_MS } = projectData("src/game/core/law.ts");
const memory = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test("unchanged life storage polls retain their snapshot while real timed penalties still update", () => {
  const store = memory(), key = lifeStorageKey("student");
  store.setItem(key, JSON.stringify({ ...freshLife(), stars: 2, heatAt: 1000 }));
  const initial = readAccountLife(store, "student", 1000);
  let snapshot = initial;
  for (let now = 2000; now < 1000 + STAR_FADE_MS; now += 1000)
    snapshot = retainLifeSnapshot(snapshot, readAccountLife(store, "student", now));
  assert.equal(snapshot, initial, "59 equivalent polls must not invalidate the world React tree");
  const cooled = retainLifeSnapshot(snapshot, readAccountLife(store, "student", 1000 + STAR_FADE_MS));
  assert.notEqual(cooled, initial); assert.equal(cooled.stars, 1);
  store.setItem(key, JSON.stringify({ ...freshLife(), stars: 5, jailUntil: 5000, hearing: { stars: 4, charge: "Fictional hearing" } }));
  const jailed = readAccountLife(store, "student", 4000);
  assert.equal(retainLifeSnapshot(jailed, readAccountLife(store, "student", 4999)), jailed);
  const released = retainLifeSnapshot(jailed, readAccountLife(store, "student", 5000));
  assert.notEqual(released, jailed); assert.equal(released.jailUntil, 0); assert.equal(released.hearing, null);
});

test("life changes from an immediate write are not hidden, including nested court evidence", () => {
  const previous = { ...freshLife(), hearing: { stars: 3, charge: "Test", streetCase: { witnesses: [{ statement: "Observed" }] } } };
  assert.equal(retainLifeSnapshot(previous, JSON.parse(JSON.stringify(previous))), previous);
  const changedEvidence = JSON.parse(JSON.stringify(previous)); changedEvidence.hearing.streetCase.witnesses[0].statement = "Corrected";
  assert.equal(retainLifeSnapshot(previous, changedEvidence), changedEvidence);
  const changedWork = { ...freshLife(), prisonWork: 1 };
  assert.equal(retainLifeSnapshot(freshLife(), changedWork), changedWork);
  const student = { ...freshLife(), stars: 2 }, anotherAccount = freshLife();
  assert.equal(retainLifeSnapshot(student, anotherAccount), anotherAccount);
});

const person = (id, extra = {}) => ({ id, name: `Resident ${id}`, kind: "npc", x: 10, y: 20, distance: 24, ...extra });

test("empty and stationary nearby polls do not allocate new UI snapshots", () => {
  const empty = []; assert.equal(retainNearbySnapshot(empty, []), empty);
  const previous = [person("one")];
  assert.equal(retainNearbySnapshot(previous, [person("one")], true), previous);
  const moved = [person("one", { x: 13, y: 23, distance: 28 })];
  assert.equal(retainNearbySnapshot(previous, moved, false), previous, "closed phone HUD only reads membership");
  assert.equal(retainNearbySnapshot(previous, moved, true), moved, "opening the phone receives fresh action coordinates");
});

test("nearby names, player identity, ordering and range membership always update", () => {
  const previous = [person("one"), person("two")];
  for (const next of [
    [person("one", { name: "Updated name" }), person("two")],
    [person("one", { kind: "player" }), person("two")],
    [person("two"), person("one")],
    [person("one")],
    [person("one"), person("three")],
    [],
  ]) assert.equal(retainNearbySnapshot(previous, next, false), next);
});
