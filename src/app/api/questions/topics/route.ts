import { NextResponse } from "next/server";

import { getAccount } from "@/lib/account/server";
import { bankTopics } from "@/lib/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/questions/topics: every level, subject and topic with question counts. */
export async function GET() {
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "Sign in to practise." }, { status: 401 });
  const topics = await bankTopics();
  if (topics === null) return NextResponse.json({ error: "The question bank isn't loaded yet.", topics: [] }, { status: 503 });
  return NextResponse.json({ topics });
}
