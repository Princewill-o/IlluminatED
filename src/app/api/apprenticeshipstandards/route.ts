import { NextResponse } from "next/server";

import { searchStandards } from "@/lib/server/skills-england";

export const runtime = "nodejs";
// A cold start downloads the full list (about 50 MB) once.
export const maxDuration = 60;

// Skills England apprenticeship standards (OGL v3.0). Searched from a slim, cached index.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const level = Number(p.get("level"));
  try {
    const data = await searchStandards({
      q: (p.get("q") ?? "").slice(0, 80),
      level: Number.isInteger(level) && level >= 2 && level <= 7 ? level : null,
      route: (p.get("route") ?? "").slice(0, 80),
      includeClosed: p.get("all") === "1",
    });
    return NextResponse.json(data, {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=3600",
        "x-source": "skillsengland.education.gov.uk",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 502 },
    );
  }
}
