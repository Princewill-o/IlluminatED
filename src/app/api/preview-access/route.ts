import { NextResponse } from "next/server";

/** Retired preview form: old bookmarks return to the now-public website. */
export async function POST(request: Request) {
  return NextResponse.redirect(new URL("/", request.url), 303);
}
