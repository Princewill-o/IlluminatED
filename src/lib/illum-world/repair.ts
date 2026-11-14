export const MISSION_SLUG = "tech-repair-trainee";
export const MISSION_TITLE = "Tech Repair Trainee";
export const REPAIR_SKILLS = [
  "Calculate expected profit",
  "Interpret inspection evidence",
  "Justify a commercial decision",
  "Write an accurate customer condition report",
];

export interface RepairDevice {
  id: string;
  name: string;
  colour: string;
  condition: string;
  notes: string[];
  acquisition: number;
  repair: number;
  resale: number;
  asIs: number;
  uncertainty: string;
  expectedProfit: number;
}
/** Original fictional cases, not advice for repairing a real device. All prices exclude other costs. */
export const REPAIR_DEVICES: RepairDevice[] = [
  {
    id: "raven-r4",
    name: "Raven R4",
    colour: "#8b84f6",
    condition: "Cracked display; battery result uncertain",
    acquisition: 80,
    repair: 45,
    resale: 155,
    asIs: 95,
    expectedProfit: 30,
    notes: [
      "The screen is cracked across the lower right corner. Touch responds during a two-minute test.",
      "The battery fell from 65% to 58% during a 15-minute inspection. No standardised battery test has been completed.",
      "The £45 quote covers the display only. A confirmed battery fault would add £30. The shop requires at least £25 expected profit.",
    ],
    uncertainty:
      "A suspected battery fault is a hypothesis. A further £30 repair would remove the £5 buffer above the shop's £25 target.",
  },
  {
    id: "kite-k2",
    name: "Kite K2",
    colour: "#41bda6",
    condition: "Charging socket loose; other checks passed",
    acquisition: 45,
    repair: 25,
    resale: 110,
    asIs: 60,
    expectedProfit: 40,
    notes: [
      "The charging plug disconnects when gently moved. A visual inspection shows a loose socket.",
      "Display, speaker, camera and buttons passed the listed inspection checks. Battery capacity measured 88% of its original capacity.",
      "The £25 quote includes the socket repair and a repeat test. No additional faults were observed during this inspection.",
    ],
    uncertainty:
      "The inspection supports the socket diagnosis. It does not guarantee that the device will never develop another fault.",
  },
  {
    id: "ember-e3",
    name: "Ember E3",
    colour: "#f3a66f",
    condition: "Liquid indicator changed; fails to power on",
    acquisition: 65,
    repair: 100,
    resale: 150,
    asIs: 35,
    expectedProfit: -15,
    notes: [
      "The liquid contact indicator has changed colour. The phone does not power on with the test charger.",
      "The £100 quote is for an initial board repair, with no guaranteed fix. Data recovery is not included.",
      "The expected resale price is £150 only if a full repair succeeds. Selling as-is would return £35 before other costs.",
    ],
    uncertainty:
      "Both repair and as-is options lose money at the offered acquisition price. Declining avoids taking on this loss; explain the evidence.",
  },
];

export type RepairDecision = "" | "repair" | "as-is" | "decline";
export interface DeviceAnswer {
  id: string;
  profit: string;
  decision: RepairDecision;
  reason: string;
}
export interface RepairAnswers {
  devices: DeviceAnswer[];
  reportDevice: string;
  report: string;
}
export type ProjectStatus =
  "draft" | "submitted" | "changes_requested" | "approved";
export interface RepairProject {
  id: string;
  user_id: string;
  assignment_id: string | null;
  mission_slug: string;
  answers: RepairAnswers;
  status: ProjectStatus;
  score: number;
  feedback: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  /** Set by the database when a class teacher reviews the project. */
  reviewed_by?: string | null;
  updated_at: string;
  revision: number;
}
export const emptyRepairAnswers = (): RepairAnswers => ({
  devices: REPAIR_DEVICES.map((d) => ({
    id: d.id,
    profit: "",
    decision: "",
    reason: "",
  })),
  reportDevice: REPAIR_DEVICES[0].id,
  report: "",
});

export function normaliseRepairAnswers(value: unknown): RepairAnswers {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const devices = Array.isArray(raw.devices) ? raw.devices : [];
  return {
    devices: REPAIR_DEVICES.map((d) => {
      const a = devices.find(
        (item) => item && typeof item === "object" && item.id === d.id,
      ) as Record<string, unknown> | undefined;
      const decision = String(a?.decision ?? "");
      return {
        id: d.id,
        profit: String(a?.profit ?? "").slice(0, 12),
        decision: ["repair", "as-is", "decline"].includes(decision)
          ? (decision as RepairDecision)
          : "",
        reason: String(a?.reason ?? "").slice(0, 1200),
      };
    }),
    reportDevice: REPAIR_DEVICES.some((d) => d.id === raw.reportDevice)
      ? String(raw.reportDevice)
      : REPAIR_DEVICES[0].id,
    report: String(raw.report ?? "").slice(0, 2400),
  };
}

export function repairProfit(
  acquisition: number,
  repair: number,
  resale: number,
) {
  return Math.round((resale - acquisition - repair) * 100) / 100;
}
export function markRepairCalculations(answers: RepairAnswers) {
  return REPAIR_DEVICES.map((device) => {
    const answer = answers.devices.find((a) => a.id === device.id);
    const valid = Boolean(
      answer && /^-?\d{1,6}(\.\d{1,2})?$/.test(answer.profit.trim()),
    );
    return {
      id: device.id,
      correct:
        valid &&
        Math.abs(Number(answer!.profit) - device.expectedProfit) < 0.005,
      expected: device.expectedProfit,
      explanation: `£${device.resale} − £${device.acquisition} − £${device.repair} = £${device.expectedProfit} before other costs.`,
    };
  });
}

export function repairSubmissionErrors(answers: RepairAnswers): string[] {
  const errors: string[] = [];
  for (const device of REPAIR_DEVICES) {
    const answer = answers.devices.find((a) => a.id === device.id);
    if (!answer || !/^-?\d{1,6}(\.\d{1,2})?$/.test(answer.profit.trim()))
      errors.push(`Enter an expected profit for ${device.name}.`);
    if (!answer?.decision)
      errors.push(`Choose a recommendation for ${device.name}.`);
    if (!answer || answer.reason.trim().length < 40)
      errors.push(
        `Explain ${device.name}'s recommendation using evidence (at least 40 characters).`,
      );
  }
  if (answers.report.trim().length < 100)
    errors.push(
      "Write a customer condition report of at least 100 characters.",
    );
  return errors;
}

export const pounds = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(n);
/** Pupil- and teacher-facing wording for a stored recommendation code. */
export const decisionLabel = (decision: string | null | undefined) =>
  ({
    repair: "Acquire and repair",
    "as-is": "Acquire and sell as-is",
    decline: "Decline the device",
  })[decision ?? ""] ?? "Not chosen";
/** A signed amount in pounds as pupils write it: £30, -£15. */
export const signedPounds = (value: string | number | null | undefined) => {
  const text = String(value ?? "").trim();
  if (!/^-?\d{1,6}(\.\d{1,2})?$/.test(text)) return text ? `£${text}` : "Not entered";
  return pounds(Number(text));
};
export const projectStatusLabel = (status: ProjectStatus) =>
  ({
    draft: "In progress",
    submitted: "Submitted for review",
    changes_requested: "Changes requested",
    approved: "Teacher approved",
  })[status];
