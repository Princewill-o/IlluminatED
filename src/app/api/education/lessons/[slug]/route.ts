import { NextResponse } from "next/server";

import { OAK_PROGRAMMES } from "@/lib/education";
import { getOakQuiz, oakEnabled } from "@/lib/server/oak";
export const runtime = "nodejs";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (
    !OAK_PROGRAMMES.some((p) =>
      p.units.some((u) => u.lessons.some((l) => l.slug === slug)),
    )
  )
    return NextResponse.json({ error: "unknown_lesson" }, { status: 404 });
  if (!oakEnabled)
    return NextResponse.json(
      { error: "source_not_configured" },
      { status: 503 },
    );
  try {
    return NextResponse.json(await getOakQuiz(slug), {
      headers: { "cache-control": "private, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "source_unavailable" }, { status: 502 });
  }
}
