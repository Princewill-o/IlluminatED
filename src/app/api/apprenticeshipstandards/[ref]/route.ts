import { NextResponse } from "next/server";

import { STANDARD_REF } from "@/lib/apprenticeships";
import { getStandard } from "@/lib/server/skills-england";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  if (!STANDARD_REF.test(ref))
    return NextResponse.json({ error: "invalid_reference" }, { status: 400 });
  try {
    const data = await getStandard(ref);
    if (!data)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data, {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=86400",
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
