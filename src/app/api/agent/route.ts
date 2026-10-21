import { type NextRequest, NextResponse } from "next/server";

import { getAccount } from "@/lib/account/server";
import { pickSkill, runSkill } from "@/lib/agent";
import { loadMyHomework } from "@/lib/school/server";
import { blockedReason, safeguardingCategory } from "@/lib/tiggy-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The study agent's skills: plan, quiz, homework, opportunities. Open-ended
 * questions come back as skill "chat" and the page sends them to Ask Tiggy,
 * which has the safeguarding and grounding for free-text answers.
 */
export async function POST(req: NextRequest) {
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "Sign in to use your study agent." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 600) : "";
  if (!text) return NextResponse.json({ error: "Ask me something." }, { status: 400 });
  // Anything worrying goes to Ask Tiggy, which has the safeguarding replies.
  if (safeguardingCategory(text) || blockedReason(text)) return NextResponse.json({ skill: "chat", text: "", cards: [], used: [] });
  const skill = pickSkill(text);
  if (skill === "chat") return NextResponse.json({ skill, text: "", cards: [], used: [] });
  const homework = await loadMyHomework(account.id).catch(() => []);
  const reply = await runSkill(skill, text, { name: account.profile?.username ?? "there", details: account.details, homework });
  return NextResponse.json(reply);
}
