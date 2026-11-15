import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const { ADDITIONAL_ROLE_CONTRACTS: roles } = projectData(
  "src/lib/illum-world/additional-role-content.ts",
);
const { contractMinutes, markContract } = projectData(
  "src/lib/illum-world/role-contracts.ts",
);

test("the additional role catalogue covers distinct workplaces and has public references", () => {
  assert.ok(roles.length >= 7);
  assert.equal(new Set(roles.map((role) => role.id)).size, roles.length);
  assert.equal(
    new Set(roles.map((role) => role.workplaceId)).size,
    roles.length,
  );
  for (const role of roles) {
    assert.match(role.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(role.skills.length >= 3);
    assert.ok(role.sources.length > 0, role.id);
    for (const source of role.sources) {
      assert.equal(new URL(source.url).protocol, "https:", role.id);
      assert.match(source.checked, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

test("additional role courses are short and certify only after every original check passes", () => {
  for (const role of roles) {
    assert.equal(role.shifts.length, 3, role.id);
    assert.ok(
      contractMinutes(role) >= 24 && contractMinutes(role) <= 30,
      role.id,
    );
    assert.equal(
      new Set(role.shifts.map((shift) => shift.id)).size,
      3,
      role.id,
    );
    const responses = Object.fromEntries(
      role.shifts.map((shift) => [
        shift.id,
        shift.questions.map((q) => q.answer),
      ]),
    );
    for (const shift of role.shifts) {
      assert.equal(shift.questions.length, 3, `${role.id}/${shift.id}`);
      assert.ok(shift.steps.length >= 3 && shift.example.length >= 40);
      for (const question of shift.questions) {
        assert.equal(new Set(question.options).size, question.options.length);
        assert.ok(
          question.options[question.answer] &&
            question.explanation.length >= 30,
        );
      }
    }
    assert.equal(markContract(role, responses).complete, true, role.id);
    delete responses[role.shifts.at(-1).id];
    assert.equal(markContract(role, responses).complete, false, role.id);
  }
});
