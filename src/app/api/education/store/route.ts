import { NextResponse } from "next/server";

import { COURSES } from "@/lib/data/courses";
import health from "@/lib/data/education/source-health.json";
import { QUESTION_BANK } from "@/lib/data/topics";
import {
  providersForBoard,
  PROVIDERS_REVIEWED_AT,
} from "@/lib/education/providers";
import {
  LEARNING_SOURCES,
  sourceFreshness,
} from "@/lib/education/source-registry";
import { getCourseCurriculum } from "@/lib/server/education-store";
import { oakEnabled } from "@/lib/server/oak";
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const courseId = params.get("course");
  const yearText = params.get("year");
  const year = yearText ? Number(yearText) : null;
  if (year !== null && (!Number.isInteger(year) || year < 7 || year > 13))
    return NextResponse.json(
      { error: "Year must be between 7 and 13." },
      { status: 400 },
    );
  if (courseId && !COURSES.some((c) => c.id === courseId))
    return NextResponse.json({ error: "Unknown course." }, { status: 404 });
  const curriculum = courseId ? await getCourseCurriculum(courseId) : null;
  const checks = health.sources as {
    id: string;
    lastReachableAt: string | null;
    available: boolean;
    attemptedAt: string;
  }[];
  return NextResponse.json(
    {
      generatedAt: health.generatedAt,
      year,
      oakQuizEnabled: oakEnabled,
      providersReviewedAt: PROVIDERS_REVIEWED_AT,
      providers: providersForBoard(params.get("board")),
      groundingStatus: oakEnabled
        ? "Oak API configured; retrieval depends on matching year, subject, board and available pathways."
        : "Oak API key not configured. External lesson grounding is disabled; original reviewed practice and publisher links remain available.",
      sources: LEARNING_SOURCES.map((s) => {
        const check = checks.find((c) => c.id === s.id);
        return {
          ...s,
          check: check ?? null,
          freshness: sourceFreshness(check?.lastReachableAt),
          statusMeaning:
            "Reachability only. Curriculum suitability requires review.",
        };
      }),
      courses: COURSES.map((c) => ({
        id: c.id,
        title: c.title,
        level: c.level,
      })),
      curriculum: curriculum
        ? {
            ...curriculum,
            programmes: curriculum.programmes
              .filter((p) => year === null || p.year === year)
              .map((p) => ({ ...p, freshness: sourceFreshness(p.checkedAt) })),
            syllabuses: curriculum.syllabuses.map((s) => ({
              ...s,
              freshness: sourceFreshness(s.checkedAt),
            })),
          }
        : null,
      questions: courseId
        ? QUESTION_BANK.filter((q) => q.courseId === courseId)
            .slice(0, 20)
            .map((q) => ({
              ...q,
              prompt: q.q,
              origin: "IlluminatED original practice",
              scored: false,
            }))
        : [],
      notice:
        "Original questions are practice, not reproduced exam-board papers. Use official publisher links for papers and mark schemes. Sources and year coverage may be incomplete or temporarily unavailable.",
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
