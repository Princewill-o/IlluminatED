import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const R = projectData("src/game/core/maths-racing.ts");

test("every world generates valid questions with four different options", () => {
  for (const w of R.WORLDS) for (let d = 1; d <= 4; d++) for (let i = 0; i < 120; i++) {
    const q = R.question(w, 1234 + d, i, d);
    assert.equal(q.options.length, 4, `${w.name} ${q.prompt}`);
    assert.equal(new Set(q.options).size, 4, `${w.name}: ${q.prompt} → ${q.options}`);
    assert.ok(q.answer >= 0 && q.answer < 4);
    assert.ok(!q.options.some((o) => /NaN|undefined|Infinity/.test(o)), `${q.prompt} ${q.options}`);
  }
});

test("questions are the same for the same seed (the server can check them)", () => {
  const w = R.WORLDS[2];
  assert.deepEqual(R.question(w, 99, 5, 2), R.question(w, 99, 5, 2));
});

function player(track, seed, accuracy, gapMs) {
  const events = [];
  for (let t = 1000, q = 0; t < 200_000; t += gapMs, q++) {
    const right = R.question(R.WORLDS[track.world - 1], seed, q, track.difficulty).answer;
    events.push({ t, kind: "answer", choice: (q * 37 % 100) / 100 < accuracy ? right : (right + 1) % 4 });
  }
  return events;
}

test("accuracy beats speed: careful answers win over fast guessing", () => {
  const track = R.trackOf(1, 0);
  const careful = R.replay(track, 7, player(track, 7, 0.9, 3000));
  const guesser = R.replay(track, 7, player(track, 7, 0.25, 950));
  const idle = R.replay(track, 7, []);
  assert.ok(careful.finishedAt < idle.finishedAt);
  assert.ok(careful.finishedAt < guesser.finishedAt, `${careful.finishedAt} vs ${guesser.finishedAt}`);
});

test("answers faster than the minimum think time are ignored", () => {
  const track = R.trackOf(1, 0);
  const spam = Array.from({ length: 300 }, (_, i) => ({ t: 100 * i, kind: "answer", choice: 0 }));
  const s = R.replay(track, 3, spam);
  assert.ok(s.q <= Math.ceil(s.finishedAt / R.MIN_THINK_MS) + 1);
});

test("replays are deterministic and rivals finish", () => {
  const track = R.trackOf(4, 3);
  assert.equal(track.boss, true);
  const ev = player(track, 11, 0.8, 2500);
  assert.equal(R.replay(track, 11, ev).finishedAt, R.replay(track, 11, ev).finishedAt);
  R.rivals(track, 11).forEach((rv, i) => assert.ok(R.replay(track, 11, R.rivalEvents(track, 11, rv, i)).finishedAt > 0));
  assert.equal(R.trackById("w4-t4").id, "w4-t4");
  assert.equal(R.trackById("w9-t1"), null);
});
