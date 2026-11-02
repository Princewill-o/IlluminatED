import { NextResponse } from "next/server";

import { lessonAdaptation } from "@/lib/education/lesson-adaptation";
import { OAK_ATTRIBUTION, OAK_LICENCE } from "@/lib/education/school-stages";
import { lessonPractice, oakLesson } from "@/lib/server/oak-library";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const lesson = await oakLesson((await params).slug);
  if (!lesson) return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format");
  const adaptation = format === "qa" || format === "slides" ? lessonAdaptation(lesson) : null;
  const questions = adaptation ? await lessonPractice(lesson.slug) : [];
  return NextResponse.json({ lesson: format === "qa" ? { slug:lesson.slug,title:lesson.title,restricted:lesson.restricted,source_url:lesson.source_url } : lesson,
    ...(adaptation ? {...adaptation,questions:questions.length?questions:adaptation.questions} : {}), attribution: OAK_ATTRIBUTION, licence: OAK_LICENCE },
    { headers: { "Cache-Control": "public, max-age=300" } });
}
