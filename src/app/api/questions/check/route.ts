import { type NextRequest, NextResponse } from "next/server";

import { getAccount } from "@/lib/account/server";
import { bankItem, markAnswer } from "@/lib/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/questions/check { id, answer }
 * Marks a typed answer on the server and returns the bank's answer, explanation
 * and source. Open questions (evaluation, constructed response) come back with
 * the mark scheme for the learner to self-assess.
 */
export async function POST(req: NextRequest) {
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "Sign in to practise." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; answer?: unknown };
  const id = typeof body.id === "string" ? body.id.slice(0, 40) : "";
  const answer = typeof body.answer === "string" ? body.answer.slice(0, 500) : "";
  if (!id) return NextResponse.json({ error: "Missing question." }, { status: 400 });
  const q = await bankItem(id);
  if (!q) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  const open = q.question_type === "evaluation" || q.question_type === "constructed_response";
  return NextResponse.json({
    correct: open ? null : markAnswer(answer, q.answer),
    answer: q.answer,
    explanation: q.explanation,
    marks: q.marks,
    source: q.source,
    licence: q.licence,
    reviewed: q.publish_ready,
  });
}
