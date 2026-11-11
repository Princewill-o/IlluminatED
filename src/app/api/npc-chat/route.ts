import { type NextRequest, NextResponse } from "next/server";

import { personaFor, personaPrompt } from "@/game/core/npc-talk";
import { getAccount } from "@/lib/account/server";
import { TIGGY_MODEL_FREE, aiEnabled, reasoningHint, streamChat, type ChatMessage } from "@/lib/ai";
import { getSupabase } from "@/lib/social/server";
import { SAFEGUARDING_REPLY, blockedReason, safeguardingCategory } from "@/lib/tiggy-server";

/**
 * Chatting with a fictional city resident or train passenger. The persona is
 * rebuilt on the server from the person's id and name (nothing the browser
 * says about them reaches the prompt), the same safeguarding and personal-detail
 * checks as Ask Tiggy run first, and there's a separate daily allowance so it
 * never uses up study credits.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const fail = (status: number, code: string, error: string) => NextResponse.json({ code, error }, { status });
const text = (t: string, extra: Record<string, string> = {}) =>
  new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(t)); c.close(); } }), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });

const ID = /^[a-z0-9-]{1,60}:resident:[a-z0-9:._-]{1,80}$/i;
const NAME = /^[A-Za-z][A-Za-z .'-]{0,39}$/;
const PLACE = /^[A-Za-z][A-Za-z .'&-]{0,39}$/;

export async function POST(req: NextRequest) {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account) return fail(401, "signed_out", "Sign in to chat freely. You can still pick a topic.");
  if (account.profile?.banned) return fail(403, "not_allowed", "Your account can't use chat.");
  let body: { id?: unknown; name?: unknown; heading?: unknown; messages?: unknown };
  try { body = await req.json(); } catch { return fail(400, "bad_request", "Something went wrong."); }
  if (typeof body.id !== "string" || !ID.test(body.id) || typeof body.name !== "string" || !NAME.test(body.name))
    return fail(400, "bad_request", "Something went wrong.");
  const heading = typeof body.heading === "string" && PLACE.test(body.heading) ? body.heading : undefined;
  if (!Array.isArray(body.messages)) return fail(400, "bad_request", "Something went wrong.");
  const history: ChatMessage[] = body.messages
    .filter((m): m is { role: "user" | "assistant"; content: string } => !!m && typeof m === "object" && ["user", "assistant"].includes((m as { role?: string }).role ?? "") && typeof (m as { content?: unknown }).content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 300) }))
    .filter((m) => m.content);
  while (history.length && history[0].role !== "user") history.shift();
  const last = history.at(-1);
  if (!last || last.role !== "user") return fail(400, "bad_request", "Type something to say.");
  if (last.content.length > 280) return fail(400, "too_long", "Keep it short: under 280 characters.");

  // Safeguarding first: a real person, not a game character, should help.
  if (safeguardingCategory(last.content)) return text(SAFEGUARDING_REPLY, { "X-Npc-Safeguarding": "1" });
  if (blockedReason(last.content))
    return text("Let's keep it friendly and keep personal details private. Ask me about something else?", { "X-Npc-Blocked": "1" });
  if (!aiEnabled) return fail(503, "not_configured", "offline");

  const { data: remaining, error } = await sb.rpc("npc_chat_consume");
  if (error) {
    if (error.message.includes("limit_reached")) return fail(429, "limit_reached", "You've chatted a lot today! Pick a topic instead, or come back tomorrow.");
    return fail(503, "not_ready", "offline");
  }
  const persona = personaFor(body.id, body.name, heading);
  try {
    const stream = await streamChat({
      model: TIGGY_MODEL_FREE,
      messages: [{ role: "system", content: reasoningHint(TIGGY_MODEL_FREE) + personaPrompt(persona) }, ...history],
      maxTokens: 160,
      temperature: 0.8,
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(25_000)]),
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Npc-Remaining": String(remaining ?? 0) } });
  } catch {
    return fail(502, "model_error", "offline");
  }
}
