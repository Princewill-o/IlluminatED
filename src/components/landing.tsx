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
    title: "Your progress, at a glance",
    text: "See your subjects, spot the tricky topics, and know what to revise next.",
    href: "/dashboard",
    action: "See your dashboard",
    tint: "bg-[#e8f2ff]",
    accent: "bg-[#3968e8]",
    kind: "dashboard",
  },
  {
    icon: CalendarClock,
    title: "Get exam-day ready",
    text: "Set your exam date, follow a plan, and practise with a proper timer.",
    href: "/exam-mode",
    action: "Try exam mode",
    tint: "bg-[#fff0d9]",
    accent: "bg-[#f39d27]",
    kind: "countdown",
  },
  {
    icon: Calculator,
    title: "Make your marks count",
    text: "Check your grade and see what you need on the papers still to come.",
    href: "/calculator",
    action: "Explore calculators",
    tint: "bg-[#e9f8e9]",
    accent: "bg-[#37a977]",
    kind: "calculator",
  },
  {
    icon: Sparkles,
    title: "Make practice stick",
    text: "Answer quick quizzes, flip flashcards, and build a correct-answer streak.",
    href: "/quizzes",
    action: "Start a quiz",
    tint: "bg-[#f2eaff]",
    accent: "bg-[#8b62d9]",
    kind: "quiz",
  },
  {
    icon: GraduationCap,
    title: "Get unstuck together",
    text: "Ask for a tutor when a topic needs more than another practice round.",
    href: "/tutors",
    action: "Find help",
    tint: "bg-[#ffe9e6]",
    accent: "bg-[#ee7666]",
    kind: "tutors",
  },
  {
    icon: MessagesSquare,
    title: "IlluminatEDSocial",
    text: "Ask students about sixth form, university, apprenticeships and life after exams.",
    href: "/social",
    action: "Explore Social",
    tint: "bg-[#e4f8fa]",
    accent: "bg-[#36a8bb]",
    kind: "social",
  },
] as const;

function FeatureSnapshot({ kind }: { kind: (typeof FEATURES)[number]["kind"] }) {
  return (
    <div className="relative h-44 overflow-hidden rounded-[1.4rem] border-2 border-[#17223b] bg-white p-3 text-[#17223b] shadow-[5px_6px_0_#17223b] sm:h-48" aria-hidden>
      <div className="mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <span className="size-2 rounded-full bg-[#ff7778]" /><span className="size-2 rounded-full bg-[#ffca55]" /><span className="size-2 rounded-full bg-[#69c997]" />
        <span className="ml-auto text-[9px] font-bold tracking-wide text-slate-400">illuminatED</span>
      </div>
      {kind === "dashboard" && <div className="space-y-2 text-[10px]">
        <p className="font-bold">Hi, Maya! Your study plan 👋</p>
        <div className="grid grid-cols-3 gap-1.5 text-center"><span className="rounded-lg bg-blue-100 p-2"><b className="block text-sm">128</b>answered</span><span className="rounded-lg bg-yellow-100 p-2"><b className="block text-sm">74%</b>correct</span><span className="rounded-lg bg-green-100 p-2"><b className="block text-sm">42</b>days left</span></div>
        <p className="font-bold">Revise next</p><div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5"><span>Linear equations</span><span className="rounded bg-blue-600 px-2 py-0.5 text-white">Quiz</span></div>
      </div>}
      {kind === "countdown" && <div className="text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Exam mode</p><p className="mt-2 text-4xl font-black tabular-nums">01:30:00</p><p className="mt-1 text-[10px] text-slate-500">Your paper. Your time. Your focus.</p><div className="mx-auto mt-3 w-28 rounded-full bg-[#17223b] px-3 py-1 text-[10px] font-bold text-white">Start timer ▶</div></div>}
      {kind === "calculator" && <div className="space-y-2 text-[10px]"><p className="font-bold">What grade am I on track for?</p><div className="flex items-center justify-between rounded-lg bg-green-50 p-2"><span>Paper 1 · 58/80</span><span className="font-bold">72%</span></div><div className="flex items-center justify-between rounded-lg bg-green-50 p-2"><span>Paper 2 · target</span><span className="font-bold">65/80</span></div><p className="rounded-lg bg-[#17223b] p-2 font-bold text-white">Your next goal: 7 more marks ↗</p></div>}
      {kind === "quiz" && <div className="space-y-1.5 text-[10px]"><div className="flex justify-between text-slate-500"><span>Quick practice</span><span>3 of 5</span></div><p className="font-bold">What is 15% of £80?</p><div className="rounded-lg border px-2 py-1">£10</div><div className="rounded-lg border-2 border-violet-500 bg-violet-50 px-2 py-1 font-bold">£12 ✓</div><p className="text-violet-800">🔥 4 right in a row</p></div>}
      {kind === "tutors" && <div className="space-y-2 text-[10px]"><p className="font-bold">What do you need help with?</p><div className="rounded-lg bg-rose-50 p-2">📐 Maths · Linear equations</div><div className="rounded-lg bg-rose-50 p-2">💬 Homework help · This week</div><p className="rounded-lg bg-[#17223b] p-2 text-center font-bold text-white">Request a tutor →</p></div>}
      {kind === "social" && <div className="space-y-2 text-[10px]"><p className="font-bold">IlluminatED<span className="text-cyan-700">Social</span> 💬</p><div className="rounded-lg bg-cyan-50 p-2"><b>Sixth form</b><p>What should I ask at an open day?</p></div><div className="rounded-lg bg-cyan-50 p-2"><b>Apprenticeships</b><p>How did you find your first role?</p></div></div>}
    </div>
  );
}

export function FeatureGrid() {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {FEATURES.map((f, i) => (
        <motion.li
          key={f.title}
          {...reveal}
          transition={{ ...reveal.transition, delay: (i % 3) * 0.08 }}
          whileHover={{ y: -6, rotate: i % 2 ? 0.5 : -0.5 }}
          className={cn("relative overflow-hidden rounded-[2rem] border-2 border-[#17223b] p-5 text-[#17223b] shadow-[7px_8px_0_#17223b] transition-shadow sm:p-6", f.tint)}
        >
          <span aria-hidden className="absolute -right-5 -top-5 size-20 rounded-full border-4 border-[#17223b]/10" />
          <span className={cn("relative grid size-12 place-items-center rounded-2xl border-2 border-[#17223b] text-white shadow-[3px_3px_0_#17223b]", f.accent)}>
            <f.icon className="size-6" aria-hidden />
          </span>
          <div className="mt-5 -rotate-1"><FeatureSnapshot kind={f.kind} /></div>
          <h3 className="mt-6 text-xl font-black tracking-tight">
            {f.title}
          </h3>
          <p className="mt-2 min-h-12 text-sm leading-relaxed text-[#40506d]">
            {f.text}
          </p>
          <Link href={f.href} className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-[#17223b] bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_#17223b] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17223b]">{f.action}<span aria-hidden>↗</span></Link>
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
