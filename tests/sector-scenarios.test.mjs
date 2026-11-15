import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";
const { SECTOR_CONTRACTS, TRAINING_SECTORS } = projectData("src/lib/illum-world/sector-contracts.ts");
const { markContract } = projectData("src/lib/illum-world/role-contracts.ts");
const { workplaceMap, blocked } = projectData("src/game/core/world.ts");
const { logoFor } = projectData("src/game/core/logos.ts");
test("every sector scenario can be entered, assessed and certified after all checks pass", () => {
  assert.equal(TRAINING_SECTORS.length, 28);
  assert.equal(SECTOR_CONTRACTS.length, 336);
  assert.equal(new Set(SECTOR_CONTRACTS.map(c => c.id)).size,336);
  for (const course of SECTOR_CONTRACTS) {
    const map = workplaceMap(course.workplaceId);
    assert.ok(map,course.id);
    assert.ok(!blocked(map,map.spawn.x,map.spawn.y),course.id);
    assert.ok(logoFor(course.workplaceId),course.id);
    assert.equal(course.shifts.length,3);
    const answers = Object.fromEntries(course.shifts.map(shift => {
      assert.equal(shift.questions.length,3);
      assert.equal(shift.questions.every(q => q.options.length===3 && new Set(q.options).size===3),true);
      return [shift.id,shift.questions.map(q => q.answer)];
    }));
    assert.equal(markContract(course,answers).complete,true);
    answers.review[0] = (answers.review[0]+1)%3;
    assert.equal(markContract(course,answers).complete,false);
  }
});
