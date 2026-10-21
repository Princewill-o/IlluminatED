"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { ArrowUp, BookOpenCheck, CalendarDays, CheckCircle2, ClipboardList, ExternalLink, Plus, Rocket, Sparkles, Trophy } from "lucide-react";

import { TiggyMarkdown } from "@/components/tiggy-markdown";
import type { AgentCard, AgentReply } from "@/lib/agent-types";
import { cn } from "@/lib/utils";

/**
 * Your study agent: ask in plain English and it does the work. It plans your
 * week around your homework, quizzes you on the right topics, lists what's due,
 * finds hackathons, and answers anything else through Ask Tiggy.
 */
interface Msg {
  id: string;
  role: "user" | "agent";
  text: string;
  cards?: AgentCard[];
  used?: string[];
  busy?: boolean;
}

const SUGGESTIONS = [
  { text: "Plan my revision for this week", Icon: CalendarDays },
  { text: "Quiz me on my homework topics", Icon: BookOpenCheck },
  { text: "What homework is due?", Icon: ClipboardList },
  { text: "Find me a hackathon in London", Icon: Rocket },
  { text: "Explain photosynthesis simply", Icon: Sparkles },
];

const RECENT_KEY = "agent-recent";

export function AgentWorkspace({ name }: { name: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const feed = useRef<HTMLDivElement>(null);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]);
    } catch {
      // No history saved.
    }
  }, []);
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    const id = crypto.randomUUID();
    const history = msgs.filter((m) => !m.busy && m.text).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
    setMsgs((m) => [...m, { id: `u${id}`, role: "user", text: q }, { id, role: "agent", text: "", busy: true }]);
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Not saved.
    }
    const update = (patch: Partial<Msg>) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    try {
      const r = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: q }) });
      const reply = (await r.json()) as AgentReply & { error?: string };
      if (!r.ok) return update({ busy: false, text: reply.error ?? "Something went wrong. Try again." });
      if (reply.skill !== "chat") return update({ busy: false, text: reply.text, cards: reply.cards, used: reply.used });
      // Open questions go to Ask Tiggy (with its safeguards), streamed in.
      const res = await fetch("/api/tiggy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...history, { role: "user", content: q }] }) });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return update({ busy: false, text: j.error ?? "I couldn't answer that just now. Try asking for a plan or a quiz." });
      }
      update({ busy: false, used: ["Ask Tiggy"] });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMsgs((m) => m.map((x) => (x.id === id ? { ...x, text: x.text + chunk } : x)));
      }
    } catch {
      update({ busy: false, text: "I couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100dvh-120px)] overflow-hidden rounded-[2rem] border-2 border-white bg-[#f7f6fb] text-[#1d1a4a] shadow-[0_10px_0_rgba(36,33,94,0.12)] md:grid-cols-[230px_1fr]">
      <aside className="hidden flex-col gap-1 bg-[#24215e] p-4 text-white md:flex">
        <p className="flex items-center gap-2 text-sm font-black">
          <span className="grid size-8 place-items-center rounded-xl bg-white/15">
            <Sparkles className="size-4" aria-hidden />
          </span>
          Study agent
        </p>
        <button type="button" onClick={() => setMsgs([])} className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20">
          <Plus className="size-4" aria-hidden /> New chat
        </button>
        <p className="mt-5 px-1 text-[10px] font-black tracking-[0.2em] text-white/50 uppercase">Do it for me</p>
        {SUGGESTIONS.slice(0, 4).map((s) => (
          <button key={s.text} type="button" onClick={() => void ask(s.text)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">
            <s.Icon className="size-4 shrink-0 text-[#a9b4ff]" aria-hidden /> {s.text}
          </button>
        ))}
        {recent.length > 0 && (
          <>
            <p className="mt-5 px-1 text-[10px] font-black tracking-[0.2em] text-white/50 uppercase">Recent chats</p>
            {recent.slice(0, 6).map((r) => (
              <button key={r} type="button" onClick={() => void ask(r)} className="truncate rounded-xl px-3 py-1.5 text-left text-xs text-white/80 hover:bg-white/10">
                {r}
              </button>
            ))}
          </>
        )}
        <p className="mt-auto rounded-xl bg-white/10 p-3 text-[11px] leading-snug text-white/70">It asks before anything goes to your teacher, and never shares your details.</p>
      </aside>

      <div className="flex min-h-0 flex-col">
        <div ref={feed} className="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
          {msgs.length === 0 ? (
            <div className="mx-auto max-w-2xl pt-6 md:pt-16">
              <p className="agent-rise text-sm font-black text-[#5b56c8]">
                {hello}, {name}
              </p>
              <h1 className="agent-rise mt-2 text-4xl leading-tight font-black tracking-tight md:text-5xl" style={{ animationDelay: "80ms" }}>
                What should we get done today?
              </h1>
              <p className="agent-rise mt-3 text-[#1d1a4a]/70" style={{ animationDelay: "160ms" }}>
                Ask in plain English. I know your homework, your subjects and your exam date, and I can plan, quiz and find opportunities for you.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button key={s.text} type="button" onClick={() => void ask(s.text)} className="agent-rise flex items-center gap-2 rounded-full border-2 border-white bg-white px-4 py-2 text-sm font-bold shadow-sm hover:border-[#5b56c8]" style={{ animationDelay: `${240 + i * 60}ms` }}>
                    <s.Icon className="size-4 text-[#5b56c8]" aria-hidden /> {s.text}
                  </button>
                ))}
              </div>
              <video className="agent-rise mt-8 w-full rounded-2xl shadow-lg" style={{ animationDelay: "500ms" }} src="/landing/illumed-film.mp4" poster="/landing/illumed-film-poster.jpg" autoPlay muted loop playsInline aria-label="Short film showing what the study agent can do" />
            </div>
          ) : (
            <ul className="mx-auto max-w-3xl space-y-5">
              {msgs.map((m) => (
                <li key={m.id} className={cn("agent-rise", m.role === "user" && "flex justify-end")}>
                  {m.role === "user" ? (
                    <p className="max-w-[80%] rounded-3xl rounded-br-md bg-[#24215e] px-4 py-2.5 text-sm font-bold text-white">{m.text}</p>
                  ) : (
                    <div className="max-w-full">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#5b56c8] text-white">
                          <Sparkles className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1 text-sm leading-relaxed">
                          {m.busy ? (
                            <span className="agent-dots inline-flex gap-1" aria-label="Working on it">
                              <span />
                              <span />
                              <span />
                            </span>
                          ) : (
                            <TiggyMarkdown text={m.text} />
                          )}
                          {m.cards?.map((c, i) => <Card key={i} card={c} />)}
                          {!!m.used?.length && (
                            <p className="mt-2 flex flex-wrap gap-1.5">
                              {m.used.map((u) => (
                                <span key={u} className="rounded-full bg-[#e9e7fb] px-2 py-0.5 text-[10px] font-black text-[#5b56c8]">
                                  {u}
                                </span>
                              ))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <form
          className="border-t border-[#24215e]/10 bg-white/70 p-3 backdrop-blur md:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border-2 border-[#24215e]/10 bg-white p-2 focus-within:border-[#5b56c8]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
              rows={1}
              maxLength={600}
              placeholder="Plan my week, quiz me on enzymes, what's due..."
              aria-label="Ask your study agent"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid size-10 place-items-center rounded-2xl bg-[#24215e] text-white disabled:opacity-30">
              <ArrowUp className="size-5" aria-hidden />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Card({ card }: { card: AgentCard }) {
  if (card.kind === "plan")
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm">
        <p className="flex items-center gap-2 bg-[#24215e] px-4 py-2 text-xs font-black tracking-widest text-white uppercase">
          <CalendarDays className="size-4" aria-hidden /> {card.title}
        </p>
        <div className="grid gap-px bg-[#24215e]/10 sm:grid-cols-2 lg:grid-cols-3">
          {card.days.map((d) => (
            <div key={d.day} className="bg-white p-3">
              <p className="text-xs font-black">{d.day}</p>
              <ul className="mt-1.5 space-y-1">
                {d.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="w-10 shrink-0 font-mono text-[#5b56c8]">{it.time}</span>
                    {it.href ? (
                      <Link href={it.href} className="hover:underline">
                        {it.what} <span className="text-[#1d1a4a]/50">· {it.minutes}m</span>
                      </Link>
                    ) : (
                      <span>{it.what}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  if (card.kind === "quiz") return <QuizCard card={card} />;
  if (card.kind === "homework")
    return (
      <ul className="mt-3 space-y-2">
        {card.items.map((h) => (
          <li key={h.href}>
            <Link href={h.href} className="flex items-center gap-3 rounded-2xl border-2 border-white bg-white px-4 py-3 shadow-sm hover:border-[#5b56c8]">
              <CheckCircle2 className={cn("size-5", h.done ? "text-[#15987f]" : "text-[#1d1a4a]/20")} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{h.title}</span>
              <span className="text-xs text-[#1d1a4a]/60">{h.done ? "Handed in" : `Due ${h.due}`}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {card.events.map((e) => (
        <li key={e.url}>
          <a href={e.url} target="_blank" rel="noopener noreferrer" className="block h-full rounded-2xl border-2 border-white bg-white p-3 shadow-sm hover:border-[#5b56c8]">
            {e.hackathon && <span className="rounded-full bg-[#ffd166] px-2 py-0.5 text-[10px] font-black uppercase">Hackathon</span>}
            <span className="mt-1 line-clamp-2 block text-sm font-black">{e.name}</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-[#1d1a4a]/60">
              {e.when} · {e.where} <ExternalLink className="size-3" aria-hidden />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function QuizCard({ card }: { card: Extract<AgentCard, { kind: "quiz" }> }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = card.questions[i];
  if (!q)
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#24215e] p-4 text-white">
        <Trophy className="size-6 text-[#ffd166]" aria-hidden />
        <p className="font-black">
          You got {score} out of {card.questions.length}. {score === card.questions.length ? "Perfect!" : "Ask me to plan more practice on the ones you missed."}
        </p>
      </div>
    );
  return (
    <div className="mt-3 rounded-2xl border-2 border-white bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black tracking-widest text-[#5b56c8] uppercase">
        Question {i + 1} of {card.questions.length} · {q.topic}
      </p>
      <p className="mt-1 font-black">{q.q}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {q.options.map((o, k) => (
          <button
            key={k}
            type="button"
            disabled={picked !== null}
            onClick={() => {
              setPicked(k);
              if (k === q.answer) setScore((s) => s + 1);
            }}
            className={cn(
              "rounded-xl border-2 px-3 py-2 text-left text-sm font-bold",
              picked !== null && k === q.answer ? "border-[#15987f] bg-[#e3f5ec]" : picked === k ? "border-[#c8322d] bg-[#fdeceb]" : "border-[#24215e]/10 hover:border-[#5b56c8]",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="mt-3 rounded-xl bg-[#f7f6fb] p-3 text-xs leading-relaxed">
          <b>{picked === q.answer ? "Nice." : "Not quite."}</b> {q.explain}
          <button
            type="button"
            onClick={() => {
              setI(i + 1);
              setPicked(null);
            }}
            className="mt-2 block rounded-full bg-[#24215e] px-4 py-1.5 font-black text-white"
          >
            {i + 1 < card.questions.length ? "Next question" : "See my score"}
          </button>
        </div>
      )}
    </div>
  );
}
