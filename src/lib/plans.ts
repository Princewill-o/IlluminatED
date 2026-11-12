/**
 * One description of what each plan costs and what it unlocks, used by the
 * homepage, /pricing and the upgrade prompts. Paid prices must match the Stripe
 * prices checked at checkout (src/lib/premium-actions.ts). Only list what the
 * code actually unlocks today; anything planned goes in PLAN_ROADMAP.
 */
export type PlanId = "free" | "plus" | "plus_experience" | "schools";

export interface Plan {
  id: PlanId;
  name: string;
  /** Who it is for, in a few words. */
  forWho: string;
  /** The one-line answer to "what am I paying for?". */
  promise: string;
  monthly: string;
  yearly?: string;
  note: string;
  /** What this plan adds (paid plans list only what they add on top of the plan before). */
  includes: string[];
}

export const PLAN_PROMISE = "Revision students actually choose to open. The city is the reward.";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    forWho: "Every student",
    promise: "All the revision tools, free for good.",
    monthly: "£0",
    note: "No card needed",
    includes: [
      "Every course, quiz and flashcard set",
      "Revision planner, grade calculator and progress by topic",
      "The 3D city: earn Clout for right answers and spend it on your look",
      "Season Pass free track",
      "Ask Tiggy: 15 messages to try it",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    forWho: "Students revising for exams",
    promise: "A study helper whenever you're stuck.",
    monthly: "£5.99",
    yearly: "£59.90",
    note: "or £59.90 a year (2 months free). Cancel any time.",
    includes: [
      "Ask Tiggy up to 200 messages a day",
      "Full worked solutions and longer explanations",
      "A stronger AI model that remembers more of your chat",
      "No adverts in the game",
      "Season Pass premium track and exotic companions",
      "Build your own player world for friends",
    ],
  },
  {
    id: "plus_experience",
    name: "Plus+ Experience",
    forWho: "Students thinking about careers",
    promise: "Everything in Plus, plus practice at the world of work.",
    monthly: "£12.99",
    yearly: "£129.90",
    note: "7-day free trial, then £12.99 a month or £129.90 a year.",
    includes: [
      "Everything in Plus",
      "Simulated interviews and work shifts in the Career District",
      "Completion records for eligible activities",
    ],
  },
  {
    id: "schools",
    name: "Schools & colleges",
    forWho: "Teachers and heads of year",
    promise: "Homework students do, and progress you can see.",
    monthly: "Paid pilot",
    note: "One term, priced per school. Pilots from £99 a month.",
    includes: [
      "Teacher workspace: classes, homework quests and auto-marking",
      "Class progress and topic gaps",
      "Learner seats and onboarding for your classes",
      "Data protection and safeguarding pack before you sign",
    ],
  },
];

/** Planned for paid plans. Shown as "coming next", never as included. */
export const PLAN_ROADMAP = ["Timed mock papers by exam board", "A weekly progress email for parents"];

export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;
