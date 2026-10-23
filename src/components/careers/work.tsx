"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Briefcase, GraduationCap, Sparkles, Trophy, X } from "lucide-react";

import { ShiftStage } from "./shift-stage";
import { TaskCard } from "./task-card";

import { startCareerSession, completeCareerSession } from "@/app/games/careers/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { CareerError } from "@/components/careers/career-error";
import { AvatarFigure } from "@/components/game/avatar";
import { CompanyLogo } from "@/components/game/company-logo";
import { doActivity } from "@/components/game/world/use-needs";
import { INTERVIEW_PASS, PROMOTION, SKILLS, type Role, type Workplace, buildInterview, buildShift, roleOf, workplaceById } from "@/game/core/careers";
import type { Avatar } from "@/game/core/cosmetics";
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

/** The application form: a sheet of paper with the employer's letterhead. */
function ApplicationPaper({ workplace, reference, onClose, children, stamp }: { workplace: Workplace; reference: string; onClose: () => void; children: React.ReactNode; stamp?: "offer" | "rejected" }) {
  return (
    <div className="absolute inset-0 z-[100002] grid place-items-center overflow-y-auto bg-[#13203a]/55 p-3 md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Application form: ${workplace.name}`}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full max-w-xl -rotate-[0.6deg] overflow-y-auto rounded-sm bg-[#fdfbf5] px-6 pt-5 pb-7 text-[#1d1f24] shadow-[0_2px_0_#e9e2d2,0_6px_0_#f4efe3,0_24px_50px_rgba(0,0,0,.35)] [background-image:repeating-linear-gradient(180deg,transparent_0_31px,rgba(43,95,217,.08)_31px_32px)] md:px-9"
      >
        {/* Paper clip and punch holes. */}
        <span aria-hidden className="absolute -top-3 left-10 h-12 w-4 rounded-full border-[3px] border-[#9aa3ad] bg-transparent" />
        {[18, 50, 82].map((t) => <span key={t} aria-hidden className="absolute left-2 size-3 rounded-full bg-[#13203a]/15" style={{ top: `${t}%` }} />)}
        <button type="button" onClick={onClose} aria-label="Put the form down" className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-[#5a6272] hover:bg-black/5"><X className="size-4" /></button>
        <header className="flex items-center gap-3 border-b-2 border-[#1d1f24] pb-3">
          {workplace.companyId ? <CompanyLogo id={workplace.companyId} size={44} /> : <span className="grid size-11 place-items-center rounded-lg font-black text-[#0d1726]" style={{ background: workplace.accent }}>{workplace.name[0]}</span>}
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-xl font-bold">{workplace.name}</p>
            <p className="text-[11px] tracking-wide text-[#5a6272]">{workplace.sector} · IlluminatED City, London</p>
          </div>
          <p className="text-right font-mono text-[10px] leading-tight text-[#5a6272]">REF<br />{reference}</p>
        </header>
        <p className="mt-3 text-center font-serif text-sm font-bold tracking-[0.3em] uppercase">Application for employment</p>
        <div className="mt-4">{children}</div>
        {stamp && (
          <div aria-hidden className={cn("pointer-events-none absolute top-1/3 right-6 -rotate-12 rounded-md border-4 px-4 py-2 font-black tracking-widest uppercase opacity-85", stamp === "offer" ? "border-[#15987f] text-[#15987f]" : "border-[#c8322d] text-[#c8322d]")}>
            {stamp === "offer" ? "Offer of employment" : "Unsuccessful"}
          </div>
        )}
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="grid grid-cols-[9rem_1fr] items-end gap-2 border-b border-dotted border-[#1d1f24]/40 py-1.5 text-sm">
    <span className="text-[11px] font-bold tracking-wide text-[#5a6272] uppercase">{label}</span>
    <span className="min-w-0 font-medium">{children}</span>
  </label>
);

/** Job application: a five-question form you fill in, sign and hand in. */
export function Interview({ workplace, onHired, onClose }: { workplace: Workplace; onHired: () => void; onClose: () => void }) {
  const role = workplace.roles[0];
  const [seed, setSeed] = useState(1);
  const token = useRef("");
  const answers = useRef<(number|string)[]>([]);
  const [sessionError, setSessionError] = useState("");
  const tasks = useMemo(() => buildInterview(role, seed), [role, seed]);
  const [i, setI] = useState(-1);
  const [correct, setCorrect] = useState(0);
  const [outcome, setOutcome] = useState<{ passed: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [statement, setStatement] = useState("");
  const [signature, setSignature] = useState("");
  const [declared, setDeclared] = useState(false);
  const today = useMemo(() => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), []);
  const reference = `${workplace.id.slice(0, 4).toUpperCase()}-${String(seed).padStart(5, "0").slice(-5)}`;

  const begin = () => start(async () => {
    const session = await startCareerSession(workplace.id,"interview");
    if (!session.ok) {setSessionError(session.error);return;}
    token.current = session.token; setSeed(session.seed); setI(0);
  });
  const finish = () =>
    start(async () => {
      const r = await completeCareerSession(token.current, answers.current);
      if (!r.ok) setOutcome({ passed: false, error: r.error });
      else {
        setOutcome({ passed: r.data.passed });
        if (r.data.passed) onHired();
      }
    });
  const statementOk = statement.trim().length >= 60;

  if (i === -1)
    return (
      <ApplicationPaper workplace={workplace} reference={reference} onClose={onClose}>
        <Field label="Position">{role.title}</Field>
        <Field label="Starting pay">{role.pay} Clout per shift</Field>
        <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Write your name" className="w-full bg-transparent font-serif text-base italic outline-none placeholder:text-[#1d1f24]/30" /></Field>
        <Field label="Date">{today}</Field>
        <div className="mt-4">
          <p className="text-[11px] font-bold tracking-wide text-[#5a6272] uppercase">Personal statement: why do you want this job?</p>
          <textarea value={statement} onChange={(e) => setStatement(e.target.value.slice(0, 600))} rows={4} placeholder="What you'd bring, what you want to learn, and why this employer…" className="mt-1 w-full resize-none rounded-sm border border-[#1d1f24]/25 bg-white/60 p-2 font-serif text-sm leading-relaxed outline-none focus:border-[#2b5fd9]" />
          <p className={cn("text-right text-[11px]", statementOk ? "text-[#15987f]" : "text-[#5a6272]")}>{statement.trim().length}/60 characters minimum</p>
        </div>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-[#5a6272]">
          <li>5 sections: one about you, one &ldquo;what would you do?&rdquo;, three real job tasks.</li>
          <li>You need <b className="text-[#1d1f24]">{INTERVIEW_PASS} out of 5</b> to be offered the job. Take your time.</li>
          <li>Unsuccessful applicants can reapply after 10 minutes.</li>
        </ol>
        <button type="button" disabled={pending || !name.trim() || !statementOk} onClick={begin} className="gloss-off mt-5 w-full rounded-sm bg-[#1d1f24] py-3 font-black tracking-wide text-[#fdfbf5] uppercase disabled:opacity-40">
          {pending ? "Starting…" : "Begin the application"}
        </button>
        {sessionError && <p role="alert" className="mt-3 text-sm text-[#c8322d]">{sessionError}</p>}
      </ApplicationPaper>
    );

  if (i < tasks.length)
    return (
      <ApplicationPaper workplace={workplace} reference={reference} onClose={onClose}>
        <div className="mb-3 flex items-center gap-2">
          <p className="text-[11px] font-black tracking-widest text-[#5a6272] uppercase">Section {i + 1} of {tasks.length}</p>
          <div className="flex flex-1 gap-1" aria-hidden>{tasks.map((_, k) => <span key={k} className={cn("h-1 flex-1 rounded-full", k < i ? "bg-[#1d1f24]" : k === i ? "bg-[#2b5fd9]" : "bg-[#1d1f24]/15")} />)}</div>
        </div>
        <TaskCard
          key={i}
          task={tasks[i]}
          index={i}
          total={tasks.length}
          onDone={(ok, answer) => {
            answers.current[i] = answer;
            setCorrect(correct + (ok ? 1 : 0));
            setI(i + 1);
          }}
        />
      </ApplicationPaper>
    );

  if (!outcome && !pending)
    return (
      <ApplicationPaper workplace={workplace} reference={reference} onClose={onClose}>
        <p className="text-[11px] font-black tracking-widest text-[#5a6272] uppercase">Declaration</p>
        <label className="mt-2 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-1 size-4 accent-[#1d1f24]" />
          I confirm the answers on this form are my own, and I&apos;ll follow {workplace.name}&apos;s workplace rules.
        </label>
        <Field label="Signature"><input value={signature} onChange={(e) => setSignature(e.target.value.slice(0, 40))} placeholder="Sign with your name" className="w-full bg-transparent font-serif text-xl italic outline-none placeholder:text-[#1d1f24]/30" /></Field>
        <Field label="Date">{today}</Field>
        <button type="button" disabled={!declared || signature.trim().length < 2} onClick={finish} className="gloss-off mt-5 w-full rounded-sm bg-[#1d1f24] py-3 font-black tracking-wide text-[#fdfbf5] uppercase disabled:opacity-40">
          Hand in the application
        </button>
      </ApplicationPaper>
    );

  return (
    <ApplicationPaper workplace={workplace} reference={reference} onClose={onClose} stamp={outcome && !outcome.error ? (outcome.passed ? "offer" : "rejected") : undefined}>
      {pending || !outcome ? (
        <p className="py-6 text-center font-serif italic">The hiring panel is reading your application…</p>
      ) : outcome.error ? (
        <p className="text-[#c8322d]"><CareerError message={outcome.error} /></p>
      ) : outcome.passed ? (
        <div className="py-2">
          <p className="font-serif text-lg">Dear {signature || name},</p>
          <p className="mt-2 font-serif leading-relaxed">Thank you for applying. We&apos;re delighted to offer you the position of <b>{role.title}</b> at {workplace.name}, starting at {role.pay} Clout per shift. You scored {correct}/5.</p>
          <p className="mt-3 font-serif italic">Hiring Manager, {workplace.name}</p>
          <Sparkles className="mt-3 size-8 text-[#e0a100]" aria-hidden />
        </div>
      ) : (
        <div className="py-2">
          <p className="font-serif text-lg">Dear {signature || name},</p>
          <p className="mt-2 font-serif leading-relaxed">Thank you for your interest. On this occasion we won&apos;t be taking your application further: you scored {correct}/5 and we need {INTERVIEW_PASS}. Read the feedback on each section and reapply in 10 minutes.</p>
          <p className="mt-3 font-serif italic">Hiring Manager, {workplace.name}</p>
        </div>
      )}
    </ApplicationPaper>
  );
}

/** A shift: five real tasks in uniform, then pay (and maybe promotion). */
export function Shift({ job, avatar, onClose }: { job: ActiveJob; avatar: Avatar; onClose: () => void }) {
  const workplace = workplaceById(job.workplace)!;
  const role = roleOf(job.workplace, job.role)!;
  const [seed, setSeed] = useState(1);
  const token = useRef("");
  const answers = useRef<(number|string)[]>([]);
  const [sessionError, setSessionError] = useState("");
  const tasks = useMemo(() => buildShift(role, seed), [role, seed]);
  const results = useRef<boolean[]>([]);
  const [i, setI] = useState(-1);
  const [summary, setSummary] = useState<{ pay: number; promoted: boolean; role: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const begin = () => start(async () => {
    const session = await startCareerSession(workplace.id,"shift");
    if (!session.ok) {setSessionError(session.error);return;}
    token.current = session.token; setSeed(session.seed); setI(0);
  });
  const finish = () =>
    start(async () => {
      const r = await completeCareerSession(token.current, answers.current);
      if (!r.ok) setSummary({ pay: 0, promoted: false, role: role.id, error: r.error });
      else {
        setSummary(r.data);
        notifyPlayerChanged();
        doActivity("shift");
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
        <button type="button" disabled={pending} onClick={begin} className="mt-5 w-full rounded-full bg-[#f2d9a6] py-3 font-black text-[#0d1726]">
          {pending ? "Clocking in…" : "Clock in"}
        </button>
        {sessionError && <p role="alert" className="mt-3 text-sm">{sessionError}</p>}
      </Panel>
    );

  if (i < tasks.length)
    return (
      <Panel onClose={onClose} title={`${role.title} shift`} workplace={workplace}>
        <ShiftStage workplace={workplace} avatar={uniformed} progress={i} />
        <TaskCard
          key={i}
          task={tasks[i]}
          index={i}
          total={tasks.length}
          onDone={(ok, answer) => {
            answers.current[i] = answer;
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
        <p className="text-ink-coral"><CareerError message={summary.error} /></p>
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
  station = "reception",
  onPracticalShift,
  workplace,
  job,
  avatar,
  onClose,
}: {
  workplace: Workplace;
  job: ActiveJob | null;
  avatar: Avatar;
  onClose: () => void;
  onPracticalShift?: (job:ActiveJob)=>void;
  station?: "reception" | "terminal";
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
        {station === "terminal"&&mine&&onPracticalShift&&["pizzazz","tescow"].includes(workplace.id)&&<button type="button" onClick={()=>onPracticalShift(mine)} className="rounded-full bg-[#2b5fd9] px-4 py-3 font-black text-white">{workplace.id==="pizzazz"?"Start a pizza delivery route":"Work on the supermarket floor"}</button>}
        {mine && station === "terminal" ? (
          <button type="button" onClick={() => setMode("shift")} className="flex items-center justify-center gap-2 rounded-full bg-[#f2d9a6] py-3 font-black text-[#0d1726]">
            <Briefcase className="size-5" aria-hidden /> Clock in at this station: {roleOf(workplace.id, mine.role)?.title}
          </button>
        ) : !mine && station === "reception" ? (
          <button type="button" onClick={() => setMode("interview")} className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 font-black text-white">
            <GraduationCap className="size-5" aria-hidden /> Apply: interview for {workplace.roles[0].title}
          </button>
        ) : <p className="rounded-2xl bg-secondary p-4 text-sm">{mine ? "Walk to a computer or work counter to start your shift." : "Visit reception to apply for a role first."}</p>}
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
    <div className="absolute inset-0 z-[100002] flex items-end justify-end bg-black/10 p-2 md:p-5" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-background p-5 text-foreground md:rounded-3xl md:p-6"
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
