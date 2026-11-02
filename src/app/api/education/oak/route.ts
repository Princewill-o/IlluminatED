import { NextResponse } from "next/server";

import { oakFilters, OAK_ATTRIBUTION, OAK_LICENCE } from "@/lib/education/school-stages";
import { oakLibrary } from "@/lib/server/oak-library";

export async function GET(request: Request) {
  const filters = oakFilters(new URL(request.url).searchParams);
  const result = await oakLibrary(filters);
  if (!result.available) return NextResponse.json({ error: "curriculum_temporarily_unavailable" }, { status: 503 });
  return NextResponse.json({ ...result, filters, pageSize: 24, attribution: OAK_ATTRIBUTION, licence: OAK_LICENCE,
    coverage: "Oak KS1–KS4. Sixth-form resources are provided through the existing course catalogue." },
    { headers: { "Cache-Control": "public, max-age=300" } });
}
