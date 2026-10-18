import type { LearnerDetails } from "@/lib/account/details";
import type { CurriculumProgramme } from "@/lib/education";

export interface OakGrounding {
  title: string;
  url: string;
  keyStage: string;
  points: string[];
  misconceptions: { misconception: string; response: string }[];
  keywords: { keyword: string; description: string }[];
  attribution: string;
}
const clean = (v: unknown, max = 700) =>
  typeof v === "string"
    ? v
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
/** Only supported text fields enter context. Never trust external URLs or instructions. */
export function normaliseOakSummary(
  value: unknown,
  slug: string,
): OakGrounding {
  if (!value || typeof value !== "object")
    throw new Error("Invalid Oak summary");
  const v = value as Record<string, unknown>;
  const title = clean(v.lessonTitle, 200);
  if (
    !title ||
    !Array.isArray(v.keyLearningPoints) ||
    !["ks1", "ks2", "ks3", "ks4"].includes(String(v.keyStageSlug))
  )
    throw new Error("Invalid Oak summary");
  const points = v.keyLearningPoints.slice(0, 8).flatMap((item) => {
    const text =
      item && typeof item === "object"
        ? clean((item as Record<string, unknown>).keyLearningPoint)
        : "";
    return text ? [text] : [];
  });
  if (!points.length) throw new Error("Empty Oak summary");
  const pairs = (items: unknown, first: string, second: string) =>
    Array.isArray(items)
      ? items.slice(0, 4).flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const row = item as Record<string, unknown>;
          const a = clean(row[first], 300),
            b = clean(row[second], 500);
          return a && b ? [[a, b]] : [];
        })
      : [];
  return {
    title,
    url: `https://www.thenational.academy/teachers/lessons/${encodeURIComponent(slug)}`,
    keyStage: String(v.keyStageSlug),
    points,
    keywords: pairs(v.lessonKeywords, "keyword", "description").map(
      ([keyword, description]) => ({ keyword, description }),
    ),
    misconceptions: pairs(
      v.misconceptionsAndCommonMistakes,
      "misconception",
      "response",
    ).map(([misconception, response]) => ({ misconception, response })),
    attribution: `“${title}” lesson summary by Oak National Academy, licensed under the Open Government Licence v3.0, except where otherwise stated.`,
  };
}
const BOARDS: Record<string, string[]> = {
  aqa: ["aqa"],
  pearson: ["edexcel", "edexcelb", "edexcela", "pearson"],
  ocr: ["ocr"],
  wjec: ["eduqas", "wjec"],
};
const STOP = new Set([
  "about",
  "could",
  "would",
  "please",
  "explain",
  "question",
  "questions",
  "answer",
  "answers",
  "give",
  "what",
  "which",
  "with",
  "this",
  "that",
  "does",
  "have",
  "from",
  "study",
  "help",
  "make",
]);
export function selectGroundingLessons(
  question: string,
  details: LearnerDetails | null,
  programmes: CurriculumProgramme[],
) {
  const year = Number(details?.yearGroup.replace("year-", ""));
  if (!details || ![7, 8, 9, 10, 11].includes(year)) return [];
  const tokens = [
    ...new Set(question.toLowerCase().match(/[a-z]{3,}/g) ?? []),
  ].filter((t) => !STOP.has(t));
  if (!tokens.length) return [];
  const found = new Map<
    string,
    { slug: string; score: number; year: number; board: string; tier: string }
  >();
  for (const p of programmes) {
    if (
      p.year !== year ||
      !details.subjects.some(
        (s) =>
          p.courseIds.includes(s.courseId) &&
          (s.board === "unsure"
            ? !p.board
            : !p.board ||
              (BOARDS[s.board] ?? []).includes(p.board.toLowerCase())),
      )
    )
      continue;
    // An unspecified learner tier must not silently select just one tier's pathway.
    if (p.tier && !["all", "all-tiers"].includes(p.tier.toLowerCase()))
      continue;
    for (const unit of p.units)
      for (const lesson of unit.lessons) {
        const title = lesson.title.toLowerCase();
        const score = tokens.reduce(
          (sum, t) =>
            sum +
            (title.includes(t)
              ? 2
              : unit.title.toLowerCase().includes(t)
                ? 1
                : 0),
          0,
        );
        if (
          score >= 2 &&
          (!found.has(lesson.slug) || found.get(lesson.slug)!.score < score)
        )
          found.set(lesson.slug, {
            slug: lesson.slug,
            score,
            year: p.year,
            board: p.board,
            tier: p.tier,
          });
      }
  }
  return [...found.values()]
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, 2);
}
