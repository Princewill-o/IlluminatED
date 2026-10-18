import "server-only";
import type { LearnerDetails } from "@/lib/account/details";
import { OAK_PROGRAMMES } from "@/lib/education";
import { selectGroundingLessons } from "@/lib/education/oak-grounding";
import { getOakSummary, oakEnabled } from "@/lib/server/oak";
/** External requests contain only public lesson slugs, never the learner's message/profile. */
export async function findLearningGrounding(
  question: string,
  details: LearnerDetails | null,
) {
  if (!oakEnabled) return [];
  const lessons = selectGroundingLessons(question, details, OAK_PROGRAMMES);
  const results = await Promise.allSettled(
    lessons.map(async (lesson) => {
      const summary = await getOakSummary(lesson.slug);
      return summary && summary.keyStage === (lesson.year >= 10 ? "ks4" : "ks3")
        ? {
            ...summary,
            matchingYear: lesson.year,
            pathwayBoard: lesson.board || "not board-specific",
            pathwayTier: lesson.tier || "not tier-specific",
          }
        : null;
    }),
  );
  return results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}
