import { type NextRequest, NextResponse } from "next/server";

import { getAccount } from "@/lib/account/server";
import {
  AiError,
  TIGGY_MODEL,
  TIGGY_MODEL_FREE,
  aiEnabled,
  reasoningHint,
  streamChat,
  type ChatMessage,
} from "@/lib/ai";
import { notifyModerators } from "@/lib/email";
import { getSupabase } from "@/lib/social/server";
import { TIGGY_PLANS, type TiggyPlan } from "@/lib/tiggy";
import {
  SAFEGUARDING_REPLY,
  blockedReason,
  buildSystemPrompt,
  findOfficialSources,
  findTopics,
  getTiggyStatus,
  safeguardingCategory,
} from "@/lib/tiggy-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fail = (status: number, code: string, error: string) =>
  NextResponse.json({ code, error }, { status });

const textStream = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode(text));
      c.close();
    },
  });

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Content-Type-Options": "nosniff",
};

interface Body {
  messages?: unknown;
  fullSolution?: unknown;
}

/** Turns what the browser sent into a clean, length-capped history ending with the new question. */
function cleanHistory(raw: unknown, plan: TiggyPlan): ChatMessage[] | string {
  const limits = TIGGY_PLANS[plan];
  if (!Array.isArray(raw) || !raw.length) return "Type a question for Tiggy.";
  const all = raw
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        !!m &&
        typeof m === "object" &&
        ((m as { role?: unknown }).role === "user" ||
          (m as { role?: unknown }).role === "assistant") &&
        typeof (m as { content?: unknown }).content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content);
  const last = all.at(-1);
  if (!last || last.role !== "user") return "Type a question for Tiggy.";
  if (last.content.length > limits.maxInput)
    return `That message is too long. Keep it under ${limits.maxInput.toLocaleString("en-GB")} characters, or split it into parts.`;

  // Most recent first, within the plan's message count and character budget.
  const kept: ChatMessage[] = [];
  let budget = limits.maxContext;
  for (const m of all.slice(-limits.history).reverse()) {
    const content = m.content.slice(0, Math.min(limits.maxInput * 2, budget));
    if (!content) break;
    kept.unshift({ role: m.role, content });
    budget -= content.length;
  }
  // Start on a user turn so the model sees a tidy conversation.
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();
  return kept;
}

export async function POST(req: NextRequest) {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account)
    return fail(401, "signed_out", "Please sign in to chat with Tiggy.");
  if (!account.profile || !account.details)
    return fail(
      403,
      "setup",
      "Finish setting up your account to chat with Tiggy.",
    );
  if (account.profile.banned)
    return fail(403, "not_allowed", "Your account can't use Ask Tiggy.");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail(400, "bad_request", "Something went wrong. Please try again.");
  }

  const status = await getTiggyStatus(sb);
  const plan: TiggyPlan = status?.plan ?? "free";
  const history = cleanHistory(body.messages, plan);
  if (typeof history === "string") return fail(400, "invalid", history);
  const question = history.at(-1)!.content;

  // 1. Safeguarding comes first, and works even when the daily limit is used up or the AI is off.
  const category = safeguardingCategory(question);
  if (category) {
    try {
      const { data: isNew } = await sb.rpc("tiggy_flag", { category });
      if (isNew === true)
        await notifyModerators(
          "Ask Tiggy safeguarding flag",
          `A learner's message to Ask Tiggy matched the "${category}" safeguarding check. The message itself isn't stored. Review recent flags in moderation and follow your safeguarding procedure.`,
          "/social/moderation#tiggy",
        );
    } catch {
      // Recording the flag is best effort; the learner still gets the help below.
    }
    return new Response(textStream(SAFEGUARDING_REPLY), {
      headers: {
        ...STREAM_HEADERS,
        "X-Tiggy-Safeguarding": "1",
        ...(status
          ? {
              "X-Tiggy-Remaining": String(status.remaining),
              "X-Tiggy-Limit": String(status.limit),
            }
          : {}),
      },
    });
  }

  if (!aiEnabled)
    return fail(
      503,
      "not_configured",
      "Tiggy is still being set up. Please check back soon.",
    );
  if (!status)
    return fail(
      503,
      "not_ready",
      "Tiggy is still being set up. Please check back soon.",
    );

  // 2. Blocklist and topic check. These don't use up a message.
  const blocked = blockedReason(question);
  if (blocked) return fail(422, "blocked", blocked);

  // 3. Atomically use one credit. Free credits never reset; Premium resets daily.
  const { data: remaining, error: consumeError } =
    await sb.rpc("tiggy_consume");
  if (consumeError) {
    if (consumeError.message.includes("limit_reached"))
      return fail(
        429,
        "limit_reached",
        plan === "premium"
          ? "You've used all your Premium messages for today. They reset at midnight."
          : "Your free Tiggy credits have run out. Upgrade to Premium to keep chatting.",
      );
    if (consumeError.message.includes("email_not_verified"))
      return fail(403, "email_not_verified", "Please verify your email address before using Tiggy. Check your inbox for the confirmation link.");
    if (consumeError.message.includes("not_allowed"))
      return fail(403, "not_allowed", "Your account can't use Ask Tiggy.");
    return fail(
      503,
      "not_ready",
      "Tiggy is having a rest. Please try again soon.",
    );
  }

  const fullSolution =
    body.fullSolution === true && TIGGY_PLANS[plan].fullSolutions;
  const model = plan === "premium" ? TIGGY_MODEL : TIGGY_MODEL_FREE;
  const system =
    reasoningHint(model) +
    buildSystemPrompt({
      plan,
      fullSolution,
      details: account.details,
      snippets: findTopics(question, account.details),
      officialSources: await findOfficialSources(question),
    });

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await streamChat({
      model,
      messages: [{ role: "system", content: system }, ...history],
      maxTokens: TIGGY_PLANS[plan].maxTokens,
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(55_000)]),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      "Ask Tiggy model call failed:",
      e instanceof AiError ? e.status : "network",
    );
    return fail(
      502,
      "model_error",
      "Tiggy couldn't answer just now. Please try again in a moment.",
    );
  }

  return new Response(stream, {
    headers: {
      ...STREAM_HEADERS,
      "X-Tiggy-Remaining": String(
        typeof remaining === "number" ? remaining : 0,
      ),
      "X-Tiggy-Limit": String(status.limit),
      "X-Tiggy-Plan": plan,
    },
  });
}
