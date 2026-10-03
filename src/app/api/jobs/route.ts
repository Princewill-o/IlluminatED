import { NextResponse } from "next/server";

import { normaliseJobs } from "@/lib/career-guidance";
import { fetchUpstream } from "@/lib/server/proxy";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const keywords = (params.get("q") ?? "").trim();
  const location = (params.get("location") ?? "").trim();
  if (keywords.length > 100 || location.length > 100)
    return NextResponse.json(
      { error: "Use at most 100 characters per search field." },
      { status: 400 },
    );
  const key = process.env.REED_API_KEY?.trim();
  if (!key)
    return NextResponse.json({
      status: "not-configured",
      items: [],
      checkedAt: null,
    });
  const query = new URLSearchParams({
    keywords,
    locationName: location,
    resultsToTake: "50",
  });
  try {
    const response = await fetchUpstream(
      `https://www.reed.co.uk/api/1.0/search?${query}`,
      {
        redirect: "error",
        revalidate: 3600,
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        },
      },
    );
    if (!response.ok) throw new Error("Provider unavailable");
    return NextResponse.json({
      status: "live",
      items: normaliseJobs(await response.json()),
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "unavailable", items: [], checkedAt: null },
      { status: 503 },
    );
  }
}
