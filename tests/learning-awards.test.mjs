import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const { awardsFor } = projectData("src/game/core/awards.ts");
const empty = {
  studySessions: 0,
  studyCorrect: 0,
  studiedCourses: 0,
  careerShifts: 0,
  careerCorrect: 0,
  careerTotal: 0,
  careerWorkplaces: 0,
};

test("a new learner sees attainable, locked awards with honest requirements", () => {
  const awards = awardsFor(empty);
  assert.equal(awards.length, 8);
  assert.equal(new Set(awards.map((award) => award.id)).size, awards.length);
  for (const award of awards) {
    assert.equal(award.earned, false);
    assert.equal(award.progress, 0);
    assert.ok(award.target > 0);
    assert.ok(award.description.length > 10);
    assert.ok(["study", "career"].includes(award.category));
  }
});

test("study awards unlock from completed sessions, correct answers and studied subjects", () => {
  const awards = awardsFor({
    ...empty,
    studySessions: 5,
    studyCorrect: 24,
    studiedCourses: 3,
  });
  assert.equal(awards.find((award) => award.id === "first-study").earned, true);
  assert.equal(
    awards.find((award) => award.id === "study-rhythm").earned,
    true,
  );
  assert.equal(
    awards.find((award) => award.id === "subject-explorer").earned,
    true,
  );
  const knowledge = awards.find((award) => award.id === "knowledge-builder");
  assert.equal(knowledge.earned, false);
  assert.equal(knowledge.progress, 24);
  assert.equal(knowledge.target, 25);
  assert.equal(
    awardsFor({ ...empty, studyCorrect: 25 }).find(
      (award) => award.id === "knowledge-builder",
    ).earned,
    true,
  );
  assert.equal(
    awards
      .filter((award) => award.category === "career")
      .some((award) => award.earned),
    false,
  );
});

test("career milestones use completed simulated work and do not unlock study awards", () => {
  const awards = awardsFor({
    ...empty,
    careerShifts: 5,
    careerCorrect: 25,
    careerTotal: 30,
    careerWorkplaces: 3,
  });
  assert.equal(
    awards
      .filter((award) => award.category === "career")
      .every((award) => award.earned),
    true,
  );
  assert.equal(
    awards
      .filter((award) => award.category === "study")
      .some((award) => award.earned),
    false,
  );
  for (const award of awards) assert.ok(award.progress <= award.target);
});

test("invalid counts cannot unlock awards or create broken progress bars", () => {
  const awards = awardsFor({
    studySessions: -2,
    studyCorrect: NaN,
    studiedCourses: Infinity,
    careerShifts: -1,
    careerCorrect: 100,
    careerTotal: 0,
    careerWorkplaces: 0,
  });
  for (const award of awards) {
    assert.equal(award.earned, false);
    assert.equal(award.progress, 0);
  }
  const fractional = awardsFor({ ...empty, studySessions: 0.9 });
  assert.equal(
    fractional.find((award) => award.id === "first-study").earned,
    false,
  );
});

test("earned progress remains capped even after many more sessions and shifts", () => {
  const awards = awardsFor(
    Object.fromEntries(Object.keys(empty).map((key) => [key, 500])),
  );
  for (const award of awards) {
    assert.equal(award.earned, true);
    assert.equal(award.progress, award.target);
  }
});
