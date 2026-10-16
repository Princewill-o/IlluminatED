"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Briefcase, GraduationCap, Sparkles, Trophy, X } from "lucide-react";

import { TaskCard } from "./task-card";

import { finishWorkShift, sitInterview } from "@/app/games/careers/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { AvatarFigure } from "@/components/game/avatar";
import { CompanyLogo } from "@/components/game/company-logo";
import { INTERVIEW_PASS, PROMOTION, SKILLS, type Role, type Workplace, buildInterview, buildShift, roleOf, workplaceById } from "@/game/core/careers";
import type { Avatar } from "@/game/core/cosmetics";
import { newSeed } from "@/game/core/rng";
import { cn } from "@/lib/utils";

export interface ActiveJob {
  workplace: string;
  role: string;
  rank: number;
  shifts: number;
  rankShifts: number;
  rankCorrect: number;
  rankTotal: number;
}

/** Interview: three questions, then the employer decides. */
export function Interview({ workplace, onHired, onClose }: { workplace: Workplace; onHired: () => void; onClose: () => void }) {
  const role = workplace.roles[0];
  const seed = useRef(newSeed());
  const tasks = useMemo(() => buildInterview(role, seed.current), [role]);
  const started = useRef(Date.now());
  const [i, setI] = useState(-1);
  const [correct, setCorrect] = useState(0);
  const [outcome, setOutcome] = useState<{ passed: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  const finish = (c: number) =>
    start(async () => {
      const r = await sitInterview(workplace.id, c, Date.now() - started.current);
      if (!r.ok) setOutcome({ passed: false, error: r.error });
      else {
        setOutcome({ passed: r.data.passed });
        if (r.data.passed) onHired();
      }
    });

  if (i === -1)
    return (
      <Panel onClose={onClose} title={`Interview: ${role.title}`} workplace={workplace}>
        <p className="leading-7">
          {workplace.name} is hiring a <strong>{role.title}</strong>. {role.summary}
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>3 questions: one about you, two about the job.</li>
          <li>
            Get {INTERVIEW_PASS} right to be hired. Starting pay: <strong className="text-foreground">{role.pay} Clout a shift</strong>.
          </li>
        </ul>
        <button type="button" onClick={() => setI(0)} className="mt-5 w-full rounded-full bg-brand py-3 font-black text-white">
          Start the interview
        </button>
      </Panel>
    );

  if (i < tasks.length)
    return (
      <Panel onClose={onClose} title={`Interview: ${role.title}`} workplace={workplace}>
        <TaskCard
          key={i}
          task={tasks[i]}
          index={i}
          total={tasks.length}
          onDone={(ok) => {
            const c = correct + (ok ? 1 : 0);
            setCorrect(c);
            if (i + 1 === tasks.length) finish(c);
            setI(i + 1);
          }}
        />
      </Panel>
    );

  return (
    <Panel onClose={onClose} title="Interview result" workplace={workplace}>
      {pending || !outcome ? (
        <p>The panel is deciding…</p>
      ) : outcome.error ? (
        <p className="text-ink-coral">{outcome.error}</p>
      ) : outcome.passed ? (
        <div className="text-center">
          <Sparkles className="mx-auto size-10 text-ink-sun" aria-hidden />
          <p className="mt-2 text-2xl font-black">You're hired!</p>
          <p className="mt-1 text-muted-foreground">
            Welcome to {workplace.name}, {role.title}. You got {correct}/3.
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-2xl font-black">Not this time</p>
          <p className="mt-1 text-muted-foreground">You got {correct}/3. Read the feedback, and you can try again in 10 minutes.</p>
        </div>
      )}
    </Panel>
  );
}

/** A shift: five real tasks in uniform, then pay (and maybe promotion). */
export function Shift({ job, avatar, onClose }: { job: ActiveJob; avatar: Avatar; onClose: () => void }) {
  const workplace = workplaceById(job.workplace)!;
  const role = roleOf(job.workplace, job.role)!;
  const seed = useRef(newSeed());
  const tasks = useMemo(() => buildShift(role, seed.current), [role]);
  const started = useRef(Date.now());
  const results = useRef<boolean[]>([]);
  const [i, setI] = useState(-1);
  const [summary, setSummary] = useState<{ pay: number; promoted: boolean; role: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const finish = () =>
    start(async () => {
      const skills: Record<string, [number, number]> = {};
      tasks.forEach((t, k) => {
        const s = (skills[t.skill] ??= [0, 0]);
        s[1] += 1;
        if (results.current[k]) s[0] += 1;
      });
      const correct = results.current.filter(Boolean).length;
      const r = await finishWorkShift(seed.current, correct, Date.now() - started.current, skills);
      if (!r.ok) setSummary({ pay: 0, promoted: false, role: role.id, error: r.error });
      else {
        setSummary(r.data);
        notifyPlayerChanged();
        router.refresh();
      }
    });

  const uniformed = { ...avatar, ...role.uniform };
  if (i === -1)
    return (
      <Panel onClose={onClose} title={`${role.title} shift`} workplace={workplace}>
        <div className="flex items-center gap-4">
          <AvatarFigure avatar={uniformed} size={120} showPet={false} logo={workplace.companyId ?? undefined} />
          <div>
            <p className="leading-7">{role.summary}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              5 tasks · up to <strong className="text-foreground">{Math.round(role.pay * 1.2)} Clout</strong> · skills:{" "}
              {[...new Set(tasks.map((t) => SKILLS[t.skill]))].join(", ")}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setI(0)} className="mt-5 w-full rounded-full bg-[#f2d9a6] py-3 font-black text-[#0d1726]">
          Clock in
        </button>
      </Panel>
    );

  if (i < tasks.length)
    return (
      <Panel onClose={onClose} title={`${role.title} shift`} workplace={workplace}>
        <TaskCard
          key={i}
          task={tasks[i]}
          index={i}
          total={tasks.length}
          onDone={(ok) => {
            results.current[i] = ok;
            if (i + 1 === tasks.length) finish();
            setI(i + 1);
          }}
        />
      </Panel>
    );

  const correct = results.current.filter(Boolean).length;
  const next = roleOf(job.workplace, summary?.role ?? job.role);
  return (
    <Panel onClose={onClose} title="End of shift" workplace={workplace}>
      {pending || !summary ? (
        <p>Clocking out…</p>
      ) : summary.error ? (
        <p className="text-ink-coral">{summary.error}</p>
      ) : (
        <div className="text-center">
          <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Payslip</p>
          <p className="mt-1 text-4xl font-black text-ink-sun">+{summary.pay} Clout</p>
          <p className="mt-1 text-muted-foreground">{correct}/5 tasks done right</p>
          {summary.promoted && next && (
            <p className="mt-4 rounded-2xl bg-[#f2d9a6] px-4 py-3 font-black text-[#0d1726]">
              <Trophy className="mr-1 inline size-5" aria-hidden /> Promoted to {next.title}! New uniform, better pay.
            </p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            This shift is on your record. See your experience and CV wording in{" "}
            <Link href="/games/careers#cv" className="font-bold text-ink-lilac underline">
              Careers
            </Link>
            .
          </p>
        </div>
      )}
    </Panel>
  );
}

/** What you see at a workplace door: the role ladder and what you can do here. */
export function WorkplaceDoor({
  workplace,
  job,
  avatar,
  onClose,
}: {
  workplace: Workplace;
  job: ActiveJob | null;
  avatar: Avatar;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"door" | "interview" | "shift">("door");
  const [hired, setHired] = useState<ActiveJob | null>(null);
  const router = useRouter();
  const mine = hired ?? (job?.workplace === workplace.id ? job : null);
  if (mode === "interview")
    return (
      <Interview
        workplace={workplace}
        onClose={onClose}
        onHired={() => {
          setHired({ workplace: workplace.id, role: workplace.roles[0].id, rank: 1, shifts: 0, rankShifts: 0, rankCorrect: 0, rankTotal: 0 });
          router.refresh();
        }}
      />
    );
  if (mode === "shift" && mine) return <Shift job={mine} avatar={avatar} onClose={onClose} />;
  return (
    <Panel onClose={onClose} title={workplace.name} workplace={workplace}>
      <Ladder workplace={workplace} job={mine} />
      <div className="mt-4 grid gap-2">
        {mine ? (
          <button type="button" onClick={() => setMode("shift")} className="flex items-center justify-center gap-2 rounded-full bg-[#f2d9a6] py-3 font-black text-[#0d1726]">
            <Briefcase className="size-5" aria-hidden /> Start a shift as {roleOf(workplace.id, mine.role)?.title}
          </button>
        ) : (
          <button type="button" onClick={() => setMode("interview")} className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 font-black text-white">
            <GraduationCap className="size-5" aria-hidden /> Apply: interview for {workplace.roles[0].title}
          </button>
        )}
        {job && !mine && <p className="text-center text-xs text-muted-foreground">Getting this job means leaving your current one. Your experience stays on your record.</p>}
        {workplace.companyId && (
          <Link href={`/games/promotion-panic/${workplace.companyId}`} className="rounded-full bg-secondary py-3 text-center font-bold">
            Play Promotion Panic here
          </Link>
        )}
      </div>
    </Panel>
  );
}

export function Ladder({ workplace, job }: { workplace: Workplace; job: ActiveJob | null }) {
  return (
    <ol className="space-y-2">
      {workplace.roles.map((r: Role) => {
        const here = job?.role === r.id;
        const need = PROMOTION[r.rank as 2 | 3];
        return (
          <li key={r.id} className={cn("rounded-2xl border px-4 py-3", here ? "border-primary bg-selected" : "border-border")}>
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-black">{r.rank}</span>
              <span className="flex-1 font-bold">{r.title}</span>
              <span className="text-sm font-black text-ink-sun">{r.pay} / shift</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{r.summary}</p>
            {need && <p className="mt-1 text-xs text-muted-foreground">Promotion: {need.shifts} shifts averaging {Math.round(need.avg * 100)}%+ in the rank below.</p>}
            {here && job && (
              <p className="mt-1 text-xs font-bold text-ink-lilac">
                You · {job.rankShifts} shift{job.rankShifts === 1 ? "" : "s"} in this role
                {job.rankTotal ? ` · ${Math.round((job.rankCorrect / job.rankTotal) * 100)}% average` : ""}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Panel({ title, workplace, onClose, children }: { title: string; workplace: Workplace; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100002] grid place-items-end bg-black/60 md:place-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-background p-5 text-foreground md:rounded-3xl md:p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          {workplace.companyId ? (
            <CompanyLogo id={workplace.companyId} size={40} />
          ) : (
            <span className="grid size-10 place-items-center rounded-xl font-black text-[#0d1726]" style={{ background: workplace.accent }}>
              {workplace.name[0]}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">{workplace.sector}</p>
            <h2 className="truncate text-xl font-black">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
