"use client";

import { useActionState, useEffect, useState } from "react";

import Link from "next/link";

import { CalendarClock, Target } from "lucide-react";
import { motion } from "motion/react";

import { Status, Submit } from "@/components/account/forms-common";
import { fieldCls } from "@/components/kit";
import { setExamDate } from "@/lib/account/actions";
import { cn } from "@/lib/utils";

/* ───────────────── Countdown and training plan ───────────────── */

const PHASES = [
  {
    id: "build",
    name: "Build knowledge",
    from: Infinity,
    to: 16,
    target: 40,
    tip: "Work through every topic once. Read the topic page, then quiz it.",
  },
  {
    id: "practise",
    name: "Practise and fill gaps",
    from: 16,
    to: 8,
    target: 60,
    tip: "Go back to your weakest topics. Mixed quizzes help it stick.",
  },
  {
    id: "technique",
    name: "Exam technique",
    from: 8,
    to: 3,
    target: 80,
    tip: "Timed quizzes and full past papers. Mark them with the mark scheme.",
  },
  {
    id: "final",
    name: "Final review",
    from: 3,
    to: 0,
    target: 50,
    tip: "Short, calm sessions on key terms and common mistakes. Sleep well.",
  },
] as const;

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function ExamCountdown({
  examDate,
  examLabel,
  qualification,
  thisWeekAnswered,
}: {
  examDate: string | null;
  /** Formatted on the server so it renders the same everywhere. */
  examLabel: string | null;
  qualification: string;
  thisWeekAnswered: number;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!examDate) return <ExamDatePrompt qualification={qualification} />;

  const exam = new Date(`${examDate}T09:00:00`).getTime();
  const left = now ? exam - now : null;
  const parts = left !== null ? split(left) : null;
  const weeksLeft = left !== null ? left / (7 * 864e5) : null;
  const phaseIndex =
    weeksLeft === null
      ? 0
      : Math.max(
          0,
          PHASES.findIndex((p) => weeksLeft <= p.from && weeksLeft > p.to),
        );
  const phase = PHASES[phaseIndex];
  const passed = left !== null && left <= 0;
  const weekPct = Math.min(1, thisWeekAnswered / phase.target);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <p className="flex items-center gap-2 text-sm font-medium opacity-80">
          <CalendarClock className="size-4" aria-hidden />
          {qualification} exams · {examLabel}
        </p>
        {passed ? (
          <p className="mt-6 text-3xl font-semibold">
            Exam day has arrived. Good luck.
          </p>
        ) : (
          <div
            className="mt-6 grid grid-cols-4 gap-2 sm:gap-3"
            role="timer"
            aria-label={
              parts
                ? `${parts.days} days and ${parts.hours} hours to go`
                : "Counting down"
            }
          >
            {(["days", "hours", "minutes", "seconds"] as const).map((k) => (
              <div
                key={k}
                className="rounded-2xl bg-white/10 px-2 py-4 text-center"
              >
                <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                  {parts
                    ? String(parts[k]).padStart(k === "days" ? 1 : 2, "0")
                    : "–"}
                </p>
                <p className="mt-1 text-[11px] tracking-wide uppercase opacity-70">
                  {k}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-7">
          <p className="text-xs font-medium tracking-wide uppercase opacity-70">
            Your training plan
          </p>
          <ol className="mt-3 grid grid-cols-4 gap-1.5">
            {PHASES.map((p, i) => (
              <li key={p.id}>
                <span
                  className={cn(
                    "block h-1.5 rounded-full",
                    i < phaseIndex
                      ? "bg-white/70"
                      : i === phaseIndex
                        ? "bg-white"
                        : "bg-white/20",
                  )}
                />
                <span
                  className={cn(
                    "mt-2 block text-[11px] leading-tight sm:text-xs",
                    i === phaseIndex ? "font-semibold" : "opacity-60",
                  )}
                >
                  {p.name}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed opacity-90">
            <span className="font-semibold">Now: {phase.name}.</span>{" "}
            {phase.tip}
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="absolute top-5 right-5 text-xs underline underline-offset-4 opacity-70 hover:opacity-100"
        >
          Change date
        </Link>
      </div>

      <div className="bg-card flex flex-col justify-between rounded-3xl border p-6 sm:p-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Target className="text-primary size-4" aria-hidden />
            This week's target
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {phase.target} practice questions for the {phase.name.toLowerCase()}{" "}
            stage.
          </p>
        </div>
        <div className="my-6 flex items-center gap-6">
          <Ring value={weekPct} />
          <div>
            <p className="text-4xl font-semibold tabular-nums">
              {thisWeekAnswered}
              <span className="text-muted-foreground text-xl">
                {" "}
                / {phase.target}
              </span>
            </p>
            <p className="text-muted-foreground text-sm">questions this week</p>
          </div>
        </div>
        <Link
          href="/quizzes?mode=mixed"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
        >
          {weekPct >= 1 ? "Target hit. Keep going" : "Start a mixed quiz"}
        </Link>
      </div>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 100 100"
      className="size-24 shrink-0 -rotate-90"
      role="img"
      aria-label={`${Math.round(value * 100)}% of this week's target`}
    >
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="10"
        className="stroke-muted"
      />
      <motion.circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - value) }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

function ExamDatePrompt({ qualification }: { qualification: string }) {
  const [state, action] = useActionState(setExamDate, null);
  return (
    <div className="bg-card rounded-3xl border p-6 sm:p-8">
      <p className="flex items-center gap-2 font-semibold">
        <CalendarClock className="text-primary size-4" aria-hidden />
        When is your first {qualification} exam?
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        Add the date and we'll count down to it and build a training plan around
        it.
      </p>
      <form action={action} className="mt-5 flex flex-wrap items-center gap-3">
        <label htmlFor="exam-date" className="sr-only">
          Exam date
        </label>
        <input
          id="exam-date"
          name="examDate"
          type="date"
          required
          className={cn(fieldCls, "h-11 w-auto")}
        />
        <Submit>Start the countdown</Submit>
        <Status state={state} />
      </form>
    </div>
  );
}

/* ───────────────── Charts ───────────────── */

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg group-hover:block group-focus-visible:block">
      {children}
    </span>
  );
}

/** Accuracy per subject: one bar per subject, one colour. */
export function SubjectChart({
  rows,
}: {
  rows: { name: string; accuracy: number | null; answered: number }[];
}) {
  return (
    <figure>
      <ul className="space-y-4">
        {rows.map((r, i) => (
          <li key={r.name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{r.name}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {r.accuracy === null
                  ? "Not started"
                  : `${Math.round(r.accuracy * 100)}%`}
              </span>
            </div>
            <div
              tabIndex={0}
              className="group bg-muted relative mt-1.5 h-2.5 rounded-full outline-none"
            >
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                whileInView={{
                  width: `${r.accuracy === null ? 0 : Math.max(3, r.accuracy * 100)}%`,
                }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
              />
              <Tip>
                {r.name}: {r.answered} answered
                {r.accuracy !== null &&
                  `, ${Math.round(r.accuracy * 100)}% correct`}
              </Tip>
            </div>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">
        Percentage of practice questions answered correctly in each subject.
      </figcaption>
    </figure>
  );
}

/** Questions answered per week for the last 8 weeks, with correct answers shaded. */
export function WeeklyChart({
  weeks,
}: {
  weeks: { label: string; answered: number; correct: number }[];
}) {
  const max = Math.max(10, ...weeks.map((w) => w.answered));
  return (
    <figure>
      <div className="flex h-44 items-end gap-2 sm:gap-3" aria-hidden>
        {weeks.map((w, i) => {
          const h = (w.answered / max) * 100;
          const ch = w.answered ? (w.correct / w.answered) * 100 : 0;
          const last = i === weeks.length - 1;
          return (
            <div
              key={w.label}
              tabIndex={0}
              className="group relative flex h-full flex-1 flex-col justify-end outline-none"
            >
              <motion.div
                className={cn(
                  "bg-primary/25 relative flex flex-col justify-end overflow-hidden rounded-t-md",
                  last && "ring-primary/40 ring-2",
                )}
                initial={{ height: 0 }}
                whileInView={{ height: `${Math.max(w.answered ? 3 : 1, h)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
              >
                <div
                  className="bg-primary w-full"
                  style={{ height: `${ch}%` }}
                />
              </motion.div>
              <Tip>
                Week of {w.label}: {w.answered} answered, {w.correct} correct
              </Tip>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3" aria-hidden>
        {weeks.map((w, i) => (
          <span
            key={w.label}
            className={cn(
              "text-muted-foreground flex-1 text-center text-[10px] sm:text-xs",
              i % 2 === 1 && "max-sm:invisible",
            )}
          >
            {i === weeks.length - 1 ? "This wk" : w.label}
          </span>
        ))}
      </div>
      <div className="text-muted-foreground mt-4 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-primary size-2.5 rounded-sm" /> Correct first time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-primary/25 size-2.5 rounded-sm" /> Answered
        </span>
      </div>
      <table className="sr-only">
        <caption>Practice questions per week</caption>
        <thead>
          <tr>
            <th>Week starting</th>
            <th>Answered</th>
            <th>Correct</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.label}>
              <td>{w.label}</td>
              <td>{w.answered}</td>
              <td>{w.correct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const MASTERY = [
  { id: "secure", label: "Secure", cls: "bg-primary" },
  { id: "getting-there", label: "Getting there", cls: "bg-primary/60" },
  { id: "needs-work", label: "Needs work", cls: "bg-primary/30" },
  { id: "not-started", label: "Not started", cls: "bg-muted-foreground/15" },
] as const;

/** How many of your topics are secure, getting there, need work or haven't been started. */
export function MasteryChart({
  counts,
}: {
  counts: Record<(typeof MASTERY)[number]["id"], number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pctSecure = total ? Math.round((counts.secure / total) * 100) : 0;
  return (
    <figure>
      <p className="text-5xl font-semibold tracking-tight tabular-nums">
        {pctSecure}%
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        of your topics are secure ({counts.secure} of {total})
      </p>
      <div
        className="mt-6 flex h-4 gap-0.5 overflow-hidden rounded-full"
        aria-hidden
      >
        {MASTERY.map((m, i) =>
          counts[m.id] ? (
            <motion.div
              key={m.id}
              className={cn("group relative h-full", m.cls)}
              initial={{ flexGrow: 0 }}
              whileInView={{ flexGrow: counts[m.id] }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.08 }}
              style={{ flexBasis: 0 }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {MASTERY.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <span className={cn("size-2.5 shrink-0 rounded-sm", m.cls)} />
            <span className="text-muted-foreground">{m.label}</span>
            <span className="ml-auto font-medium tabular-nums">
              {counts[m.id]}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
