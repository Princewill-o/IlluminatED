import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import ts from "typescript";

import { projectData } from "../scripts/lib/project-data.mjs";

const {
  REPAIR_DEVICES,
  emptyRepairAnswers,
  normaliseRepairAnswers,
  markRepairCalculations,
  repairProfit,
  repairSubmissionErrors,
} = projectData("src/lib/illum-world/repair.ts");

test("repair scenarios expose a defensible risk decision and correctly include losses", () => {
  assert.equal(repairProfit(80, 45, 155), 30);
  assert.equal(repairProfit(65, 100, 150), -15);
  assert.equal(REPAIR_DEVICES[0].expectedProfit - 25, 5);
  for (const d of REPAIR_DEVICES)
    assert.equal(
      repairProfit(d.acquisition, d.repair, d.resale),
      d.expectedProfit,
    );
});
test("blank, malformed and partial calculations cannot be marked as correct", () => {
  const blank = emptyRepairAnswers();
  assert.equal(
    markRepairCalculations(blank).filter((x) => x.correct).length,
    0,
  );
  blank.devices[0].profit = "30junk";
  blank.devices[1].profit = "40.000";
  blank.devices[2].profit = "-15";
  assert.equal(
    markRepairCalculations(blank).filter((x) => x.correct).length,
    1,
  );
});
test("submission requires each decision, evidence-based written reasoning and a report", () => {
  const answers = emptyRepairAnswers();
  assert.equal(repairSubmissionErrors(answers).length, 10);
  for (const [i, answer] of answers.devices.entries()) {
    answer.profit = String(REPAIR_DEVICES[i].expectedProfit);
    answer.decision = "decline";
    answer.reason =
      "I considered the inspection evidence and the expected profit before choosing to decline.";
  }
  answers.report =
    "The inspection shows a cracked display. The battery result is uncertain, so a standardised battery test is needed before agreeing a repair.";
  assert.equal(repairSubmissionErrors(answers).length, 0);
  assert.equal(
    markRepairCalculations(answers).filter((x) => x.correct).length,
    3,
  );
});
test("normalisation preserves only known device identities and caps untrusted text", () => {
  const result = normaliseRepairAnswers({
    devices: [
      {
        id: "raven-r4",
        decision: "approve-certificate",
        profit: "30",
        reason: "x".repeat(3000),
      },
      { id: "invented", profit: "9000" },
    ],
    reportDevice: "invented",
    report: "x".repeat(5000),
    approved: true,
  });
  assert.equal(result.devices.length, 3);
  assert.equal(result.devices[0].decision, "");
  assert.equal(result.devices[0].reason.length, 1200);
  assert.equal(result.report.length, 2400);
  assert.equal(result.reportDevice, REPAIR_DEVICES[0].id);
  assert.equal(result.approved, undefined);
});
test("PDF generator rejects certificates for unapproved work and produces a single-page marked sample", async () => {
  const exports = {};
  const require = createRequire(import.meta.url);
  const pdfLib = require("pdf-lib");
  const source = ts.transpileModule(
    fs.readFileSync("src/lib/illum-world/pdf.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  new Function("exports", "require", source)(exports, (name) =>
    name === "./repair"
      ? projectData("src/lib/illum-world/repair.ts")
      : require(name),
  );
  await assert.rejects(
    exports.makeCertificatePdf(null, "Test learner"),
    /approval/,
  );
  await assert.rejects(
    exports.makeCertificatePdf({ status: "submitted" }, "Test learner"),
    /approval/,
  );
  const sample = await exports.makeCertificatePdf(
    null,
    "[Learner username]",
    true,
  );
  const pdf = await pdfLib.PDFDocument.load(sample);
  assert.equal(pdf.getPageCount(), 1);
  assert.match(pdf.getTitle(), /SAMPLE/);
  const answers = emptyRepairAnswers();
  answers.report = "A long report with a longword".repeat(300);
  const project = {
    id: "12345678-1234-1234-1234-123456789abc",
    status: "submitted",
    score: 3,
    revision: 1,
    submitted_at: "2026-11-14T12:00:00Z",
    answers,
  };
  const projectPdf = await pdfLib.PDFDocument.load(
    await exports.makeProjectPdf(project, "Test learner"),
  );
  assert.ok(
    projectPdf.getPageCount() > 2,
    "Long reports paginate instead of clipping",
  );
});

test("city entry lists joined-class repair assignments without choosing one silently", async () => {
  const data = {
    class_members: [
      { class_id: "joined-class", user_id: "learner" },
      { class_id: "another-class", user_id: "someone-else" },
    ],
    classes: [
      { id: "joined-class", name: "10A Careers" },
      { id: "teacher-owned-only", name: "Not joined" },
    ],
    learning_assignments: [
      {
        id: "right-assignment",
        class_id: "joined-class",
        product: "world",
        resource_slug: "tech-repair-trainee",
        title: "Repair lesson",
        due_at: null,
      },
      {
        id: "wrong-product",
        class_id: "joined-class",
        product: "maths",
        resource_slug: "percentages",
        title: "Maths",
      },
      {
        id: "teacher-visible-but-not-member",
        class_id: "teacher-owned-only",
        product: "world",
        resource_slug: "tech-repair-trainee",
        title: "Other class",
      },
    ],
  };
  const sb = {
    from(table) {
      let rows = data[table];
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          rows = rows.filter((row) => row[key] === value);
          return query;
        },
        in(key, values) {
          rows = rows.filter((row) => values.includes(row[key]));
          return query;
        },
        order() {
          return query;
        },
        limit(count) {
          rows = rows.slice(0, count);
          return query;
        },
        then(resolve) {
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
      };
      return query;
    },
  };
  const exports = {};
  const source = ts.transpileModule(
    fs.readFileSync("src/lib/illum-world/server.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  new Function("exports", "require", source)(exports, (name) =>
    name === "server-only" ? {} : { getSupabase: async () => sb },
  );
  const choices = await exports.loadMyRepairAssignments("learner");
  assert.equal(choices.error, false);
  assert.equal(choices.assignments.length, 1);
  assert.equal(choices.assignments[0].id, "right-assignment");
  assert.equal(choices.assignments[0].className, "10A Careers");
  const none = await exports.loadMyRepairAssignments("not-joined");
  assert.equal(none.assignments.length, 0);
});

test("navy-and-gold certificate stays one page, keeps the approval gate and labels pupil answers", async () => {
  const exports = {};
  const require = createRequire(import.meta.url);
  const pdfLib = require("pdf-lib");
  const repair = projectData("src/lib/illum-world/repair.ts");
  const source = ts.transpileModule(
    fs.readFileSync("src/lib/illum-world/pdf.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  new Function("exports", "require", source)(exports, (name) =>
    name === "./repair" ? repair : require(name),
  );
  const approved = {
    id: "3f2a9c1e-1234-4abc-9def-123456789abc",
    status: "approved",
    approved_at: "2026-11-14T12:00:00Z",
    assignment_id: "a1",
    revision: 2,
    score: 3,
  };
  // Independent practice can never be certified, even if marked approved.
  await assert.rejects(
    exports.makeCertificatePdf({ ...approved, assignment_id: null }, "Pupil"),
    /approval/,
  );
  for (const [learner, details] of [
    ["amara_k", { teacher: "ms_okafor", className: "10A Careers", assignmentTitle: "Repair lesson" }],
    ["x".repeat(60), {}],
  ]) {
    const pdf = await pdfLib.PDFDocument.load(
      await exports.makeCertificatePdf(approved, learner, false, details),
    );
    assert.equal(pdf.getPageCount(), 1);
    assert.doesNotMatch(pdf.getTitle(), /SAMPLE/);
    const { width, height } = pdf.getPage(0).getSize();
    assert.ok(width > height, "certificate is landscape");
  }
  assert.equal(exports.certificateId(approved.id), "IW-3F2A9C1E");
  const source2 = fs.readFileSync("src/lib/illum-world/pdf.ts", "utf8");
  assert.doesNotMatch(source2, /purple/, "the old purple palette is gone");
  // The scope disclaimer must remain on every awarded certificate.
  assert.match(source2, /Not an externally accredited qualification/);
  assert.equal(repair.decisionLabel("as-is"), "Acquire and sell as-is");
  assert.equal(repair.decisionLabel("approve-certificate"), "Not chosen");
  assert.equal(repair.signedPounds("-15"), "-£15.00");
  assert.equal(repair.signedPounds(""), "Not entered");
});
