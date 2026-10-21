import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const { markAnswer } = projectData("src/lib/question-marking.ts");
const rows = fs.readFileSync("data/question-bank/questions.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

test("The question bank file is complete and every item carries its source and review status", () => {
  assert.equal(rows.length, 3344);
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
  for (const r of rows) {
    assert.ok(["GCSE", "A-level"].includes(r.level), r.id);
    assert.ok(r.question && r.answer !== undefined && r.source && r.licence && r.review_status, r.id);
    assert.equal(r.official_past_paper, false, `${r.id} is not presented as a past paper`);
  }
});

test("Auto-marked answers accept themselves, equivalent numbers, units and reordered roots", () => {
  for (const r of rows.filter((x) => x.question_type === "short_answer" || x.question_type === "calculation"))
    assert.ok(markAnswer(String(r.answer), String(r.answer)), `${r.id}: ${r.answer}`);
  assert.ok(markAnswer("15 cm", "15"));
  assert.ok(markAnswer("x = 1", "1"));
  assert.ok(markAnswer("8, -11", "-11, 8"));
  assert.ok(markAnswer("0.5", "1/2"));
  assert.ok(markAnswer("3X + 69", "3x + 69"));
  assert.ok(markAnswer("Mitochondria", "mitochondria"));
  assert.ok(!markAnswer("mitochondri", "mitochondria"));
  assert.ok(!markAnswer("16", "15"));
  assert.ok(!markAnswer("", "15"));
});
