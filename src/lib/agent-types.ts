/** Shapes the study agent returns (shared by the API route and the page). */
export type AgentCard =
  | { kind: "plan"; title: string; days: { day: string; items: { time: string; what: string; href?: string; minutes: number }[] }[] }
  | { kind: "quiz"; title: string; questions: { q: string; options: string[]; answer: number; explain: string; topic: string }[] }
  | { kind: "events"; title: string; events: { name: string; url: string; when: string; where: string; hackathon: boolean }[] }
  | { kind: "homework"; title: string; items: { title: string; due: string; href: string; done: boolean }[] };

export interface AgentReply {
  skill: "plan" | "quiz" | "events" | "homework" | "chat";
  text: string;
  cards: AgentCard[];
  /** Small tool badges shown under the reply ("Homework", "Question bank"...). */
  used: string[];
}

