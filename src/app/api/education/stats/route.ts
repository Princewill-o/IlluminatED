import { NextResponse } from "next/server";

import { platformStats } from "@/lib/server/platform-stats";

export async function GET() {
  return NextResponse.json(await platformStats(), { headers: { "Cache-Control":"public, max-age=60, stale-while-revalidate=240" } });
}
