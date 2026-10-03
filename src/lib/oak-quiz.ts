export interface OakQuestion {
  id: string;
  prompt: string;
  answers: { text: string; correct: boolean }[];
}
export interface OakQuiz {
  questions: OakQuestion[];
  skipped: number;
}
/** Unsupported image/matching/free-text questions remain available on the publisher's page. */
export function normaliseOakQuiz(value: unknown): OakQuiz {
  if (!value || typeof value !== "object") throw new Error("Invalid quiz");
  const root = value as Record<string, unknown>;
  if (!Array.isArray(root.starterQuiz) || !Array.isArray(root.exitQuiz))
    throw new Error("Invalid quiz shape");
  const result: OakQuiz = { questions: [], skipped: 0 };
  for (const [i, raw] of [...root.starterQuiz, ...root.exitQuiz]
    .slice(0, 100)
    .entries()) {
    if (!raw || typeof raw !== "object") {
      result.skipped++;
      continue;
    }
    const q = raw as Record<string, unknown>;
    if (
      q.questionType !== "multiple-choice" ||
      q.questionImage ||
      typeof q.question !== "string" ||
      !q.question.trim() ||
      q.question.length > 2000 ||
      !Array.isArray(q.answers) ||
      q.answers.length < 2 ||
      q.answers.length > 8
    ) {
      result.skipped++;
      continue;
    }
    const answers = q.answers.flatMap((a: unknown) => {
      if (!a || typeof a !== "object") return [];
      const x = a as Record<string, unknown>;
      return x.type === "text" &&
        typeof x.content === "string" &&
        x.content.trim() &&
        x.content.length <= 1000 &&
        typeof x.distractor === "boolean"
        ? [{ text: x.content, correct: !x.distractor }]
        : [];
    });
    if (
      answers.length !== q.answers.length ||
      !answers.some((a) => a.correct) ||
      answers.every((a) => a.correct)
    ) {
      result.skipped++;
      continue;
    }
    result.questions.push({ id: `oak-${i}`, prompt: q.question, answers });
  }
  return result;
}
export function oakAnswerCorrect(
  question: OakQuestion,
  selected: number[],
): boolean {
  return (
    question.answers.every((a, i) => a.correct === selected.includes(i)) &&
    selected.every(
      (i) => Number.isInteger(i) && i >= 0 && i < question.answers.length,
    )
  );
}
