"use client";

import { useMemo, useState } from "react";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

import { fieldCls, labelCls } from "@/components/kit";
import { cn } from "@/lib/utils";

export type CalcKind = "gcse" | "alevel" | "weighted";

/** Example boundaries only, as a % of the total. Real boundaries change every year and differ by board, subject and tier. */
const EXAMPLE_BOUNDARIES: Record<
  "gcse" | "alevel",
  { grade: string; pct: number }[]
> = {
  gcse: [
    { grade: "9", pct: 78 },
    { grade: "8", pct: 68 },
    { grade: "7", pct: 58 },
    { grade: "6", pct: 48 },
    { grade: "5", pct: 38 },
    { grade: "4", pct: 29 },
    { grade: "3", pct: 20 },
    { grade: "2", pct: 12 },
    { grade: "1", pct: 5 },
  ],
  alevel: [
    { grade: "A*", pct: 80 },
    { grade: "A", pct: 70 },
    { grade: "B", pct: 60 },
    { grade: "C", pct: 50 },
    { grade: "D", pct: 40 },
    { grade: "E", pct: 30 },
  ],
};

interface Paper {
  id: number;
  name: string;
  mark: string;
  max: string;
}

const num = (s: string) => {
  const n = Number(s);
  return s.trim() !== "" && Number.isFinite(n) ? n : null;
};

const TABS: { id: CalcKind; label: string }[] = [
  { id: "gcse", label: "GCSE (9 to 1)" },
  { id: "alevel", label: "A level (A* to E)" },
  { id: "weighted", label: "BTEC, T Level and coursework" },
];

export function GradeCalculator({ initial }: { initial: CalcKind }) {
  const [kind, setKind] = useState<CalcKind>(initial);
  return (
    <div>
      <div
        role="tablist"
        aria-label="Qualification"
        className="bg-muted inline-flex flex-wrap gap-1 rounded-2xl p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={kind === t.id}
            onClick={() => setKind(t.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              kind === t.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {kind === "weighted" ? (
          <WeightedCalc />
        ) : (
          <PaperCalc key={kind} kind={kind} />
        )}
      </div>
    </div>
  );
}

/* ───────────── GCSE and A level: papers + boundaries ───────────── */

function PaperCalc({ kind }: { kind: "gcse" | "alevel" }) {
  const [papers, setPapers] = useState<Paper[]>([
    { id: 1, name: "Paper 1", mark: "54", max: "80" },
    { id: 2, name: "Paper 2", mark: "47", max: "80" },
    { id: 3, name: "Paper 3", mark: "", max: "80" },
  ]);
  const [bounds, setBounds] = useState(EXAMPLE_BOUNDARIES[kind]);
  const [target, setTarget] = useState(kind === "gcse" ? "7" : "A");

  const r = useMemo(() => {
    const total = papers.reduce((a, p) => a + (num(p.max) ?? 0), 0);
    const sat = papers.filter((p) => num(p.mark) !== null);
    const got = sat.reduce((a, p) => a + (num(p.mark) ?? 0), 0);
    const satMax = sat.reduce((a, p) => a + (num(p.max) ?? 0), 0);
    const remainingMax = total - satMax;
    const pctSoFar = satMax ? (got / satMax) * 100 : null;
    const gradeFor = (pct: number) =>
      bounds.find((b) => pct >= b.pct)?.grade ?? "U";
    const currentGrade = pctSoFar === null ? null : gradeFor(pctSoFar);
    const t = bounds.find((b) => b.grade === target);
    const needTotal = t ? Math.ceil((t.pct / 100) * total) : 0;
    const needRemaining = needTotal - got;
    const nextUp =
      pctSoFar === null
        ? null
        : [...bounds].reverse().find((b) => b.pct > pctSoFar);
    return {
      total,
      got,
      satMax,
      remainingMax,
      pctSoFar,
      currentGrade,
      needTotal,
      needRemaining,
      nextUp,
      allSat: remainingMax === 0 && satMax > 0,
    };
  }, [papers, bounds, target]);

  const update = (id: number, patch: Partial<Paper>) =>
    setPapers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const invalid = papers.some((p) => {
    const m = num(p.mark);
    const mx = num(p.max);
    return m !== null && mx !== null && (m < 0 || m > mx);
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-8">
        <fieldset>
          <legend className={cn(labelCls, "text-base")}>Your papers</legend>
          <p className="text-muted-foreground -mt-1 mb-4 text-sm">
            Leave the mark blank for papers you haven't sat yet.
          </p>
          <ul className="space-y-2">
            {papers.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[1fr_5.5rem_5.5rem_2.5rem] items-center gap-2"
              >
                <input
                  aria-label="Paper name"
                  value={p.name}
                  onChange={(e) => update(p.id, { name: e.target.value })}
                  className={cn(fieldCls, "h-11")}
                />
                <input
                  aria-label={`${p.name} mark`}
                  inputMode="numeric"
                  placeholder="Mark"
                  value={p.mark}
                  onChange={(e) =>
                    update(p.id, {
                      mark: e.target.value.replace(/[^\d.]/g, ""),
                    })
                  }
                  className={cn(fieldCls, "h-11 text-center tabular-nums")}
                />
                <input
                  aria-label={`${p.name} out of`}
                  inputMode="numeric"
                  placeholder="Out of"
                  value={p.max}
                  onChange={(e) =>
                    update(p.id, { max: e.target.value.replace(/[^\d.]/g, "") })
                  }
                  className={cn(fieldCls, "h-11 text-center tabular-nums")}
                />
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  disabled={papers.length <= 1}
                  onClick={() =>
                    setPapers((ps) => ps.filter((x) => x.id !== p.id))
                  }
                  className="hover:bg-muted grid size-10 place-items-center rounded-full disabled:opacity-30"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <div className="text-muted-foreground mt-2 grid grid-cols-[1fr_5.5rem_5.5rem_2.5rem] gap-2 text-center text-xs">
            <span />
            <span>Your mark</span>
            <span>Out of</span>
            <span />
          </div>
          <button
            type="button"
            onClick={() =>
              setPapers((ps) => [
                ...ps,
                {
                  id: Math.max(0, ...ps.map((x) => x.id)) + 1,
                  name: `Paper ${ps.length + 1}`,
                  mark: "",
                  max: "80",
                },
              ])
            }
            className="text-primary mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
          >
            <Plus className="size-4" aria-hidden /> Add a paper
          </button>
          {invalid && (
            <p role="alert" className="text-destructive mt-2 text-sm">
              A mark is higher than the paper's total.
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className={cn(labelCls, "text-base")}>
            Grade boundaries
          </legend>
          <p className="text-muted-foreground -mt-1 mb-4 text-sm leading-relaxed">
            These are{" "}
            <span className="text-foreground font-medium">example</span>{" "}
            boundaries as a percentage of the total. Replace them with your
            board's published boundaries for your subject, tier and year (search
            "grade boundaries" on your exam board's website).
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {bounds.map((b, i) => (
              <label
                key={b.grade}
                className="bg-muted/50 rounded-xl border p-2.5"
              >
                <span className="text-muted-foreground block text-xs">
                  Grade {b.grade}
                </span>
                <span className="mt-1 flex items-baseline gap-1">
                  <input
                    inputMode="numeric"
                    value={b.pct}
                    onChange={(e) => {
                      const v = Math.min(
                        100,
                        Number(e.target.value.replace(/\D/g, "")) || 0,
                      );
                      setBounds((bs) =>
                        bs.map((x, j) => (j === i ? { ...x, pct: v } : x)),
                      );
                    }}
                    className="w-full bg-transparent text-lg font-semibold tabular-nums outline-none"
                    aria-label={`Minimum percentage for grade ${b.grade}`}
                  />
                  <span className="text-muted-foreground text-sm">%</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBounds(EXAMPLE_BOUNDARIES[kind])}
            className="text-muted-foreground hover:text-foreground mt-3 inline-flex items-center gap-1.5 text-sm"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Reset to examples
          </button>
        </fieldset>
      </div>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <div
          className="bg-card rounded-3xl border p-6 sm:p-7"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-sm">
                {r.allSat ? "Your grade" : "On the papers you've sat"}
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">
                {r.got}
                <span className="text-muted-foreground text-xl">
                  {" "}
                  / {r.satMax || "–"}
                </span>
              </p>
              <p className="text-muted-foreground text-sm tabular-nums">
                {r.pctSoFar === null
                  ? "Enter a mark to start"
                  : `${r.pctSoFar.toFixed(1)}%`}
              </p>
            </div>
            <motion.div
              key={r.currentGrade ?? "none"}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-primary text-primary-foreground grid size-20 place-items-center rounded-2xl text-4xl font-semibold"
              aria-label={
                r.currentGrade ? `Grade ${r.currentGrade}` : "No grade yet"
              }
            >
              {r.currentGrade ?? "–"}
            </motion.div>
          </div>

          {r.pctSoFar !== null && r.nextUp && (
            <p className="mt-4 text-sm">
              You're{" "}
              <span className="font-semibold">
                {Math.max(
                  1,
                  Math.ceil((r.nextUp.pct / 100) * r.satMax) - r.got,
                )}{" "}
                marks
              </span>{" "}
              away from a {r.nextUp.grade} on these papers.
            </p>
          )}

          <BoundaryBar total={r.total} got={r.got} bounds={bounds} />

          <div className="mt-6 border-t pt-6">
            <label htmlFor="target" className={labelCls}>
              Your target grade
            </label>
            <select
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={cn(fieldCls, "h-11")}
            >
              {bounds.map((b) => (
                <option key={b.grade} value={b.grade}>
                  {kind === "gcse" ? `Grade ${b.grade}` : b.grade}
                </option>
              ))}
            </select>
            <TargetAdvice
              got={r.got}
              needTotal={r.needTotal}
              needRemaining={r.needRemaining}
              remainingMax={r.remainingMax}
              target={target}
              total={r.total}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BoundaryBar({
  total,
  got,
  bounds,
}: {
  total: number;
  got: number;
  bounds: { grade: string; pct: number }[];
}) {
  const pct = total ? Math.min(100, (got / total) * 100) : 0;
  return (
    <div className="mt-6" aria-hidden>
      <div className="bg-muted relative h-3 rounded-full">
        <motion.div
          className="bg-primary h-full rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {bounds.map((b) => (
          <span
            key={b.grade}
            className="bg-background absolute top-0 h-full w-0.5"
            style={{ left: `${b.pct}%` }}
          />
        ))}
      </div>
      <div className="relative mt-1.5 h-4">
        {bounds.map((b) => (
          <span
            key={b.grade}
            className="text-muted-foreground absolute -translate-x-1/2 text-[10px]"
            style={{ left: `${b.pct}%` }}
          >
            {b.grade}
          </span>
        ))}
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        Your marks so far out of the whole qualification ({total} marks).
      </p>
    </div>
  );
}

function TargetAdvice({
  got,
  needTotal,
  needRemaining,
  remainingMax,
  target,
  total,
}: {
  got: number;
  needTotal: number;
  needRemaining: number;
  remainingMax: number;
  target: string;
  total: number;
}) {
  if (!total) return null;
  let tone: "good" | "plan" | "hard" = "plan";
  let text: React.ReactNode;
  if (needRemaining <= 0) {
    tone = "good";
    text = (
      <>
        You already have the {needTotal} marks a {target} needs. Keep your
        standard up on the rest.
      </>
    );
  } else if (remainingMax === 0) {
    tone = "hard";
    text = (
      <>
        You were {needRemaining} marks short of a {target} ({got} of {needTotal}{" "}
        needed).
      </>
    );
  } else if (needRemaining > remainingMax) {
    tone = "hard";
    text = (
      <>
        A {target} needs {needTotal} marks overall. Even full marks on what's
        left ({remainingMax}) would leave you {needRemaining - remainingMax}{" "}
        short, so check your boundaries or aim one grade lower for now.
      </>
    );
  } else {
    const avg = Math.round((needRemaining / remainingMax) * 100);
    text = (
      <>
        For a {target} you need{" "}
        <span className="font-semibold">
          {needRemaining} of the {remainingMax} marks left ({avg}%)
        </span>{" "}
        on the papers you haven't sat.{" "}
        {avg >= 85
          ? "That's a stretch: focus on your strongest topics and exam technique."
          : avg >= 60
            ? "Achievable with steady past-paper practice."
            : "Well within reach if you keep practising."}
      </>
    );
  }
  return (
    <p
      className={cn(
        "mt-4 rounded-2xl px-4 py-3 text-sm leading-relaxed",
        tone === "good" && "bg-success-soft",
        tone === "plan" && "bg-primary/10",
        tone === "hard" && "bg-danger-soft",
      )}
    >
      {text}
    </p>
  );
}

/* ───────────── Weighted components (BTEC, T Level, coursework) ───────────── */

interface Comp {
  id: number;
  name: string;
  weight: string;
  score: string;
}

function WeightedCalc() {
  const [comps, setComps] = useState<Comp[]>([
    { id: 1, name: "Unit 1 exam", weight: "25", score: "62" },
    { id: 2, name: "Unit 2 assignment", weight: "25", score: "71" },
    { id: 3, name: "Unit 3 exam", weight: "25", score: "" },
    { id: 4, name: "Unit 4 assignment", weight: "25", score: "" },
  ]);
  const [target, setTarget] = useState("70");

  const r = useMemo(() => {
    const totalW = comps.reduce((a, c) => a + (num(c.weight) ?? 0), 0);
    const done = comps.filter((c) => num(c.score) !== null);
    const doneW = done.reduce((a, c) => a + (num(c.weight) ?? 0), 0);
    const earned = done.reduce(
      (a, c) => a + ((num(c.weight) ?? 0) * (num(c.score) ?? 0)) / 100,
      0,
    );
    const soFar = doneW ? (earned / doneW) * 100 : null;
    const leftW = totalW - doneW;
    const t = num(target) ?? 0;
    const need =
      leftW > 0 ? ((t / 100) * totalW - earned) / (leftW / 100) : null;
    return { totalW, doneW, soFar, leftW, need, t };
  }, [comps, target]);

  const update = (id: number, patch: Partial<Comp>) =>
    setComps((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <fieldset>
        <legend className={cn(labelCls, "text-base")}>
          Units, components or assignments
        </legend>
        <p className="text-muted-foreground -mt-1 mb-4 text-sm leading-relaxed">
          Give each part its weighting (from your specification) and your score
          as a percentage. Leave the score blank for parts still to come. For
          BTEC grades, use your teacher's marks or the percentage for each unit.
        </p>
        <ul className="space-y-2">
          {comps.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[1fr_5rem_5rem_2.5rem] items-center gap-2"
            >
              <input
                aria-label="Name"
                value={c.name}
                onChange={(e) => update(c.id, { name: e.target.value })}
                className={cn(fieldCls, "h-11")}
              />
              <input
                aria-label={`${c.name} weighting percent`}
                inputMode="numeric"
                value={c.weight}
                onChange={(e) =>
                  update(c.id, {
                    weight: e.target.value.replace(/[^\d.]/g, ""),
                  })
                }
                className={cn(fieldCls, "h-11 text-center tabular-nums")}
              />
              <input
                aria-label={`${c.name} score percent`}
                inputMode="numeric"
                placeholder="–"
                value={c.score}
                onChange={(e) =>
                  update(c.id, { score: e.target.value.replace(/[^\d.]/g, "") })
                }
                className={cn(fieldCls, "h-11 text-center tabular-nums")}
              />
              <button
                type="button"
                aria-label={`Remove ${c.name}`}
                disabled={comps.length <= 1}
                onClick={() =>
                  setComps((cs) => cs.filter((x) => x.id !== c.id))
                }
                className="hover:bg-muted grid size-10 place-items-center rounded-full disabled:opacity-30"
              >
                <Minus className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="text-muted-foreground mt-2 grid grid-cols-[1fr_5rem_5rem_2.5rem] gap-2 text-center text-xs">
          <span />
          <span>Weight %</span>
          <span>Score %</span>
          <span />
        </div>
        <button
          type="button"
          onClick={() =>
            setComps((cs) => [
              ...cs,
              {
                id: Math.max(0, ...cs.map((x) => x.id)) + 1,
                name: `Part ${cs.length + 1}`,
                weight: "",
                score: "",
              },
            ])
          }
          className="text-primary mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
        >
          <Plus className="size-4" aria-hidden /> Add a part
        </button>
        {r.totalW !== 100 && (
          <p className="text-muted-foreground mt-3 text-sm">
            Your weightings add up to {r.totalW}%. They usually add up to 100%.
          </p>
        )}
      </fieldset>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <div
          className="bg-card rounded-3xl border p-6 sm:p-7"
          aria-live="polite"
        >
          <p className="text-muted-foreground text-sm">Average so far</p>
          <p className="mt-1 text-5xl font-semibold tabular-nums">
            {r.soFar === null ? "–" : `${r.soFar.toFixed(1)}%`}
          </p>
          <p className="text-muted-foreground text-sm">
            {r.doneW}% of the qualification completed
          </p>
          <div
            className="bg-muted mt-5 h-3 overflow-hidden rounded-full"
            aria-hidden
          >
            <motion.div
              className="bg-primary h-full"
              animate={{
                width: `${Math.min(100, r.totalW ? (r.doneW / r.totalW) * 100 : 0)}%`,
              }}
            />
          </div>
          <div className="mt-6 border-t pt-6">
            <label htmlFor="w-target" className={labelCls}>
              Target overall percentage
            </label>
            <input
              id="w-target"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ""))}
              className={cn(fieldCls, "h-11 w-32 tabular-nums")}
            />
            <p
              className={cn(
                "mt-4 rounded-2xl px-4 py-3 text-sm leading-relaxed",
                r.need === null
                  ? "bg-primary/10"
                  : r.need <= 0
                    ? "bg-success-soft"
                    : r.need > 100
                      ? "bg-danger-soft"
                      : "bg-primary/10",
              )}
            >
              {r.need === null
                ? "Everything is complete. Your final average is shown above."
                : r.need <= 0
                  ? `You've already secured ${r.t}% overall, even with zero on what's left.`
                  : r.need > 100
                    ? `Reaching ${r.t}% would need more than 100% on the remaining ${r.leftW}%. Aim a little lower, or check the weightings.`
                    : `You need an average of ${Math.ceil(r.need)}% on the remaining ${r.leftW}% of the qualification to reach ${r.t}% overall.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
