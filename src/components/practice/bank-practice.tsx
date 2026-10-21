"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { CheckCircle2, CircleAlert, Flag, Loader2, XCircle } from "lucide-react";

import { earnSeasonXp, usePass } from "@/components/game/season/pass-store";

type Topic = { level: string; subject: string; topic: string; questions: number; reviewed: number };
type Item = { id: string; level: string; subject: string; topic: string; question_type: string; question: string; marks: number; source: string; licence: string; review_status: string; publish_ready: boolean; selfMarked: boolean };
type Result = { correct: boolean | null; answer: string; explanation: string; marks: number; source: string; licence: string; reviewed: boolean };

/** Practice straight from the Illumed question bank (via /api/questions). */
export function BankPractice({ userId }: { userId: string }) {
  usePass(userId);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState("GCSE");
  const [subject, setSubject] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState({ right: 0, done: 0 });

  useEffect(() => {
    fetch("/api/questions/topics")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Couldn't load subjects.");
        setTopics(j.topics);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const subjects = useMemo(() => [...new Set((topics ?? []).filter((t) => t.level === level).map((t) => t.subject))].sort(), [topics, level]);
  const topicList = useMemo(() => (topics ?? []).filter((t) => t.level === level && t.subject === subject), [topics, level, subject]);
  useEffect(() => {
    if (subjects.length && !subjects.includes(subject)) setSubject(subjects[0]);
  }, [subjects, subject]);

  const start = async () => {
    setBusy(true);
    setError(null);
    const q = new URLSearchParams({ level, subject, limit: "10", ...(topic ? { topic } : {}), ...(open ? { open: "1" } : {}) });
    const r = await fetch(`/api/questions?${q}`);
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Couldn't load questions.");
    if (!j.questions.length) return setError("No questions for that choice yet. Try another topic, or include open questions.");
    setItems(j.questions);
    setI(0);
    setTyped("");
    setResult(null);
    setScore({ right: 0, done: 0 });
  };

  const check = async (selfMark?: boolean) => {
    const q = items?.[i];
    if (!q) return;
    setBusy(true);
    const r = await fetch("/api/questions/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: q.id, answer: typed }) });
    const j = (await r.json()) as Result & { error?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Couldn't check that answer.");
    setResult(j);
    const right = j.correct ?? Boolean(selfMark);
    if (j.correct !== null) {
      setScore((s) => ({ right: s.right + (right ? 1 : 0), done: s.done + 1 }));
      if (right) earnSeasonXp("correct");
    }
  };

  const selfAssess = (right: boolean) => {
    setScore((s) => ({ right: s.right + (right ? 1 : 0), done: s.done + 1 }));
    if (right) earnSeasonXp("correct");
    next();
  };

  const next = () => {
    if (!items) return;
    if (i + 1 >= items.length) {
      earnSeasonXp("quizDone");
      setItems(null);
      return;
    }
    setI(i + 1);
    setTyped("");
    setResult(null);
  };

  if (error && !topics)
    return (
      <div className="rounded-3xl border bg-card p-6">
        <p className="font-bold">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The question bank needs loading into the database first (see data/question-bank). Meanwhile, <Link href="/quizzes" className="underline">quizzes</Link> still work.
        </p>
      </div>
    );

  const q = items?.[i];
  return (
    <div className="space-y-5">
      {!items && (
        <section className="rounded-3xl border bg-card p-5">
          {score.done > 0 && (
            <p className="mb-4 rounded-2xl bg-secondary p-3 font-bold">
              Set complete: {score.right} / {score.done} correct.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm font-bold">
              Level
              <select value={level} onChange={(e) => { setLevel(e.target.value); setTopic(""); }} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
                <option>GCSE</option>
                <option>A-level</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              Subject
              <select value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); }} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              Topic
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
                <option value="">Mixed topics</option>
                {topicList.map((t) => <option key={t.topic} value={t.topic}>{t.topic} ({t.questions})</option>)}
              </select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Include open questions (you mark these yourself against the mark scheme)
          </label>
          <button type="button" disabled={busy || !subject} onClick={() => void start()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Start 10 questions
          </button>
          {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
        </section>
      )}

      {q && (
        <section className="rounded-3xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-bold text-muted-foreground">
              {q.level} {q.subject} · {q.topic} · {q.marks} mark{q.marks === 1 ? "" : "s"}
            </span>
            <span className="font-bold">{i + 1} / {items!.length}</span>
          </div>
          {!q.publish_ready && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff3d6] p-3 text-sm text-[#6b3d00] dark:bg-[#3a2a10] dark:text-[#ffd9a3]">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {q.review_status === "ai_verified"
                ? "Answer checked automatically. Awaiting teacher sign-off: if something looks wrong, report it below."
                : q.review_status === "ai_checked"
                  ? "Checked by AI and awaiting teacher sign-off. If something looks wrong, report it below."
                  : "Draft question, not yet checked by a subject expert. If something looks wrong, report it below."}
            </p>
          )}
          <p className="mt-4 text-xl font-bold">{q.question}</p>
          {!result && (
            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void check();
              }}
            >
              {q.selfMarked ? (
                <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={4} placeholder="Write your answer, then compare it with the mark scheme." className="flex-1 rounded-xl border bg-background px-3 py-2" />
              ) : (
                <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Your answer" aria-label="Your answer" className="flex-1 rounded-xl border bg-background px-3 py-2" />
              )}
              <button type="submit" disabled={busy || (!q.selfMarked && !typed.trim())} className="min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50">
                {q.selfMarked ? "Show mark scheme" : "Check"}
              </button>
            </form>
          )}
          {result && (
            <div className="mt-4 space-y-3">
              {result.correct === true && <p className="flex items-center gap-2 font-bold text-[#0f7a52] dark:text-[#5fd3a5]"><CheckCircle2 className="size-5" aria-hidden /> Correct</p>}
              {result.correct === false && <p className="flex items-center gap-2 font-bold text-destructive"><XCircle className="size-5" aria-hidden /> Not quite</p>}
              <div className="rounded-2xl bg-secondary p-4 text-sm">
                <p><span className="font-bold">{result.correct === null ? "Mark scheme" : "Answer"}:</span> {result.answer}</p>
                {result.explanation && <p className="mt-2">{result.explanation}</p>}
                <p className="mt-3 text-xs text-muted-foreground">Source: {result.source}. {result.licence}.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.correct === null ? (
                  <>
                    <button type="button" onClick={() => selfAssess(true)} className="min-h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground">I got it</button>
                    <button type="button" onClick={() => selfAssess(false)} className="min-h-11 rounded-xl border px-4 font-bold">Not yet</button>
                  </>
                ) : (
                  <button type="button" onClick={next} className="min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground">{i + 1 >= items!.length ? "Finish" : "Next question"}</button>
                )}
                <Link href={`/contact?topic=question&ref=${encodeURIComponent(q.id)}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-4 text-sm font-bold">
                  <Flag className="size-4" aria-hidden /> Report a problem
                </Link>
              </div>
            </div>
          )}
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        These are original IlluminatED practice questions, not past papers, and aren&apos;t endorsed by any exam board. Check your own specification.
      </p>
    </div>
  );
}
