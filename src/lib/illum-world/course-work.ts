import type { RoleContract } from "./role-contracts";
import profiles from "./sector-profiles.json";

export type CourseWork = {
  decisions: Record<string, string>;
  total: string;
  owner: string;
  handover: string;
};
const rules = {
  accept: "All required evidence is present and matches the approved brief.",
  hold: "A required field is missing. Request the missing information before processing.",
  escalate: "The supplied evidence conflicts with the approved brief. Refer it to the supervisor.",
};
export function courseWork(course: RoleContract) {
  const sector = profiles.find(item => course.workplaceId === `training-${item.id}`);
  const label = sector?.artifact ?? `${course.skills[0].toLowerCase()} work items`;
  const seed = Array.from(course.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rows = [
    { id: "R1", item: `${label} · first request`, evidence: rules.accept, units: seed % 9 + 2, expected: "accept" },
    { id: "R2", item: `${label} · incomplete request`, evidence: rules.hold, units: seed % 5 + 1, expected: "hold" },
    { id: "R3", item: `${label} · conflicting request`, evidence: rules.escalate, units: seed % 7 + 3, expected: "escalate" },
    { id: "R4", item: `${label} · verified follow-up`, evidence: rules.accept, units: seed % 6 + 4, expected: "accept" },
  ].sort((a, b) => ((a.id.charCodeAt(1) + seed) % 4) - ((b.id.charCodeAt(1) + seed) % 4));
  return {
    title: `${course.title} · work queue and handover`,
    brief: `You work in the simulated ${course.workplace} team. Review each supplied work item, assign its next action, calculate the workload that can proceed, then write a handover to the supervisor. These are fictional records for this exercise.`,
    rows,
    total: rows.filter(row => row.expected === "accept").reduce((sum, row) => sum + row.units, 0),
    action: sector?.action ?? course.shifts[0].steps[0],
    version: 1,
  };
}
export function assessCourseWork(course: RoleContract, raw: unknown) {
  const work = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Partial<CourseWork> : {};
  const task = courseWork(course);
  const decisions = task.rows.every(row => work.decisions?.[row.id] === row.expected);
  const total = typeof work.total === "string" && /^\d+$/.test(work.total.trim()) && Number(work.total) === task.total;
  const owner = typeof work.owner === "string" && work.owner.trim().length >= 3 && work.owner.length <= 100;
  const handover = typeof work.handover === "string" && work.handover.trim().length >= 80 &&
    work.handover.length <= 2000 && /\bR2\b/i.test(work.handover) && /\bR3\b/i.test(work.handover);
  return {
    complete: decisions && total && owner && handover,
    feedback: [
      decisions ? "All four work-item decisions match the supplied evidence." : "Review the missing information and conflicting evidence before deciding.",
      total ? "The accepted workload total is correct." : "Add only the units belonging to accepted items.",
      owner ? "A handover owner is recorded." : "Name the supervisor or team responsible for the next action.",
      handover ? "The handover meets the length and exception-reference checks." : "Write at least 80 characters and refer to both R2 and R3. Explain the next actions.",
    ],
  };
}
