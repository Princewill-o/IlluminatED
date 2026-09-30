import { GCSE_TOPICS_A } from "./gcse-a";
import { GCSE_TOPICS_B } from "./gcse-b";
import { POST16_TOPICS } from "./post16";

import { COURSES, courseById } from "@/lib/data/courses";
import type { Course, QuizQuestion, RouteId, Topic } from "@/lib/types";

export const TOPICS: Topic[] = [
  ...GCSE_TOPICS_A,
  ...GCSE_TOPICS_B,
  ...POST16_TOPICS,
];

export const topicById = (id: string) => TOPICS.find((t) => t.id === id);

export const topicsForCourse = (course: Course) =>
  course.topicIds.map((id) => topicById(id)).filter(Boolean) as Topic[];

/** A quiz question with the context needed to filter, label and track it. */
export interface BankQuestion extends QuizQuestion {
  key: string;
  topicId: string;
  topicTitle: string;
  courseId: string;
  subject: string;
  route: RouteId;
  source: string;
  version: string;
  reviewed: string;
}

export const QUESTION_BANK: BankQuestion[] = TOPICS.flatMap((t) => {
  const c = courseById(t.courseId)!;
  return t.quiz.map((q) => ({
    ...q,
    key: `${t.id}:${q.id}`,
    topicId: t.id,
    topicTitle: t.title,
    courseId: c.id,
    subject: c.subject,
    route: c.route,
    source: "Original IlluminatED question",
    version: t.version,
    reviewed: t.reviewed,
  }));
});

export interface Flashcard {
  key: string;
  front: string;
  back: string;
  topicId: string;
  topicTitle: string;
  courseId: string;
  subject: string;
  route: RouteId;
  kind: "Key term" | "Retrieval";
}

export const FLASHCARDS: Flashcard[] = TOPICS.flatMap((t) => {
  const c = courseById(t.courseId)!;
  const base = {
    topicId: t.id,
    topicTitle: t.title,
    courseId: c.id,
    subject: c.subject,
    route: c.route,
  };
  return [
    ...t.keyTerms.map((k, i) => ({
      ...base,
      key: `${t.id}:k${i}`,
      front: k.term,
      back: k.definition,
      kind: "Key term" as const,
    })),
    ...t.retrieval.map((r, i) => ({
      ...base,
      key: `${t.id}:r${i}`,
      front: r.q,
      back: r.a,
      kind: "Retrieval" as const,
    })),
  ];
});

/** Every course a topic is used in (a topic can be shared, e.g. GCSE sciences and Combined Science). */
export const coursesForTopic = (topicId: string) =>
  COURSES.filter((c) => c.topicIds.includes(topicId));

export const topicNotesText = (t: Topic, c: Course) => {
  const lines = [
    `${t.title}: revision notes`,
    `${c.title} · IlluminatED original material · version ${t.version} · reviewed ${t.reviewed}`,
    "This is original IlluminatED study material, not exam-board content. Check your own specification.",
    "",
    "LEARNING OBJECTIVES",
    ...t.objectives.map((o) => `• ${o}`),
    "",
    "EXPLANATION",
    ...t.explanation,
    "",
  ];
  if (t.workedExample) {
    lines.push(
      "WORKED EXAMPLE",
      t.workedExample.question,
      ...t.workedExample.steps.map((s, i) => `${i + 1}. ${s}`),
      `Answer: ${t.workedExample.answer}`,
      "",
    );
  }
  lines.push(
    "KEY TERMS",
    ...t.keyTerms.map((k) => `• ${k.term}: ${k.definition}`),
    "",
  );
  lines.push(
    "COMMON MISCONCEPTIONS",
    ...t.misconceptions.map((m) => `✗ ${m.wrong}\n✓ ${m.right}`),
    "",
  );
  lines.push(
    "RETRIEVAL QUESTIONS (cover the answers)",
    ...t.retrieval.map((r, i) => `${i + 1}. ${r.q}\n   Answer: ${r.a}`),
  );
  return lines.join("\n");
};
