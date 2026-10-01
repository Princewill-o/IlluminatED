"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  BarChart3,
  Calculator,
  CalendarClock,
  GraduationCap,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

/** Example exam dates for the landing-page countdown (illustrative, not official). */
const EXAMPLES = [
  {
    id: "gcse",
    label: "GCSE",
    date: "2027-05-10T09:00:00",
    note: "Summer exam series",
  },
  {
    id: "alevel",
    label: "A level",
    date: "2027-05-17T09:00:00",
    note: "Summer exam series",
  },
  {
    id: "btec",
    label: "BTEC",
    date: "2027-01-11T09:00:00",
    note: "January external assessment",
  },
  {
    id: "tlevel",
    label: "T Level",
    date: "2027-06-07T09:00:00",
    note: "Core exams",
  },
] as const;

function useNow(ms = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function split(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function CountdownDemo() {
  const [pick, setPick] = useState<(typeof EXAMPLES)[number]["id"]>("gcse");
  const ex = EXAMPLES.find((e) => e.id === pick)!;
  const now = useNow();
  const left = now ? split(new Date(ex.date).getTime() - now) : null;
  return (
    <div className="bg-card rounded-3xl border p-5 shadow-[0_20px_50px_-30px_rgb(15_23_42/0.4)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="text-primary size-4" aria-hidden />
          Countdown to your exams
        </p>
        <div
          role="group"
          aria-label="Qualification"
          className="bg-muted flex gap-1 rounded-full p-1"
        >
          {EXAMPLES.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={pick === e.id}
              onClick={() => setPick(e.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                pick === e.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3" aria-live="off">
        {(["days", "hours", "minutes", "seconds"] as const).map((k) => (
          <div
            key={k}
            className="bg-muted/60 rounded-2xl px-2 py-4 text-center"
          >
            <motion.p
              key={`${pick}-${k}-${left?.[k]}`}
              initial={{ opacity: 0.4, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
            >
              {left ? String(left[k]).padStart(k === "days" ? 1 : 2, "0") : "–"}
            </motion.p>
            <p className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">
              {k}
            </p>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground mt-4 text-xs">
        Example date: {ex.note}. Your dashboard counts down to the date you
        enter.
      </p>
    </div>
  );
}

const GCSE_EXAMPLE = [
  { g: "9", pct: 78 },
  { g: "8", pct: 68 },
  { g: "7", pct: 58 },
  { g: "6", pct: 48 },
  { g: "5", pct: 38 },
  { g: "4", pct: 29 },
  { g: "3", pct: 20 },
  { g: "2", pct: 12 },
  { g: "1", pct: 5 },
];

export function GradeDemo() {
  const [mark, setMark] = useState(142);
  const total = 240;
  const pct = Math.round((mark / total) * 100);
  const grade = useMemo(
    () => GCSE_EXAMPLE.find((b) => pct >= b.pct)?.g ?? "U",
    [pct],
  );
  const next = [...GCSE_EXAMPLE].reverse().find((b) => b.pct > pct);
  const toNext = next ? Math.ceil((next.pct / 100) * total) - mark : 0;
  return (
    <div className="bg-card rounded-3xl border p-5 shadow-[0_20px_50px_-30px_rgb(15_23_42/0.4)] sm:p-7">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="text-primary size-4" aria-hidden />
        Grade calculator
      </p>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs">Your total</p>
          <p className="text-3xl font-semibold tabular-nums">
            {mark}
            <span className="text-muted-foreground text-lg"> / {total}</span>
          </p>
        </div>
        <motion.div
          key={grade}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-primary text-primary-foreground grid size-16 place-items-center rounded-2xl text-3xl font-semibold"
          aria-label={`Grade ${grade}`}
        >
          {grade}
        </motion.div>
      </div>
      <label htmlFor="demo-mark" className="sr-only">
        Drag to change your total mark
      </label>
      <input
        id="demo-mark"
        type="range"
        min={0}
        max={total}
        value={mark}
        onChange={(e) => setMark(Number(e.target.value))}
        className="accent-primary mt-5 w-full"
      />
      <p className="mt-3 text-sm">
        {next ? (
          <>
            <span className="font-semibold">{toNext} more marks</span> for a
            grade {next.g}.
          </>
        ) : (
          <span className="font-semibold">Top grade. Keep it there.</span>
        )}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        Drag the slider. Example boundaries only; the real calculator uses your
        board's.
      </p>
    </div>
  );
}

const FEATURES = [
  {
    icon: BarChart3,
    title: "A dashboard that knows your subjects",
    text: "Charts of your scores by subject and topic, and a list of exactly what to revise next.",
  },
  {
    icon: CalendarClock,
    title: "Train towards exam day",
    text: "A live countdown from the date you enter, with a plan that changes as the exams get closer.",
  },
  {
    icon: Calculator,
    title: "Grade calculators",
    text: "Work out your grade and what you need on the papers you haven't sat yet, for GCSE, A level, BTEC and more.",
  },
  {
    icon: Sparkles,
    title: "Quizzes and flashcards",
    text: "Short practice rounds with an explanation for every answer, saved to your account.",
  },
  {
    icon: GraduationCap,
    title: "Tutors when you're stuck",
    text: "One-to-one help with homework, coursework guidance and exam prep. You choose how fast.",
  },
  {
    icon: MessagesSquare,
    title: "IlluminatEDSocial",
    text: "Ask students who've been there about sixth form, universities and apprenticeships.",
  },
];

export function FeatureGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f, i) => (
        <motion.li
          key={f.title}
          {...reveal}
          transition={{ ...reveal.transition, delay: (i % 3) * 0.08 }}
          whileHover={{ y: -4 }}
          className="bg-card rounded-3xl border p-6 transition-shadow hover:shadow-[0_18px_40px_-28px_rgb(15_23_42/0.5)]"
        >
          <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-2xl">
            <f.icon className="size-5" aria-hidden />
          </span>
          <h3 className="mt-5 text-lg font-semibold tracking-tight">
            {f.title}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {f.text}
          </p>
        </motion.li>
      ))}
    </ul>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      {...reveal}
      transition={{ ...reveal.transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function CtaButtons({ center }: { center?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        center && "justify-center",
      )}
    >
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <Link
          href="/sign-in?mode=sign-up"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 items-center rounded-full px-6 text-base font-semibold"
        >
          Create your free account
        </Link>
      </motion.div>
      <Link
        href="/sign-in"
        className="hover:bg-muted inline-flex h-12 items-center rounded-full border px-6 text-base font-semibold"
      >
        Sign in
      </Link>
    </div>
  );
}
