import { GCSE_TOPICS_A } from "./gcse-a";
import { GCSE_TOPICS_B } from "./gcse-b";
import { POST16_TOPICS } from "./post16";

import { COURSES, courseById } from "@/lib/data/courses";
import type {
  Course,
  QuizQuestion,
  RouteId,
  SpecRef,
  Topic,
} from "@/lib/types";

export const TOPICS: Topic[] = [
  ...GCSE_TOPICS_A,
  ...GCSE_TOPICS_B,
  ...POST16_TOPICS,
];

export const topicById = (id: string) => TOPICS.find((t) => t.id === id);

/** Date the topic specification references were last checked against the boards' documents. */
export const SPEC_REFS_CHECKED = "30 September 2026";

/** Full label, e.g. "AQA 8300 · R9 percentages; N12, R16 compound interest". */
export const specRefLabel = (r: SpecRef) =>
  `${r.board} ${r.code} · ${r.section}`;

/** Short label, e.g. "AQA 8300 R9": the leading section reference when there is one. */
export const specRefShort = (r: SpecRef) => {
  const lead = r.section.match(
    /^(?:[A-Z]*\d[\w.–-]*|(?:Unit|Component|Content area|Chapter|Topic) \d+)/,
  )?.[0];
  const section = lead ?? r.section.split(/[;(]/)[0].trim();
  return `${r.board} ${r.code} ${section}`;
};

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
  specRefs?: SpecRef[];
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
    specRefs: t.specRefs,
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
  ];
  if (t.specRefs?.length) {
    lines.push(
      "MATCHES THE SPECIFICATION",
      ...t.specRefs.map((r) => `• ${specRefLabel(r)}`),
      `Specification references checked ${SPEC_REFS_CHECKED}.`,
      "",
    );
  }
  lines.push(
    "LEARNING OBJECTIVES",
    ...t.objectives.map((o) => `• ${o}`),
    "",
    "EXPLANATION",
    ...t.explanation,
    "",
  );
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
