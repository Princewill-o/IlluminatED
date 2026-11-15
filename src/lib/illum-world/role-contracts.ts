import { ADDITIONAL_ROLE_CONTRACTS } from "./additional-role-content";
import { SECTOR_CONTRACTS } from "./sector-contracts";

import { companyById } from "@/game/core/companies";

export type ContractQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};
export type ContractShift = {
  id: string;
  title: string;
  minutes: number;
  brief: string;
  steps: string[];
  example: string;
  questions: ContractQuestion[];
};
export type RoleContract = {
  id: string;
  title: string;
  workplace: string;
  workplaceId: string;
  summary: string;
  skills: string[];
  sources: { title: string; provider: string; url: string; checked: string }[];
  shifts: ContractShift[];
};
const source = (
  title: string,
  slug: string,
  kind = "professional-certificates",
) => ({
  title,
  provider: "Microsoft",
  url: `https://www.coursera.org/${kind}/${slug}`,
  checked: "2026-11-15",
});
const microsoftWorkplace = {
  workplaceId: "macrosoft",
  workplace: companyById("macrosoft")?.name ?? "Microsoft",
};

/** Short, original in-game learning mapped to public occupational and course references. */
export const ROLE_CONTRACTS: RoleContract[] = [
  {
    id: "data-analyst",
    title: "Data Analyst",
    ...microsoftWorkplace,
    summary:
      "Turn a fictional city shop’s sales into a clear, honest decision. Clean a small table, compare profit and brief your in-game manager.",
    skills: [
      "Data quality",
      "Spreadsheet calculations",
      "Choosing a chart",
      "Evidence-based communication",
    ],
    sources: [
      source(
        "Microsoft Power BI Data Analyst",
        "microsoft-power-bi-data-analyst",
      ),
      source(
        "Microsoft Data Analysis with SQL, Excel & Power BI",
        "microsoft-data-analysis-sql-excel-powerbi",
        "specializations",
      ),
      source(
        "Data Analysis and Visualization with Power BI",
        "data-analysis-and-visualization-with-power-bi",
        "learn",
      ),
    ],
    shifts: [
      {
        id: "clean",
        title: "Shift 1 · Check the data",
        minutes: 8,
        brief:
          "The city shop’s export contains Monday, Tuesday and Wednesday sales. A repeated transaction ID has copied Tuesday’s row. Your first job is to protect the evidence.",
        steps: [
          "Read the brief before changing the file: one row should describe one day in this small practice table.",
          "Keep an unchanged copy. Check the transaction ID and all row values before deciding a row is an exact duplicate.",
          "Remove only the verified duplicate. Similar amounts on different IDs can be genuine transactions.",
          "Check the remaining units and missing values; report missing values rather than inventing them.",
        ],
        example:
          "The verified table is Monday: revenue £240, costs £150; Tuesday: £300, £180; Wednesday: £210, £160. The extra Tuesday row has the same ID and values, so it is a duplicate, not a second sale.",
        questions: [
          {
            prompt:
              "Two rows share the same transaction ID and every value. What should you do first?",
            options: [
              "Count both as separate sales",
              "Keep a copy and verify that the row is a duplicate",
              "Delete every row with a matching amount",
            ],
            answer: 1,
            explanation:
              "Verify identity and preserve the original before removing an exact duplicate. Equal amounts alone do not prove duplication.",
          },
          {
            prompt:
              "Wednesday’s cost is blank in a new file. What is the sound next step?",
            options: [
              "Replace it with zero",
              "Guess the nearest day’s cost",
              "Flag it and ask for the missing information",
            ],
            answer: 2,
            explanation:
              "A missing value is unknown, not zero. Flagging it keeps later calculations honest.",
          },
          {
            prompt: "Which practice protects the original evidence?",
            options: [
              "Keep an unchanged source copy",
              "Overwrite the only source file",
              "Remove unusual rows without checking",
            ],
            answer: 0,
            explanation:
              "An unchanged source copy lets you check and explain every cleaning decision.",
          },
        ],
      },
      {
        id: "compare",
        title: "Shift 2 · Make the comparison",
        minutes: 8,
        brief:
          "The manager needs to compare daily profit, not just sales. Use the verified three-day table.",
        steps: [
          "Define the measure: profit equals revenue minus all listed costs.",
          "Calculate each day separately using consistent currency units.",
          "Choose a bar chart for comparing days. Label the axis, units and the measure.",
          "Show a sensible baseline and avoid a dramatic scale that exaggerates a small difference.",
        ],
        example:
          "Monday £240 − £150 = £90. Tuesday £300 − £180 = £120. Wednesday £210 − £160 = £50. Total profit is £260 for this sample, assuming the listed costs are complete.",
        questions: [
          {
            prompt: "What is Tuesday’s profit?",
            options: ["£300", "£180", "£120"],
            answer: 2,
            explanation:
              "Subtract the listed costs from revenue: £300 − £180 = £120.",
          },
          {
            prompt: "What is the total profit for all three days?",
            options: ["£260", "£750", "£490"],
            answer: 0,
            explanation:
              "Add the daily profits: £90 + £120 + £50 = £260, assuming no unlisted costs.",
          },
          {
            prompt:
              "Which chart is a clear starting point for comparing daily profit?",
            options: [
              "An unlabelled pie chart",
              "A labelled bar chart, one bar per day",
              "A chart with the days hidden",
            ],
            answer: 1,
            explanation:
              "A labelled bar chart makes separate day-by-day amounts easy to compare.",
          },
        ],
      },
      {
        id: "brief",
        title: "Shift 3 · Tell the useful story",
        minutes: 8,
        brief:
          "Write the short handover your in-game manager needs: the finding, its limits and one next step.",
        steps: [
          "Start with the decision-relevant result, using the right measure.",
          "Name the sample: three recorded days, not the whole year.",
          "Separate an observation from a cause. This table does not show why Tuesday performed better.",
          "Recommend a check or next action and explain what extra evidence would help.",
        ],
        example:
          "“Tuesday had the highest recorded profit, £120, in this three-day sample. This does not show what caused the difference. Check more weeks and whether all costs were included before changing the shop’s plan.”",
        questions: [
          {
            prompt: "Which claim is supported by the table?",
            options: [
              "Tuesday had the highest recorded profit in the sample",
              "A new advert definitely caused Tuesday’s result",
              "Every Tuesday will make £120",
            ],
            answer: 0,
            explanation:
              "The sample supports a comparison of these recorded days. It cannot prove a cause or guarantee future profit.",
          },
          {
            prompt: "What limitation belongs in the handover?",
            options: [
              "The figures prove an annual trend",
              "Only three days and the listed costs were checked",
              "There are no possible missing costs",
            ],
            answer: 1,
            explanation:
              "State the small sample and cost assumptions so the manager can judge the finding appropriately.",
          },
          {
            prompt: "What is a useful next step?",
            options: [
              "Promise a guaranteed return",
              "Delete the weaker day",
              "Check a longer period and completeness of costs",
            ],
            answer: 2,
            explanation:
              "More representative records and complete costs help test whether the pattern is reliable.",
          },
        ],
      },
    ],
  },
  {
    id: "business-analyst",
    title: "Business Analyst",
    ...microsoftWorkplace,
    summary:
      "Help a fictional city service improve its booking process. Listen to users, define a measurable requirement and test the result.",
    skills: [
      "Understanding needs",
      "Prioritising requirements",
      "Acceptance criteria",
      "Testing and handover",
    ],
    sources: [
      source("Microsoft Business Analyst", "microsoft-business-analyst"),
      source(
        "Microsoft 365 Fundamentals",
        "microsoft-365-fundamentals",
        "specializations",
      ),
    ],
    shifts: [
      {
        id: "listen",
        title: "Shift 1 · Find the actual need",
        minutes: 8,
        brief:
          "A fictional booking desk receives repeat calls because customers cannot tell whether a booking was confirmed. Learn the problem before choosing a solution.",
        steps: [
          "Separate the customer’s goal from a preferred tool: they need to know their booking status.",
          "Ask both customers and staff about the steps, delays and repeated work.",
          "Record observed examples and distinguish them from assumptions.",
          "Use anonymised notes; do not copy real customer details into your practice work.",
        ],
        example:
          "Need: “A customer can tell whether their booking was accepted.” A suggested solution might be an email, but you should first check the users, constraints and accessible alternatives.",
        questions: [
          {
            prompt:
              "Which statement describes a need rather than a preselected solution?",
            options: [
              "Buy a new email platform",
              "Customers can tell whether their booking was confirmed",
              "Add five animated buttons",
            ],
            answer: 1,
            explanation:
              "A need describes the outcome for a user, leaving room to test different ways to meet it.",
          },
          {
            prompt: "Who should help explain the existing process?",
            options: [
              "Only the developer",
              "Only the most confident customer",
              "Customers and the staff who handle bookings",
            ],
            answer: 2,
            explanation:
              "Both groups see different parts of the process and can reveal overlooked constraints.",
          },
          {
            prompt: "Which notes are suitable for this practice?",
            options: [
              "Anonymised observations from the fictional case",
              "Real passwords from a customer",
              "Unnecessary personal customer records",
            ],
            answer: 0,
            explanation:
              "Use the fictional case and anonymised observations, keeping real personal data out of practice.",
          },
        ],
      },
      {
        id: "specify",
        title: "Shift 2 · Define what good looks like",
        minutes: 8,
        brief:
          "Turn the booking need into a small, testable change. Your team has time for one improvement.",
        steps: [
          "Write who needs what and why it matters.",
          "Choose a measurable acceptance criterion that the team can test.",
          "Prioritise the essential booking confirmation over decorative extras.",
          "Include failure and access needs: explain what happens when confirmation cannot be sent.",
        ],
        example:
          "“For this fictional pilot, at least 9 of 10 test bookings should show a clear confirmation within 60 seconds. Failed confirmations should show a useful next step.” The small test is a pilot, not proof of all future performance.",
        questions: [
          {
            prompt: "Which acceptance criterion can the team actually test?",
            options: [
              "Make it amazing",
              "Everyone will love it",
              "At least 9 of 10 test bookings show confirmation within 60 seconds",
            ],
            answer: 2,
            explanation:
              "A defined sample, observable result and time limit make the criterion testable.",
          },
          {
            prompt: "Which change should come first for the stated need?",
            options: [
              "A clear booking confirmation",
              "A decorative animated background",
              "A new colour for an unrelated page",
            ],
            answer: 0,
            explanation:
              "Prioritise the change that directly addresses the confirmed booking problem.",
          },
          {
            prompt: "What should happen when a confirmation fails?",
            options: [
              "Hide the failure",
              "Explain the status and give an accessible next step",
              "Pretend the booking succeeded",
            ],
            answer: 1,
            explanation:
              "Users need an honest status and a workable way to recover, including when the happy path fails.",
          },
        ],
      },
      {
        id: "test",
        title: "Shift 3 · Test, revise and hand over",
        minutes: 8,
        brief:
          "Eight of ten test bookings met the target. Decide whether the pilot is ready and what to report.",
        steps: [
          "Compare the observed result with the agreed criterion.",
          "Record the two failures rather than removing them to improve the result.",
          "Investigate, revise and retest with a suitable sample.",
          "Hand over the result, remaining limitations and next owner.",
        ],
        example:
          "8 out of 10 is 80%. The target is 9 out of 10, or 90%, so this run does not meet the criterion. Explain the two failures and propose a retest after the fix.",
        questions: [
          {
            prompt:
              "Eight of ten test bookings passed. What percentage is that?",
            options: ["8%", "80%", "90%"],
            answer: 1,
            explanation:
              "8 ÷ 10 × 100 = 80%, below the agreed 90% pilot target.",
          },
          {
            prompt: "How should you handle the two failures?",
            options: [
              "Omit them from the report",
              "Change the target after seeing the result",
              "Record them, investigate and retest the fix",
            ],
            answer: 2,
            explanation:
              "The failures are useful evidence. Keep the agreed target visible and test a proposed fix.",
          },
          {
            prompt: "Which handover is most useful?",
            options: [
              "State results, limitations and the next action/owner",
              "Only say “done”",
              "Guarantee the system will never fail",
            ],
            answer: 0,
            explanation:
              "A handover should let the next person understand the evidence and continue the work.",
          },
        ],
      },
    ],
  },
  {
    id: "cybersecurity-analyst",
    title: "Cybersecurity Analyst",
    ...microsoftWorkplace,
    summary:
      "Protect the fictional workplace. Assess a suspicious message, choose sensible access controls and write a clear incident handover.",
    skills: [
      "Phishing awareness",
      "Least privilege",
      "Multi-factor authentication",
      "Incident reporting",
    ],
    sources: [
      source(
        "Microsoft Cybersecurity Analyst",
        "microsoft-cybersecurity-analyst",
      ),
      source(
        "Microsoft IT Support Specialist",
        "microsoft-it-support-specialist",
      ),
    ],
    shifts: [
      {
        id: "message",
        title: "Shift 1 · Pause before the click",
        minutes: 9,
        brief:
          "Your in-game inbox contains an urgent message asking you to enter a password on an unfamiliar site. Decide what to do without opening the link.",
        steps: [
          "Treat urgency, unexpected password requests and mismatched domains as warning signs. A single sign is not a complete diagnosis.",
          "Do not use the message’s links, attachments or reply address to verify it.",
          "Use a known official contact or independently opened trusted service.",
          "Report through the fictional workplace’s security process. Never enter a real password in this activity.",
        ],
        example:
          "An email says “Your account closes in 10 minutes.” A safe response is to pause and verify using a known contact or manually opened trusted account page, not the email’s link.",
        questions: [
          {
            prompt:
              "What is the safest first response to the unfamiliar password link?",
            options: [
              "Enter your real password quickly",
              "Forward it to every friend",
              "Pause and verify through an independently trusted route",
            ],
            answer: 2,
            explanation:
              "An independent trusted route avoids relying on the potentially malicious message itself.",
          },
          {
            prompt: "What does urgent wording establish on its own?",
            options: [
              "A warning sign that needs checking",
              "Absolute proof that the sender is legitimate",
              "Permission to ignore normal checks",
            ],
            answer: 0,
            explanation:
              "Urgency is a warning sign, not proof by itself. Assess context and verify safely.",
          },
          {
            prompt:
              "Which password should you enter into this fictional activity?",
            options: [
              "Your school password",
              "No real password",
              "Your email password",
            ],
            answer: 1,
            explanation:
              "The activity uses fictional scenarios and never needs or requests a real password.",
          },
        ],
      },
      {
        id: "access",
        title: "Shift 2 · Give the right access",
        minutes: 9,
        brief:
          "A new in-game team member needs to view a weekly report. They do not need to change accounts or manage the system.",
        steps: [
          "Grant the least access needed for the actual task.",
          "Use individual accounts rather than sharing passwords.",
          "Use multi-factor authentication as an extra layer, not a guarantee against every attack.",
          "Review access when responsibilities change or a person leaves.",
        ],
        example:
          "A report viewer needs read-only report access. Giving administrator access would create unnecessary risk. The person should use their own account with the workplace’s approved authentication.",
        questions: [
          {
            prompt: "What access does the report viewer need?",
            options: [
              "Read-only report access",
              "Full administrator access",
              "Everyone else’s passwords",
            ],
            answer: 0,
            explanation:
              "Least privilege means granting the permissions needed for the task and no unnecessary extras.",
          },
          {
            prompt:
              "What is an accurate description of multi-factor authentication?",
            options: [
              "A guarantee that all attacks fail",
              "An additional layer of authentication",
              "A reason to share passwords",
            ],
            answer: 1,
            explanation:
              "MFA adds protection, but it does not remove the need for safe behaviour, patching and reporting.",
          },
          {
            prompt: "A worker leaves the team. What should happen to access?",
            options: [
              "Keep all access forever",
              "Share their login",
              "Review and remove access according to policy",
            ],
            answer: 2,
            explanation:
              "Review access promptly when duties or employment change, following the organisation’s process.",
          },
        ],
      },
      {
        id: "respond",
        title: "Shift 3 · Report the incident clearly",
        minutes: 9,
        brief:
          "The fictional team has reported a suspicious sign-in. You must create a useful handover without guessing who caused it.",
        steps: [
          "Record observed times, affected services and what was reported.",
          "Separate evidence from assumptions; an unfamiliar sign-in alone does not identify an attacker.",
          "Escalate through the approved incident process instead of investigating someone else’s account yourself.",
          "Keep sensitive details in approved systems and name the next action and owner.",
        ],
        example:
          "“At 09:20, the demo account showed an unexpected sign-in alert. The account owner reports not recognising it. This has been escalated to the security lead. The alert does not establish who accessed the account.”",
        questions: [
          {
            prompt: "Which detail is useful in an incident handover?",
            options: [
              "An invented attacker name",
              "Unrelated personal gossip",
              "Observed time, affected service and action taken",
            ],
            answer: 2,
            explanation:
              "Specific observations and actions let the next authorised person assess and continue the response.",
          },
          {
            prompt:
              "An unfamiliar sign-in alert proves which person was responsible.",
            options: ["True", "False"],
            answer: 1,
            explanation:
              "The alert is evidence to investigate, but it does not by itself identify the responsible person.",
          },
          {
            prompt:
              "What is an appropriate next step in this simulated workplace?",
            options: [
              "Escalate through the approved security process",
              "Try to break into someone else’s account",
              "Post private incident details publicly",
            ],
            answer: 0,
            explanation:
              "Escalate to the authorised team and keep incident details within the approved process.",
          },
        ],
      },
    ],
  },
  ...ADDITIONAL_ROLE_CONTRACTS,
  ...SECTOR_CONTRACTS,
];
export const roleContract = (id: string) =>
  ROLE_CONTRACTS.find((c) => c.id === id) ?? null;
export const roleContractHref = (course: RoleContract) =>
  `/games/world?map=workplace-${course.workplaceId}&contract=${course.id}`;
export const contractMinutes = (course: RoleContract) =>
  course.shifts.reduce((sum, s) => sum + s.minutes, 0);
export type ContractAnswers = Record<string, number[]>;
export function normaliseContractAnswers(
  course: RoleContract,
  value: unknown,
): ContractAnswers {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    course.shifts.map((s) => {
      const values = Array.isArray(input[s.id])
        ? (input[s.id] as unknown[])
        : [];
      return [
        s.id,
        s.questions.map((q, i) =>
          Number.isInteger(values[i]) &&
          typeof values[i] === "number" &&
          (values[i] as number) >= 0 &&
          (values[i] as number) < q.options.length
            ? (values[i] as number)
            : -1,
        ),
      ];
    }),
  );
}
export function markContract(course: RoleContract, value: unknown) {
  const answers = normaliseContractAnswers(course, value);
  const shifts = course.shifts.map((s) => {
    const checks = s.questions.map((q, i) => ({
      correct: answers[s.id][i] === q.answer,
      explanation: q.explanation,
    }));
    return {
      id: s.id,
      checks,
      correct: checks.filter((q) => q.correct).length,
      total: checks.length,
      complete: checks.every((q) => q.correct),
    };
  });
  return {
    shifts,
    correct: shifts.reduce((n, s) => n + s.correct, 0),
    total: shifts.reduce((n, s) => n + s.total, 0),
    complete: shifts.every((s) => s.complete),
  };
}
