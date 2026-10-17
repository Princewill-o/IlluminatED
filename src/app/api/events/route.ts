import { NextResponse } from "next/server";

import { techEvents } from "@/lib/events";

export const revalidate = 10800;

/** Hackathons and tech events for the in-game adverts. */
export async function GET() {
  const events = await techEvents();
  return NextResponse.json({ events }, { headers: { "cache-control": "public, s-maxage=10800, stale-while-revalidate=86400" } });
}
