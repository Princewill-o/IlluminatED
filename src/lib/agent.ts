import "server-only";

import type { LearnerDetails } from "@/lib/account/details";
import type { AgentCard, AgentReply } from "@/lib/agent-types";
import { courseById } from "@/lib/data/courses";
import { QUESTION_BANK, topicsForCourse } from "@/lib/data/topics";
import { techEvents } from "@/lib/events";
import type { HomeworkItem } from "@/lib/school/server";

/**
 * The IlluminatED study agent: it does things, not just chats. Each request is
 * routed to a skill that works over the learner's own data (homework, subjects,
 * exam date) and returns cards the app can act on: a week's revision plan, a
 * quiz on the right topics, opportunities to apply for. Anything open-ended
 * goes to the model (Ask Tiggy's safeguards and grounding apply).
 */

export type { AgentCard, AgentReply };

export function pickSkill(text: string): AgentReply["skill"] {
  const t = text.toLowerCase();
  if (/\b(plan|schedule|timetable|week|organis|organiz|revision plan)\b/.test(t)) return "plan";
  if (/\b(quiz|test me|practice|practise|questions?|flashcards?)\b/.test(t)) return "quiz";
  if (/\b(hackathon|event|meetup|internship|opportunit|networking)\b/.test(t)) return "events";
  if (/\b(homework|due|deadline|assignment)\b/.test(t)) return "homework";
  return "chat";
}

const day = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "Europe/London" });

/** Topics worth revising: homework topics first, then the learner's courses. */
function focusTopics(details: LearnerDetails | null, homework: HomeworkItem[], text: string) {
  const asked = text.toLowerCase();
  const fromHomework = homework.filter((h) => !h.mine).flatMap((h) => h.questions.map((q) => q.topic).filter((t): t is string => Boolean(t)));
  const fromCourses = (details?.subjects ?? []).flatMap((s) => {
    const c = courseById(s.courseId);
    return c ? topicsForCourse(c).map((t) => t.title) : [];
  });
  const all = [...new Set([...fromHomework, ...fromCourses])];
  const named = all.filter((t) => asked.includes(t.toLowerCase()) || t.toLowerCase().split(/\W+/).some((w) => w.length > 4 && asked.includes(w)));
  return named.length ? named : all;
}

export async function runSkill(skill: AgentReply["skill"], text: string, ctx: { name: string; details: LearnerDetails | null; homework: HomeworkItem[] }): Promise<AgentReply> {
  const { details, homework, name } = ctx;
  if (skill === "homework") {
    const items = homework.slice(0, 6).map((h) => ({ title: `${h.className}: ${h.title}`, due: day(new Date(h.dueAt)), href: `/homework/${h.id}`, done: Boolean(h.mine) }));
    const open = items.filter((i) => !i.done).length;
    return {
      skill,
      text: items.length ? `You've got ${open} piece${open === 1 ? "" : "s"} of homework still to hand in. Here's what's set:` : "Nothing set yet. Join your class with your teacher's code in Homework and it'll show up here.",
      cards: items.length ? [{ kind: "homework", title: "Your homework", items }] : [],
      used: ["Homework"],
    };
  }
  if (skill === "quiz") {
    const topics = focusTopics(details, homework, text);
    const pool = QUESTION_BANK.filter((q) => !topics.length || topics.includes(q.topicTitle));
    const picked = [...(pool.length ? pool : QUESTION_BANK)].sort(() => Math.random() - 0.5).slice(0, 5);
    return {
      skill,
      text: `Here's a 5-question quiz on ${[...new Set(picked.map((q) => q.topicTitle))].slice(0, 2).join(" and ")}. I'll explain each one as you go.`,
      cards: [{ kind: "quiz", title: "Quick quiz", questions: picked.map((q) => ({ q: q.q, options: q.options, answer: q.answer, explain: q.explain, topic: q.topicTitle })) }],
      used: ["Question bank", homework.length ? "Homework" : "Your subjects"],
    };
  }
  if (skill === "plan") {
    const topics = focusTopics(details, homework, text);
    const exam = details?.examDate ? new Date(details.examDate) : null;
    const days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(Date.now() + i * 86400_000);
      const due = homework.filter((h) => !h.mine && new Date(h.dueAt).toDateString() === d.toDateString());
      const t1 = topics[(i * 2) % Math.max(1, topics.length)] ?? "your weakest topic";
      const t2 = topics[(i * 2 + 1) % Math.max(1, topics.length)] ?? "mixed practice";
      return {
        day: day(d),
        items: [
          ...due.map((h) => ({ time: "16:30", what: `Hand in ${h.title} (${h.className})`, href: `/homework/${h.id}`, minutes: 20 })),
          { time: "17:00", what: `Revise ${t1}: notes then 10 questions`, href: "/quizzes", minutes: 25 },
          { time: "17:30", what: i % 2 ? `Flashcards: ${t2}` : `Quiz on ${t2}`, href: i % 2 ? "/flashcards" : "/quizzes", minutes: 15 },
          ...(i === 4 ? [{ time: "18:00", what: "Mixed exam-style practice under time", href: "/exam-mode", minutes: 30 }] : []),
        ],
      };
    });
    return {
      skill,
      text: `Here's your next five days, ${name}. Homework comes first, then short sessions on ${topics.slice(0, 3).join(", ") || "your subjects"}${exam ? `, building up to your exam on ${day(exam)}` : ""}. Little and often beats cramming.`,
      cards: [{ kind: "plan", title: "Your revision plan", days }],
      used: ["Homework", "Your subjects", exam ? "Exam date" : "Calendar"],
    };
  }
  if (skill === "events") {
    const ev = await techEvents();
    return {
      skill,
      text: ev.length ? "These are coming up in London. Hackathons are a great way to build something real for your CV." : "I couldn't reach the events listings just now. Try again in a bit.",
      cards: ev.length ? [{ kind: "events", title: "Hackathons and tech events", events: ev.slice(0, 5).map((e) => ({ name: e.name, url: e.url, when: day(new Date(e.start)), where: e.where, hackathon: e.hackathon })) }] : [],
      used: ["Luma"],
    };
  }
  return { skill: "chat", text: "", cards: [], used: [] };
}
