import { NextResponse } from "next/server";

import { checklistText } from "@/lib/education";
import { getCourseCurriculum } from "@/lib/server/education-store";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const data = await getCourseCurriculum(p.get("course") ?? "");
  if (!data)
    return NextResponse.json({ error: "unknown_course" }, { status: 404 });
  if (p.get("format") === "text") {
    const code = p.get("spec");
    const syllabus = code
      ? data.syllabuses.find((s) => s.code === code)
      : undefined;
    if (code && !syllabus)
      return NextResponse.json(
        { error: "unknown_specification" },
        { status: 400 },
      );
    return new Response(checklistText(data, syllabus), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="${data.course.id}-checklist.txt"`,
      },
    });
  }
  return NextResponse.json(data, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
