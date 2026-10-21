import { type NextRequest, NextResponse } from "next/server";

import { getAccount } from "@/lib/account/server";
import { bankSample, toPublic } from "@/lib/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/questions?level=GCSE&subject=Biology&topic=Cells&limit=10[&open=1][&reviewed=1]
 * A random practice set from the question bank. Answers are never included:
 * check each answer with POST /api/questions/check.
 */
export async function GET(req: NextRequest) {
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "Sign in to practise." }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const clip = (v: string | null) => (v ? v.slice(0, 80) : null);
  const items = await bankSample({
    level: clip(p.get("level")),
    subject: clip(p.get("subject")),
    topic: clip(p.get("topic")),
    limit: Number(p.get("limit")) || 10,
    includeOpen: p.get("open") === "1",
    reviewedOnly: p.get("reviewed") === "1",
  });
  if (items === null) return NextResponse.json({ error: "The question bank isn't loaded yet.", questions: [] }, { status: 503 });
  return NextResponse.json({ questions: items.map(toPublic) });
}
