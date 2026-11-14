import { findSubjectPack } from "./packs";

const profit = findSubjectPack("maths", "profit-financial-maths")!;
const inspection = findSubjectPack("science", "inspection-evidence")!;
const report = findSubjectPack("english", "condition-report")!;

/** The mission sidebar and public subject resources share the same original guidance. */
export const MISSION_HELP = [
  { id: "maths" as const, title: "Calculate profit", href: "/maths/profit-financial-maths#worked-example", paragraphs: [profit.explanation[0], ...profit.workedExample.steps] },
  { id: "science" as const, title: "Use inspection evidence", href: "/science/inspection-evidence", paragraphs: inspection.explanation },
  { id: "english" as const, title: "Write a condition report", href: "/english/condition-report", paragraphs: report.explanation },
];
