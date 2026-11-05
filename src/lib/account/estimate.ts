import type { RouteId } from "@/lib/types";

/**
 * A rough "if you sat the exam today" grade from practice evidence.
 *
 * Accuracy alone flatters a learner who has only practised their favourite
 * topic, so the score is pulled down by how much of the course is still
 * untouched. It is an estimate to motivate, not a prediction, and the UI
 * says so beside it.
 */
export type GradeEstimate = {
  grade: string;
  /** 0–1 position inside the grade scale, for a progress bar. */
  score: number;
  /** The next grade up, or null at the top. */
  next: string | null;
  confidence: "low" | "medium" | "high";
};

const SCALES: Record<"gcse" | "alevel" | "vocational", [number, string][]> = {
  gcse: [[0.85, "9"], [0.76, "8"], [0.67, "7"], [0.58, "6"], [0.49, "5"], [0.4, "4"], [0.3, "3"], [0.2, "2"], [0, "1"]],
  alevel: [[0.85, "A*"], [0.73, "A"], [0.62, "B"], [0.51, "C"], [0.4, "D"], [0.3, "E"], [0, "U"]],
  vocational: [[0.85, "D*"], [0.7, "D"], [0.55, "M"], [0.4, "P"], [0, "Not yet"]],
};

export const scaleFor = (route: RouteId) => (route === "gcse" ? "gcse" : route === "alevel" ? "alevel" : "vocational");

export function estimateGrade(
  route: RouteId,
  { accuracy, started, topics, answered }: { accuracy: number | null; started: number; topics: number; answered: number },
): GradeEstimate | null {
  if (accuracy === null || !Number.isFinite(accuracy) || answered <= 0 || topics <= 0) return null;
  const coverage = Math.max(0, Math.min(1, started / topics));
  const score = Math.max(0, Math.min(1, accuracy)) * (0.35 + 0.65 * coverage);
  const scale = SCALES[scaleFor(route)];
  const i = scale.findIndex(([min]) => score >= min);
  const index = i < 0 ? scale.length - 1 : i;
  return {
    grade: scale[index][1],
    score,
    next: index > 0 ? scale[index - 1][1] : null,
    confidence: answered >= 60 && coverage >= 0.6 ? "high" : answered >= 20 && coverage >= 0.3 ? "medium" : "low",
  };
}
