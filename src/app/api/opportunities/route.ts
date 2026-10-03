import { NextResponse } from "next/server";

import { getOpportunities } from "@/lib/server/opportunities";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json(await getOpportunities(), {
    headers: { "cache-control": "no-store" },
  });
}
