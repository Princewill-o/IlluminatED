"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import Link from "next/link";

import { ArrowUp, RotateCcw, Sparkles, Square } from "lucide-react";

import { Tiggy } from "@/components/tiggy";
import { TiggyMarkdown } from "@/components/tiggy-markdown";
import {
  STARTER_PROMPTS,
  TIGGY_DISCLAIMER,
  TIGGY_PLANS,
  type TiggyStatus,
} from "@/lib/tiggy";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Shown as a notice from Tiggy, not sent back to the model. */
  notice?: boolean;
  safeguarding?: boolean;
}

const newId = () => Math.random().toString(36).slice(2, 10);

/** Conversations stay in this browser tab only (sessionStorage), never on our servers. */
const storageKey = (user: string) => `tiggy-chat:${user}`;

export function TiggyChat({
  userId,
  initialStatus,
  premiumEnabled,
  upgraded,
  crisis,
}: {
  userId: string;
  initialStatus: TiggyStatus;
  premiumEnabled: boolean;
  upgraded: boolean;
  /** The site's crisis help panel, shown after a safeguarding reply. */
  crisis: React.ReactNode;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullSolution, setFullSolution] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const plan = TIGGY_PLANS[status.plan];
  const limitHit = status.remaining <= 0;

  // Restore this tab's conversation after a refresh.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey(userId));
      if (saved) setMessages((JSON.parse(saved) as Msg[]).slice(-40));
    } catch {
      // Storage can be blocked; the chat still works without it.
    }
  }, [userId]);

  useEffect(() => {
    if (busy) return;
    try {
      if (messages.length)
        sessionStorage.setItem(
          storageKey(userId),
          JSON.stringify(messages.slice(-40)),
        );
      else sessionStorage.removeItem(storageKey(userId));
    } catch {
      // Ignore.
    }
  }, [messages, busy, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;
      if (question.length > plan.maxInput) return;

      const userMsg: Msg = { id: newId(), role: "user", content: question };
      const replyId = newId();
      const history = [...messages.filter((m) => !m.notice), userMsg]
        .slice(-plan.history)
        .map(({ role, content }) => ({ role, content }));

      setMessages((m) => [...m, userMsg]);
      setInput("");
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const notice = (content: string) =>
        setMessages((m) => [
          ...m,
          { id: replyId, role: "assistant", content, notice: true },
        ]);

      try {
        const res = await fetch("/api/tiggy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, fullSolution }),
          signal: controller.signal,
        });

        const remaining = Number(res.headers.get("X-Tiggy-Remaining"));
        const limit = Number(res.headers.get("X-Tiggy-Limit"));
        if (res.headers.has("X-Tiggy-Remaining") && Number.isFinite(remaining))
          setStatus((s) => ({
            ...s,
            remaining,
            limit: Number.isFinite(limit) && limit > 0 ? limit : s.limit,
            used:
              (Number.isFinite(limit) && limit > 0 ? limit : s.limit) -
              remaining,
          }));

        if (!res.ok || !res.body) {
          let msg = "Tiggy couldn't answer just now. Please try again.";
          let code = "";
          try {
            const j = (await res.json()) as { error?: string; code?: string };
            msg = j.error ?? msg;
            code = j.code ?? "";
          } catch {
            // Keep the default message.
          }
          if (code === "limit_reached")
            setStatus((s) => ({ ...s, remaining: 0, used: s.limit }));
          notice(msg);
          return;
        }

        const safeguarding = res.headers.get("X-Tiggy-Safeguarding") === "1";
        if (safeguarding) setShowCrisis(true);
        setMessages((m) => [
          ...m,
          { id: replyId, role: "assistant", content: "", safeguarding },
        ]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((m) =>
            m.map((x) =>
              x.id === replyId ? { ...x, content: x.content + chunk } : x,
            ),
          );
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          setMessages((m) =>
            m.map((x) =>
              x.id === replyId
                ? { ...x, content: `${x.content}\n\n_(Stopped)_` }
                : x,
            ),
          );
        } else {
          notice(
            "I couldn't connect just then. Check your internet connection and try again.",
          );
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [busy, messages, plan.history, plan.maxInput, fullSolution],
  );

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setShowCrisis(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  const tooLong = input.length > plan.maxInput;
  const meterPct = Math.round(
    (Math.max(0, status.remaining) / Math.max(1, status.limit)) * 100,
  );
  const planName = status.plan === "premium" ? "Premium" : "free";

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      {/* Tiggy: at the top on mobile, on the left on desktop. */}
      <aside className="flex items-center gap-4 lg:sticky lg:top-24 lg:block lg:self-start">
        <Tiggy
          action={busy ? "think" : "wave"}
          className="w-20 shrink-0 sm:w-24 lg:mx-auto lg:w-48"
          sizes="(min-width: 1024px) 192px, 96px"
          priority
        />
        <div className="min-w-0 flex-1 lg:mt-6">
          <p className="text-sm font-semibold" aria-hidden={busy}>
            {busy ? "Tiggy is thinking…" : "Tiggy is ready to help"}
          </p>
          <div className="mt-2">
            <p
              className="text-muted-foreground text-xs"
              id={`${inputId}-meter`}
            >
              <span className="text-foreground font-medium tabular-nums">
                {Math.max(0, status.remaining)} of {status.limit}
              </span>{" "}
              {planName} messages left today
            </p>
            <span
              className="bg-border relative mt-1.5 block h-1.5 w-full max-w-60 overflow-hidden rounded-full"
              aria-hidden
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  meterPct > 20 ? "bg-primary" : "bg-warm",
                )}
                style={{ width: `${meterPct}%` }}
              />
            </span>
          </div>
          {status.plan === "free" && premiumEnabled && (
            <Link
              href="/premium"
              className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold"
            >
              <Sparkles className="size-3.5" aria-hidden /> Get more with
              Premium
            </Link>
          )}
        </div>
      </aside>

      <section aria-label="Chat with Tiggy" className="min-w-0">
        {upgraded && (
          <p
            role="status"
            className="bg-success-soft mb-4 rounded-lg px-4 py-3 text-sm"
          >
            Welcome to Premium! It can take a minute to switch on. If your limit
            still shows as free, refresh the page shortly.
          </p>
        )}

        <div
          role="log"
          aria-live="polite"
          aria-busy={busy}
          aria-label="Conversation"
          className="space-y-4"
        >
          {messages.length === 0 && (
            <div className="bg-card rounded-2xl border p-5">
              <p className="font-semibold">Hi, I'm Tiggy!</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Ask me about any topic you're revising, get a hint on a tricky
                question, or plan your revision. I'll explain step by step and
                check you've got it.
              </p>
            </div>
          )}
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                  <span className="sr-only">You said: </span>
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl rounded-bl-sm border px-4 py-3 text-sm",
                    m.notice ? "bg-accent" : "bg-card",
                  )}
                >
                  <span className="sr-only">Tiggy said: </span>
                  {m.content ? (
                    <div className="prose prose-sm dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-pre:my-2 max-w-none">
                      <TiggyMarkdown text={m.content} />
                    </div>
                  ) : (
                    <span
                      className="text-muted-foreground inline-flex gap-1"
                      aria-hidden
                    >
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse [animation-delay:150ms]">
                        ●
                      </span>
                      <span className="animate-pulse [animation-delay:300ms]">
                        ●
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
          <div ref={endRef} />
        </div>

        {showCrisis && <div className="mt-5">{crisis}</div>}

        {limitHit && !busy && (
          <div className="bg-card mt-5 rounded-2xl border p-5" role="status">
            <p className="font-semibold">
              You've used all {status.limit} of today's {planName} messages
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              They reset at midnight.{" "}
              {status.plan === "free" && premiumEnabled
                ? "Premium gives you up to 200 messages a day, full worked solutions and Tiggy's stronger model."
                : "Meanwhile, try a quiz or flashcards on the topic."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {status.plan === "free" && premiumEnabled && (
                <Link
                  href="/premium"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 font-semibold"
                >
                  See Premium
                </Link>
              )}
              <Link
                href="/quizzes"
                className="hover:bg-muted rounded-md border px-4 py-2 font-medium"
              >
                Quiz centre
              </Link>
              <Link
                href="/flashcards"
                className="hover:bg-muted rounded-md border px-4 py-2 font-medium"
              >
                Flashcards
              </Link>
            </div>
          </div>
        )}

        {messages.length === 0 && !limitHit && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Ideas to start">
            {STARTER_PROMPTS.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => {
                    if (p.send) void send(p.text);
                    else {
                      setInput(p.text);
                      requestAnimationFrame(() => {
                        const el = inputRef.current;
                        el?.focus();
                        el?.setSelectionRange(p.text.length, p.text.length);
                      });
                    }
                  }}
                  disabled={busy}
                  className="hover:bg-muted rounded-full border px-3.5 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="bg-card focus-within:ring-ring/50 mt-5 rounded-2xl border p-2 focus-within:ring-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Message Tiggy
          </label>
          <textarea
            id={inputId}
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            placeholder={
              limitHit
                ? "You've used today's messages. They reset at midnight."
                : "Ask Tiggy a question…"
            }
            aria-describedby={`${inputId}-help ${inputId}-meter`}
            className="placeholder:text-muted-foreground block max-h-60 min-h-16 w-full resize-y bg-transparent px-2 py-1.5 text-sm outline-none disabled:cursor-not-allowed"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {status.plan === "premium" ? (
                <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={fullSolution}
                    onChange={(e) => setFullSolution(e.target.checked)}
                    className="accent-primary size-4"
                  />
                  Show full worked solution
                </label>
              ) : (
                <span className="text-muted-foreground">
                  Hints first.{" "}
                  {premiumEnabled && (
                    <Link
                      href="/premium"
                      className="underline underline-offset-4"
                    >
                      Full worked solutions with Premium
                    </Link>
                  )}
                </span>
              )}
              <span
                className={cn(
                  "tabular-nums",
                  tooLong
                    ? "text-destructive font-medium"
                    : "text-muted-foreground",
                )}
              >
                {input.length.toLocaleString("en-GB")}/
                {plan.maxInput.toLocaleString("en-GB")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && !busy && (
                <button
                  type="button"
                  onClick={reset}
                  className="hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium"
                >
                  <RotateCcw className="size-3.5" aria-hidden /> New chat
                </button>
              )}
              {busy ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold"
                >
                  <Square className="size-3.5" aria-hidden /> Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || tooLong}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-xs font-semibold disabled:opacity-50"
                >
                  Send <ArrowUp className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </form>
        <p
          id={`${inputId}-help`}
          className="text-muted-foreground mt-2 text-xs"
        >
          Press Enter to send and Shift+Enter for a new line. Don't share
          personal details like your name, school or phone number.
        </p>
        <p className="text-muted-foreground mt-4 border-t pt-4 text-xs">
          {TIGGY_DISCLAIMER} Tiggy never writes coursework or NEA for you.
          Worried about something? See{" "}
          <Link href="/safeguarding" className="underline underline-offset-4">
            getting help
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
