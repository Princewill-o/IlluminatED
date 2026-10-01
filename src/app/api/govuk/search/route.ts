import { NextResponse } from "next/server";

import { searchGovUk } from "@/lib/server/govuk";

// GOV.UK search API (no key). Content is Crown copyright, OGL v3.0.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2)
    return NextResponse.json({ error: "query_too_short" }, { status: 400 });
  try {
    const data = await searchGovUk(q, { count: 10 });
    return NextResponse.json(data, {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=21600",
        "x-source": "www.gov.uk",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 502 },
    );
  }
}
