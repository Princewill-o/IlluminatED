import { lessonAdaptation } from "@/lib/education/lesson-adaptation";
import { createLessonPowerpoint } from "@/lib/education/lesson-powerpoint";
import { oakLesson } from "@/lib/server/oak-library";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const lesson = await oakLesson((await params).slug);
  if (!lesson) return Response.json({ error: "lesson_not_found" }, { status: 404 });
  if (lesson.restricted) return Response.json({ error: "restricted_lesson", source: lesson.source_url }, { status: 403 });

  try {
    const deck = await createLessonPowerpoint(lesson, lessonAdaptation(lesson));
    const body = new Uint8Array(deck.byteLength);
    body.set(deck);
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${lesson.slug}-IllumED.pptx"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "powerpoint_generation_failed" }, { status: 500 });
  }
}
