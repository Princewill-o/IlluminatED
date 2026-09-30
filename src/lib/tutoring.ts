export type HelpType = "homework" | "coursework" | "exam-prep" | "one-to-one";
export type Speed = "flexible" | "priority" | "urgent";

export const HELP_TYPES: {
  id: HelpType;
  label: string;
  description: string;
}[] = [
  {
    id: "homework",
    label: "Homework help",
    description:
      "A tutor works through a question or task with you in messages, so you understand the method.",
  },
  {
    id: "coursework",
    label: "Coursework guidance",
    description:
      "Advice on planning, research and structure. Tutors won't write or correct assessed work for you.",
  },
  {
    id: "exam-prep",
    label: "Exam preparation",
    description:
      "Target weak topics, practise exam questions and go through mark schemes together.",
  },
  {
    id: "one-to-one",
    label: "One-to-one session",
    description:
      "A one-hour live session with a tutor on the topic you choose.",
  },
];

export const SPEEDS: {
  id: Speed;
  label: string;
  summary: string;
}[] = [
  {
    id: "flexible",
    label: "Flexible",
    summary: "Good when your deadline is a week or more away.",
  },
  {
    id: "priority",
    label: "Priority",
    summary: "For work due in the next few days.",
  },
  {
    id: "urgent",
    label: "Urgent",
    summary:
      "For work due today or tomorrow. Tutors reply between 8am and 10pm.",
  },
];

export interface Price {
  helpType: HelpType;
  speed: Speed;
  pricePence: number;
  matchHours: number;
  replyHours: number;
}

/** Used only if the price table can't be loaded. The database is the source of truth. */
export const DEFAULT_PRICES: Price[] = (
  [
    ["homework", 1500, 2200, 3200],
    ["coursework", 2500, 3500, 4800],
    ["exam-prep", 2500, 3500, 4800],
    ["one-to-one", 3000, 4000, 5500],
  ] as const
).flatMap(([helpType, f, p, u]) => [
  {
    helpType,
    speed: "flexible",
    pricePence: f,
    matchHours: 72,
    replyHours: 48,
  },
  {
    helpType,
    speed: "priority",
    pricePence: p,
    matchHours: 24,
    replyHours: 12,
  },
  { helpType, speed: "urgent", pricePence: u, matchHours: 4, replyHours: 2 },
]);

export const formatPrice = (pence: number) =>
  pence % 100 === 0 ? `£${pence / 100}` : `£${(pence / 100).toFixed(2)}`;

export const hoursLabel = (h: number) =>
  h < 24
    ? `${h} hour${h === 1 ? "" : "s"}`
    : `${h / 24} day${h === 24 ? "" : "s"}`;

export const helpLabel = (id: string) =>
  HELP_TYPES.find((h) => h.id === id)?.label ?? id;
export const speedLabel = (id: string) =>
  SPEEDS.find((s) => s.id === id)?.label ?? id;

export const STATUS_LABELS: Record<string, string> = {
  open: "Finding a tutor",
  matched: "Tutor assigned",
  completed: "Completed",
  cancelled: "Cancelled",
};
