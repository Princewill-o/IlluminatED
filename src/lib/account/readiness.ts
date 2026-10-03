import type { StudySubject } from "./details";

import { COURSES } from "@/lib/data/courses";
import { BOARDS } from "@/lib/data/routes";
import { QUESTION_BANK, type BankQuestion } from "@/lib/data/topics";

export function matchesSubject(q: BankQuestion, subject: StudySubject) {
  const course = COURSES.find((c) => c.id === subject.courseId);
  if (!course?.topicIds.includes(q.topicId)) return false;
  if (subject.board === "unsure") return true;
  const labels = [subject.board, BOARDS[subject.board]?.short]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());
  return (
    q.specRefs?.some((r) => labels.includes(r.board.toLowerCase())) ?? false
  );
}
export type QuestionEvidence = {
  question_key: string;
  seen: number;
  correct: number;
  last_at: string;
};
/** Measures only our available bank. Never a pass probability or syllabus coverage claim. */
export function practiceReadiness(
  subject: StudySubject,
  evidence: QuestionEvidence[],
  now = Date.now(),
) {
  const questions = QUESTION_BANK.filter((q) => matchesSubject(q, subject));
  const byKey = new Map(evidence.map((p) => [p.question_key, p]));
  let attempted = 0,
    secure = 0,
    seen = 0,
    correct = 0;
  for (const q of questions) {
    const p = byKey.get(q.key);
    if (!p || !Number.isFinite(p.seen) || p.seen <= 0) continue;
    attempted++;
    const right = Math.max(
      0,
      Math.min(p.seen, Number.isFinite(p.correct) ? p.correct : 0),
    );
    seen += p.seen;
    correct += right;
    const age = now - Date.parse(p.last_at);
    if (p.seen >= 2 && right / p.seen >= 0.8 && age >= 0 && age <= 14 * 864e5)
      secure++;
  }
  return {
    available: questions.length,
    attempted,
    secure,
    score:
      questions.length && attempted
        ? Math.round((secure / questions.length) * 100)
        : null,
    accuracy: seen ? Math.round((correct / seen) * 100) : null,
  };
}
