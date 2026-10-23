import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const L = projectData("src/game/core/life-story.ts");

/** Play a whole life with simple choices; returns the person. */
function play(seed, plan = {}) {
  const p = L.newLife(seed, { whatIf: plan.whatIf ?? null });
  for (let year = 0; year < 120 && p.alive; year++) {
    if (p.pending) L.choose(p, 0);
    const d = L.decisionFor(p);
    if (d) L.decide(p, d.kind === "route" ? (plan.route ?? "a-levels") : (d.options.find((o) => o.ok && o.id === plan.degree)?.id ?? "none"));
    while (p.actions > 0) {
      if (p.age >= 21 && plan.career && p.career !== plan.career && L.careerById(plan.career).needs(p) === null) { L.applyFor(p, plan.career); continue; }
      L.doActivity(p, p.age < 18 ? (p.actions % 2 ? "study" : "hobby") : "save", plan.hobby ?? "debate");
    }
    if (p.pending) L.choose(p, 0);
    L.ageUp(p);
  }
  return p;
}

test("a life always ends peacefully in old age and is reproducible", () => {
  for (let s = 1; s <= 30; s++) {
    const p = play(s);
    assert.equal(p.alive, false, `seed ${s}`);
    assert.ok(p.age >= 70 && p.age <= 105, `seed ${s} age ${p.age}`);
    assert.match(p.log.at(-1).text, /peaceful/);
  }
  assert.deepEqual(play(7).log, play(7).log);
});

test("the Prime Minister career ladder can be climbed", () => {
  const reached = Array.from({ length: 40 }, (_, i) => play(100 + i, { career: "pm", hobby: "debate" })).some((p) => p.achievements.includes("pm"));
  assert.ok(reached);
});

test("careers check their requirements", () => {
  const p = L.newLife(3);
  p.age = 22; p.actions = 2;
  assert.equal(L.applyFor(p, "surgeon").ok, false);
  assert.match(L.applyFor(p, "surgeon").text, /medicine/i);
});

test("what-if scenarios change the start", () => {
  assert.equal(L.newLife(5, { whatIf: "genius" }).stats.smarts, 95);
  const rich = play(9, { whatIf: "lottery" });
  assert.ok(rich.log.some((l) => l.text.includes("£1,000,000")));
});

test("lives continue through the generations", () => {
  const p = play(11);
  const child = L.continueAs(p, "Robin", 99);
  assert.equal(child.gen, 2);
  assert.equal(child.last, p.last);
  assert.equal(child.first, "Robin");
});

test("save and load keeps a pending event", () => {
  const p = L.newLife(4);
  for (let i = 0; i < 12 && !p.pending; i++) L.ageUp(p);
  const back = L.restore(L.serialise(p));
  assert.equal(back.age, p.age);
  assert.equal(back.pending?.id, p.pending?.id);
});

test("there's a weekly challenge every week", () => {
  const a = L.weeklyChallenge(new Date("2026-10-19T12:00:00Z")), b = L.weeklyChallenge(new Date("2026-10-23T12:00:00Z"));
  assert.equal(a.id, b.id);
  assert.ok(L.WEEKLY_CHALLENGES.some((c) => c.id === a.id));
});
