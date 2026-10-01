import "server-only";

/**
 * Model calls for Ask Tiggy through Hugging Face Inference Providers
 * (the OpenAI-compatible router). Off unless HF_TOKEN is set.
 *
 * TIGGY_MODEL is used for Premium and TIGGY_MODEL_FREE for the free plan.
 * Any chat model listed at https://router.huggingface.co/v1/models works.
 * Add a suffix to pick a provider policy, e.g. "openai/gpt-oss-120b:cheapest".
 */
const HF_URL = "https://router.huggingface.co/v1/chat/completions";
const TOKEN = process.env.HF_TOKEN?.trim() || "";

export const aiEnabled = Boolean(TOKEN);

export const TIGGY_MODEL =
  process.env.TIGGY_MODEL?.trim() || "openai/gpt-oss-120b";
export const TIGGY_MODEL_FREE =
  process.env.TIGGY_MODEL_FREE?.trim() || "openai/gpt-oss-20b";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** gpt-oss models read their reasoning effort from the system prompt. Low keeps replies quick and cheap. */
export const reasoningHint = (model: string) =>
  /gpt-oss/i.test(model) ? "Reasoning: low\n\n" : "";

/**
 * Starts a streamed chat completion and returns the reply as a stream of
 * plain UTF-8 text (only the visible answer, never any reasoning tokens).
 * Throws AiError if the provider refuses the request before streaming starts.
 */
export async function streamChat({
  model,
  messages,
  maxTokens,
  temperature = 0.4,
  signal,
}: {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
  if (!TOKEN) throw new AiError("AI is not configured", 503);

  let res: Response;
  try {
    res = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: maxTokens,
        temperature,
      }),
      signal,
      cache: "no-store",
    });
  } catch {
    throw new AiError("Could not reach the model provider", 502);
  }
  if (!res.ok || !res.body) {
    // Read and drop the body so the connection is freed. Never echo provider errors to learners.
    await res.text().catch(() => "");
    throw new AiError(`Model provider returned ${res.status}`, res.status);
  }

  const upstream = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let finish: string | null = null;
  let sentAny = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        for (;;) {
          const { done, value } = await upstream.read();
          if (done) {
            if (finish === "length")
              controller.enqueue(
                encoder.encode(
                  "\n\n_I've reached my length limit for this answer. Ask me to carry on if you'd like more._",
                ),
              );
            else if (!sentAny)
              controller.enqueue(
                encoder.encode(
                  "Sorry, I couldn't think of an answer just then. Please try asking again.",
                ),
              );
            controller.close();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          let out = "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                choices?: {
                  delta?: { content?: string | null };
                  finish_reason?: string | null;
                }[];
              };
              const choice = json.choices?.[0];
              if (choice?.delta?.content) out += choice.delta.content;
              if (choice?.finish_reason) finish = choice.finish_reason;
            } catch {
              // Ignore keep-alive or malformed lines.
            }
          }
          if (out) {
            sentAny = true;
            controller.enqueue(encoder.encode(out));
            return;
          }
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            sentAny
              ? "\n\n_Sorry, I lost my train of thought. Please ask again._"
              : "Sorry, something went wrong on my side. Please try again in a moment.",
          ),
        );
        controller.close();
      }
    },
    cancel() {
      upstream.cancel().catch(() => {});
    },
  });
}
