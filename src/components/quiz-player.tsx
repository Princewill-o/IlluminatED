"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { Check, Clock, RotateCcw, SkipForward, Trophy, X } from "lucide-react";

import { SaveRound } from "@/components/account/save-round";
import { Callout, fieldCls, labelCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { COURSES } from "@/lib/data/courses";
import { ROUTES } from "@/lib/data/routes";
import { type BankQuestion, QUESTION_BANK, TOPICS } from "@/lib/data/topics";
import { STORAGE_KEYS, useStored } from "@/lib/storage";
import type { RouteId } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Mode = "quick" | "topic" | "mixed" | "timed";
const MODES: { id: Mode; label: string; help: string }[] = [
  { id: "quick", label: "Quick practice", help: "5 random questions" },
  { id: "topic", label: "Topic review", help: "Every question in one topic" },
  {
    id: "mixed",
    label: "Mixed retrieval",
    help: "10 questions, favouring ones you missed",
  },
  { id: "timed", label: "Timed practice", help: "10 questions in 4 minutes" },
];
const TIMED_SECONDS = 240;

type Progress = Record<string, { seen: number; correct: number; last: number }>;
type Outcome = {
  q: BankQuestion;
  chosen: number | null;
  correct: boolean;
  skipped: boolean;
  retried: boolean;
};

const shuffle = <T,>(a: T[]) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

export function QuizPlayer({
  fixedTopicId,
  initialRoute,
  initialCourse,
  initialMode,
  initialTopic,
}: {
  fixedTopicId?: string;
  initialTopic?: string;
  initialRoute?: RouteId | "all";
  initialCourse?: string;
  initialMode?: Mode;
}) {
  const [progress, setProgress] = useStored<Progress>(STORAGE_KEYS.quiz, {});
  const [mode, setMode] = useState<Mode>(
    fixedTopicId || initialTopic ? "topic" : (initialMode ?? "quick"),
  );
  const [route, setRoute] = useState<RouteId | "all">(initialRoute ?? "all");
  const [course, setCourse] = useState<string>(initialCourse ?? "all");
  const [topic, setTopic] = useState<string>(
    fixedTopicId ?? initialTopic ?? "",
  );

  const [round, setRound] = useState<BankQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [retried, setRetried] = useState(false);
  const [firstWrong, setFirstWrong] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(TIMED_SECONDS);
  const questionRef = useRef<HTMLHeadingElement>(null);

  const courseOptions = useMemo(
    () =>
      COURSES.filter(
        (c) =>
          (route === "all" || c.route === route) &&
          QUESTION_BANK.some((q) => q.courseId === c.id),
      ),
    [route],
  );
  const topicOptions = useMemo(
    () =>
      TOPICS.filter((t) =>
        course === "all"
          ? route === "all" ||
            QUESTION_BANK.some((q) => q.topicId === t.id && q.route === route)
          : COURSES.find((c) => c.id === course)?.topicIds.includes(t.id),
      ),
    [course, route],
  );

  const pool = useMemo(() => {
    if (fixedTopicId)
      return QUESTION_BANK.filter((q) => q.topicId === fixedTopicId);
    if (mode === "topic")
      return topic ? QUESTION_BANK.filter((q) => q.topicId === topic) : [];
    const courseTopics =
      course === "all"
        ? null
        : (COURSES.find((c) => c.id === course)?.topicIds ?? []);
    return QUESTION_BANK.filter(
      (q) =>
        (route === "all" || q.route === route) &&
        (!courseTopics || courseTopics.includes(q.topicId)),
    );
  }, [fixedTopicId, mode, topic, route, course]);

  const start = () => {
    let qs: BankQuestion[];
    if (mode === "topic") qs = shuffle(pool);
    else if (mode === "mixed") {
      const weight = (q: BankQuestion) => {
        const p = progress[q.key];
        if (!p) return 2; // unseen
        return p.correct < p.seen ? 3 : 1; // missed before
      };
      qs = shuffle(pool)
        .sort((a, b) => weight(b) - weight(a))
        .slice(0, 10);
      qs = shuffle(qs);
    } else qs = shuffle(pool).slice(0, mode === "quick" ? 5 : 10);
    setRound(qs);
    setIdx(0);
    setChosen(null);
    setRetried(false);
    setFirstWrong(false);
    setOutcomes([]);
    setSecondsLeft(TIMED_SECONDS);
  };

  const current = round?.[idx];
  const done = round !== null && idx >= round.length;
  const answered = chosen !== null;

  const record = useCallback(
    (q: BankQuestion, correct: boolean) =>
      setProgress((p) => {
        const prev = p[q.key] ?? { seen: 0, correct: 0, last: 0 };
        return {
          ...p,
          [q.key]: {
            seen: prev.seen + 1,
            correct: prev.correct + (correct ? 1 : 0),
            last: Date.now(),
          },
        };
      }),
    [setProgress],
  );

  const choose = useCallback(
    (i: number) => {
      if (!current || answered) return;
      setChosen(i);
      const correct = i === current.answer;
      if (!retried) {
        record(current, correct);
        if (!correct) setFirstWrong(true);
      }
    },
    [current, answered, retried, record],
  );

  const next = useCallback(
    (skipped = false) => {
      if (!current || !round) return;
      setOutcomes((o) => [
        ...o,
        {
          q: current,
          chosen: skipped ? null : chosen,
          correct: !skipped && !firstWrong && chosen === current.answer,
          skipped,
          retried,
        },
      ]);
      setIdx((i) => i + 1);
      setChosen(null);
      setRetried(false);
      setFirstWrong(false);
    },
    [current, round, chosen, firstWrong, retried],
  );

  const retry = () => {
    setChosen(null);
    setRetried(true);
  };

  // Move focus to each new question for keyboard and screen reader users.
  useEffect(() => {
    if (round && !done) questionRef.current?.focus();
  }, [idx, round, done]);

  // Timed mode countdown.
  useEffect(() => {
    if (mode !== "timed" || !round || done) return;
    if (secondsLeft <= 0) {
      setOutcomes((o) => [
        ...o,
        ...round.slice(idx).map((q) => ({
          q,
          chosen: null,
          correct: false,
          skipped: true,
          retried: false,
        })),
      ]);
      setIdx(round.length);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [mode, round, done, secondsLeft, idx]);

  // Keyboard shortcuts: 1–4 choose, Enter next, S skip, R retry.
  useEffect(() => {
    if (!round || done) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (
        /^[1-4]$/.test(e.key) &&
        current &&
        Number(e.key) <= current.options.length
      )
        choose(Number(e.key) - 1);
      else if (e.key === "Enter" && answered) {
        e.preventDefault();
        next();
      } else if (e.key.toLowerCase() === "s" && !answered) next(true);
      else if (
        e.key.toLowerCase() === "r" &&
        answered &&
        !retried &&
        chosen !== current?.answer
      )
        retry();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, done, current, answered, chosen, retried, choose, next]);

  // ——— Setup ———
  if (!round) {
    return (
      <div className="bg-card space-y-5 rounded-xl border p-5 md:p-6">
        {!fixedTopicId && (
          <>
            <fieldset>
              <legend className={labelCls}>Mode</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {MODES.map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      "hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:focus-visible]:ring-ring cursor-pointer rounded-lg border p-3 has-[:focus-visible]:ring-2",
                    )}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={m.id}
                      checked={mode === m.id}
                      onChange={() => setMode(m.id)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold">
                      {m.label}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {m.help}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="qz-route" className={labelCls}>
                  Qualification
                </label>
                <select
                  id="qz-route"
                  className={fieldCls}
                  value={route}
                  onChange={(e) => {
                    setRoute(e.target.value as RouteId | "all");
                    setCourse("all");
                    setTopic("");
                  }}
                >
                  <option value="all">All qualifications</option>
                  {ROUTES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="qz-course" className={labelCls}>
                  Subject
                </label>
                <select
                  id="qz-course"
                  className={fieldCls}
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    setTopic("");
                  }}
                >
                  <option value="all">All subjects</option>
                  {courseOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="qz-topic" className={labelCls}>
                  Topic{" "}
                  {mode !== "topic" && (
                    <span className="text-muted-foreground font-normal">
                      (topic review only)
                    </span>
                  )}
                </label>
                <select
                  id="qz-topic"
                  className={fieldCls}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={mode !== "topic"}
                >
                  <option value="">Choose a topic</option>
                  {topicOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={start} disabled={pool.length === 0}>
            Start{" "}
            {fixedTopicId
              ? "topic quiz"
              : MODES.find((m) => m.id === mode)!.label.toLowerCase()}
          </Button>
          <span className="text-muted-foreground text-sm">
            {pool.length === 0
              ? mode === "topic"
                ? "Choose a topic to begin."
                : "No questions match these filters yet."
              : `${pool.length} question${pool.length === 1 ? "" : "s"} available`}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Keyboard: 1–4 to answer · Enter for next · S to skip · R to retry
          after a wrong answer. Practice scores are for your own learning and
          are not predicted grades.
        </p>
      </div>
    );
  }

  // ——— Summary ———
  if (done) {
    const correct = outcomes.filter((o) => o.correct).length;
    const missed = outcomes.filter((o) => !o.correct);
    const toSave = outcomes
      .filter((o) => !o.skipped)
      .map((o) => ({
        key: o.q.key,
        topicId: o.q.topicId,
        courseId: o.q.courseId,
        correct: o.correct,
      }));
    return (
      <div
        className="bg-card space-y-5 rounded-xl border p-5 md:p-6"
        role="region"
        aria-label="Round summary"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-lg">
            <Trophy aria-hidden />
          </span>
          <div>
            <h3 className="text-2xl font-semibold" tabIndex={-1}>
              {correct} / {outcomes.length} correct first time
            </h3>
            <p className="text-muted-foreground text-sm">
              {mode === "timed" && secondsLeft <= 0 ? "Time's up! " : ""}
              {correct === outcomes.length
                ? "Every one right first time."
                : missed.length
                  ? "Review the ones below, then try a mixed retrieval round later to lock them in."
                  : ""}
            </p>
          </div>
        </div>
        <SaveRound mode={fixedTopicId ? "topic" : mode} answers={toSave} />
        {missed.length > 0 && (
          <div>
            <h4 className="mb-2 font-semibold">To review</h4>
            <ul className="space-y-2">
              {missed.map((o) => (
                <li key={o.q.key} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{o.q.q}</p>
                  <p className="mt-1">
                    <span className="text-success font-semibold">Answer:</span>{" "}
                    {o.q.options[o.q.answer]}
                    {o.skipped && " (skipped)"}
                  </p>
                  <p className="text-muted-foreground mt-1">{o.q.explain}</p>
                  <p className="mt-1 text-xs">
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      href={`/courses/${o.q.courseId}/${o.q.topicId}`}
                    >
                      Revisit: {o.q.topicTitle}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={start}>
            <RotateCcw aria-hidden /> New round
          </Button>
          <Button variant="outline" onClick={() => setRound(null)}>
            Change settings
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Your answers are saved only in this browser. Clear them any time on
          the Your data page.
        </p>
      </div>
    );
  }

  // ——— Question ———
  const q = current!;
  const isRight = answered && chosen === q.answer;
  const reveal = answered && (isRight || retried);
  return (
    <div className="bg-card space-y-5 rounded-xl border p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Question {idx + 1} of {round.length} · {q.subject} · {q.topicTitle}
        </p>
        {mode === "timed" && (
          <span
            className={cn(
              "flex items-center gap-1 text-sm font-semibold tabular-nums",
              secondsLeft <= 30 && "text-destructive",
            )}
            aria-live={
              secondsLeft % 30 === 0 || secondsLeft <= 10 ? "polite" : "off"
            }
          >
            <Clock className="size-4" aria-hidden />{" "}
            {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${(idx / round.length) * 100}%` }}
        />
      </div>
      <h3
        ref={questionRef}
        tabIndex={-1}
        className="text-xl font-semibold outline-none md:text-2xl"
      >
        {q.q}
      </h3>
      <div className="grid gap-2" role="group" aria-label="Answer options">
        {q.options.map((opt, i) => {
          const state = !answered
            ? "idle"
            : i === q.answer && reveal
              ? "right"
              : i === chosen
                ? "wrong"
                : "idle";
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              aria-pressed={chosen === i}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3.5 text-left text-sm transition md:text-base",
                !answered && "hover:border-primary/50 hover:bg-secondary",
                state === "right" && "border-success bg-success-soft",
                state === "wrong" && "border-destructive bg-danger-soft",
                answered && state === "idle" && "opacity-70",
              )}
            >
              <span className="bg-muted grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold">
                {i + 1}
              </span>
              <span className="flex-1">{opt}</span>
              {state === "right" && (
                <Check
                  className="text-success size-5"
                  aria-label="Correct answer"
                />
              )}
              {state === "wrong" && (
                <X
                  className="text-destructive size-5"
                  aria-label="Your answer"
                />
              )}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <Callout
            tone={isRight ? "check" : "warn"}
            title={
              isRight
                ? retried || firstWrong
                  ? "Got it on the retry."
                  : "Correct!"
                : "Not quite."
            }
          >
            {reveal
              ? isRight
                ? q.explain
                : `The answer is "${q.options[q.answer]}". ${q.explain}`
              : "Have another go, or move on. The answer will be in your summary."}
          </Callout>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {answered ? (
          <>
            {!isRight && !retried && (
              <Button variant="outline" onClick={retry}>
                <RotateCcw aria-hidden /> Try again
              </Button>
            )}
            <Button onClick={() => next()}>
              {idx + 1 === round.length ? "See summary" : "Next question"}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => next(true)}>
            <SkipForward aria-hidden /> Skip
          </Button>
        )}
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => setRound(null)}
        >
          End round
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {q.source} · v{q.version} · reviewed{" "}
        {new Date(q.reviewed).toLocaleDateString("en-GB")}
      </p>
    </div>
  );
}
