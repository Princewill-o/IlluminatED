import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const I = projectData("src/game/core/interview.ts");
const { ROLES } = projectData("src/game/core/roles.ts");
const { WORKPLACES } = projectData("src/game/core/careers.ts");

const best = (list) => list.reduce((b, a, i) => (a.marks > list[b].marks ? i : b), 0);
const worst = (list) => list.reduce((b, a, i) => (a.marks < list[b].marks ? i : b), 0);
function answer(iv, choose) {
  const out = [];
  for (const q of iv.questions) {
    if (q.star) out.push(choose(q.star.situation), choose(q.star.action), choose(q.star.result));
    else if (q.ask) out.push(choose(q.ask), -1);
    else if (q.task) out.push(choose === best ? (q.task.numeric ? q.task.answer : q.task.answer) : -1);
    else out.push(choose(q.answers));
  }
  return out;
}

test("interviews: every role and company has a full, seeded panel interview", () => {
  const specs = [...ROLES.map((r) => I.roleSpec(r)), ...WORKPLACES.map((w) => I.companySpec(w))];
  for (const spec of specs) {
    for (const seed of [1, 77, 123456]) {
      const iv = I.buildInterviewPlan(spec, seed);
      assert.equal(iv.panel.length, 2, spec.key);
      assert.notEqual(iv.panel[0].name, iv.panel[1].name);
      assert.ok(iv.questions.some((q) => q.star), `${spec.key}: has STAR questions`);
      assert.ok(iv.questions.some((q) => q.stage === "technical"), `${spec.key}: has job knowledge`);
      assert.equal(iv.questions.at(-1).stage, "close");
      if (spec.kind === "company") assert.ok(iv.questions.some((q) => q.task), `${spec.key}: has a technical exercise`);
      // The server rebuilds exactly the same interview from the seed.
      assert.deepEqual(JSON.stringify(I.buildInterviewPlan(spec, seed)), JSON.stringify(iv));
      const good = I.scoreInterview(iv, answer(iv, best));
      assert.ok(good.passed, `${spec.key}: best answers pass`);
      assert.ok(good.scores.every((s) => s.score === 7));
      const bad = I.scoreInterview(iv, answer(iv, worst));
      assert.ok(!bad.passed, `${spec.key}: poor answers fail`);
      assert.equal(I.answerCount(iv), answer(iv, best).length);
      for (const q of iv.questions) for (const list of [q.answers, q.ask, q.star?.situation, q.star?.action, q.star?.result].filter(Boolean))
        assert.ok(list.some((a) => a.marks === 3), `${spec.key}/${q.id}: has a strong answer`);
    }
  }
});

test("interviews: Civil Service benchmark (4+ everywhere, or one 3 with the rest 5+)", () => {
  const iv = I.buildInterviewPlan(I.roleSpec(ROLES[0]), 5);
  const flat = answer(iv, best);
  // Blank answers score nothing.
  assert.ok(!I.scoreInterview(iv, flat.map(() => -1)).passed);
  // Junk input never throws.
  assert.ok(!I.scoreInterview(iv, ["x", 99, -5]).passed);
});

test("interviews: the panel you're told about at reception is the panel that interviews you", () => {
  for (const r of ROLES) {
    const spec = I.roleSpec(r);
    const a = I.buildInterviewPlan(spec, 7), b = I.buildInterviewPlan(spec, 99999);
    assert.deepEqual(a.panel, b.panel, r.id);
    assert.equal(a.receptionist, b.receptionist);
    assert.ok(spec.employer && !/tills|aisles|streets|\(/i.test(spec.employer), `${r.id}: has a real employer name`);
  }
});
