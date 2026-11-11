"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { BadgeCheck, Briefcase, CalendarClock, Check, ChevronRight, Clock, MapPin, NotebookPen, X } from "lucide-react";

import { TaskCard } from "@/components/careers/task-card";
import { type Answer, COMPETENCIES, type Interview, type JobSpec, type Question, type Scorecard, buildInterviewPlan, trackInfo } from "@/game/core/interview";
import { cn } from "@/lib/utils";

export type HiringStage = "advert" | "apply" | "sift" | "invite" | "reception" | "interview" | "deciding" | "letter" | "induction";

type Start = () => Promise<{ ok: true; seed: number } | { ok: false; error: string }>;
type Submit = (seed: number, answers: (number | string)[]) => Promise<{ ok: true; card: Scorecard } | { ok: false; error: string }>;

/**
 * The whole hiring process, as it works in real life: read the advert and person
 * specification, apply, get sifted, receive an invitation, travel to the workplace,
 * sign in at reception, sit a structured panel interview, then get an offer (accept,
 * pre-employment checks, induction) or written feedback.
 */
export function HiringFlow({ spec, here, playerName, stage: initial = "advert", note, start, submit, accept, onTravel, onHired, onClose }: {
  spec: JobSpec;
  /** True when you're already at the workplace. */
  here: boolean;
  playerName: string;
  stage?: HiringStage;
  /** Shown on the advert, e.g. that taking this job means leaving your current one. */
  note?: string;
  start: Start;
  submit: Submit;
  accept: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onTravel?: (name: string) => void;
  onHired: () => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<HiringStage>(initial);
  const [name, setName] = useState(playerName);
  const [seed, setSeed] = useState(0);
  const [card, setCard] = useState<Scorecard | null>(null);
  const [error, setError] = useState("");
  const [pending, run] = useTransition();
  const info = trackInfo(spec.track);
  const preview = useMemo(() => buildInterviewPlan(spec, 7), [spec]);
  const plan = useMemo(() => (seed ? buildInterviewPlan(spec, seed) : null), [spec, seed]);
  const today = useMemo(() => new Date(), []);
  const date = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const closing = new Date(today.getTime() + 7 * 864e5);

  const signIn = () => run(async () => {
    setError("");
    const r = await start();
    if (!r.ok) { setError(r.error); return; }
    setSeed(r.seed);
    setStage("interview");
  });
  const handIn = (answers: (number | string)[]) => {
    setStage("deciding");
    run(async () => {
      const [r] = await Promise.all([submit(seed, answers), new Promise((ok) => setTimeout(ok, 3500))]);
      if (!r.ok) { setError(r.error); setStage("letter"); return; }
      setCard(r.card);
      setStage("letter");
    });
  };

  return (
    <div className="fixed inset-0 z-[100010] grid place-items-center bg-black/60 p-2 sm:p-4" role="dialog" aria-label={`Apply: ${spec.title}`}>
      <section className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-b-8 border-black/30 bg-[#f7f4ee] text-[#16213a] shadow-2xl [color-scheme:light]">
        <header className="flex items-center gap-3 bg-[#16213a] px-5 py-3 text-white">
          <Briefcase className="size-5 text-[#ffd166]" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-black">{spec.title} · {spec.employer}</h2>
            <Steps stage={stage} />
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {stage === "advert" && (
            <article className="p-5 sm:p-7">
              <p className="text-xs font-black tracking-widest text-[#2b5fd9] uppercase">Job advert</p>
              <h3 className="mt-1 text-3xl font-black">{spec.title}</h3>
              <p className="text-lg font-bold text-black/70">{spec.employer}</p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <Fact icon={<MapPin className="size-4" />} label="Location">{spec.place}</Fact>
                <Fact icon={<BadgeCheck className="size-4" />} label="Pay">{spec.pay}</Fact>
                <Fact icon={<Clock className="size-4" />} label="Hours">{spec.hours}</Fact>
                <Fact icon={<CalendarClock className="size-4" />} label="Closing date">{date(closing)}</Fact>
              </dl>
              <h4 className="mt-6 text-sm font-black tracking-wide uppercase">About the role</h4>
              <p className="mt-1 leading-7">{info.values}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{spec.duties.map((d) => <li key={d}>{d}</li>)}</ul>
              <h4 className="mt-6 text-sm font-black tracking-wide uppercase">Person specification</h4>
              <table className="mt-2 w-full overflow-hidden rounded-xl text-sm">
                <tbody>
                  {info.essential.map((e, i) => <tr key={e} className="border-b border-black/10 bg-white"><td className="w-28 px-3 py-2 text-[11px] font-black text-[#c8322d] uppercase">{i === 0 ? "Essential" : ""}</td><td className="px-3 py-2">{e}</td></tr>)}
                  {info.desirable.map((e, i) => <tr key={e} className="border-b border-black/10 bg-white/60"><td className="px-3 py-2 text-[11px] font-black text-black/50 uppercase">{i === 0 ? "Desirable" : ""}</td><td className="px-3 py-2">{e}</td></tr>)}
                </tbody>
              </table>
              <h4 className="mt-6 text-sm font-black tracking-wide uppercase">How we&apos;ll assess you</h4>
              <p className="mt-1 text-sm leading-6">Shortlisted candidates are invited to a structured panel interview at {spec.place} with two interviewers, {preview.length}. Every candidate is asked the same core questions: &ldquo;tell us about a time&rdquo; questions (answer with STAR: Situation, Task, Action, Result), a &ldquo;what would you do&rdquo; scenario, questions on job knowledge{spec.role ? ", a short technical exercise" : ""}, and time for your questions.</p>
              <p className="mt-2 text-sm leading-6">Each area is scored 1–7. To be offered the job you need 4 or more in each area (one 3 is accepted if the others are 5 or more). Areas: {preview.assessed.map((c) => COMPETENCIES[c]).join(", ")}.</p>
              {note && <p className="mt-4 rounded-xl bg-[#fff2cc] p-3 text-sm font-bold">{note}</p>}
              <button type="button" onClick={() => setStage("apply")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b5fd9] py-3.5 font-black text-white">Apply now <ChevronRight className="size-5" /></button>
            </article>
          )}
          {stage === "apply" && <Application spec={spec} name={name} setName={setName} onSubmit={(shortlisted) => { setStage("sift"); setTimeout(() => setStage(shortlisted ? "invite" : "letter"), 2600); if (!shortlisted) setError("sift"); }} />}
          {stage === "sift" && <Waiting title="Your application has been received" line={`The ${info.manager.toLowerCase()} is reviewing it against the essential criteria…`} />}
          {stage === "invite" && (
            <Letter from={spec.employer}>
              <p>Dear {name},</p>
              <p className="mt-3">Thank you for applying for the role of <b>{spec.title}</b>. We&apos;re pleased to invite you to interview.</p>
              <dl className="mt-4 grid gap-1.5 rounded-xl bg-[#f3efe6] p-4 text-sm">
                <Row k="Date">{date(today)}, as soon as you can get there</Row>
                <Row k="Location">{spec.place}. Please sign in at reception</Row>
                <Row k="Panel">{preview.panel[0].title} and a {preview.panel[1].title}</Row>
                <Row k="Format">Structured panel interview, {preview.length}</Row>
                <Row k="Please bring">Photo ID, and your questions for us</Row>
              </dl>
              <p className="mt-3 text-sm">Tips: arrive 10 minutes early, re-read the person specification, and prepare STAR examples for &ldquo;tell us about a time&rdquo; questions.</p>
              <div className="mt-5 grid gap-2">
                {here ? (
                  <button type="button" onClick={() => setStage("reception")} className="rounded-full bg-[#2b5fd9] py-3.5 font-black text-white">Go to reception</button>
                ) : (
                  <button type="button" onClick={() => onTravel?.(name)} className="flex items-center justify-center gap-2 rounded-full bg-[#2b5fd9] py-3.5 font-black text-white"><MapPin className="size-5" /> Travel to {spec.place}</button>
                )}
              </div>
            </Letter>
          )}
          {stage === "reception" && <Reception spec={spec} plan={preview} name={name} pending={pending} error={error} onReady={signIn} />}
          {stage === "interview" && plan && <PanelInterview plan={plan} onDone={handIn} />}
          {stage === "deciding" && <Waiting title="Thank you for coming in" line="The panel is comparing notes and scoring each answer against the criteria. We'll be in touch shortly…" />}
          {stage === "letter" && (
            <Outcome spec={spec} name={name} card={card} error={error} pending={pending}
              onAccept={() => run(async () => { const r = await accept(); if (!r.ok) { setError(r.error); return; } setStage("induction"); })}
              onClose={onClose} />
          )}
          {stage === "induction" && <Induction spec={spec} onDone={onHired} />}
        </div>
      </section>
    </div>
  );
}

const STEPS: [HiringStage[], string][] = [[["advert"], "Advert"], [["apply", "sift"], "Apply"], [["invite"], "Invite"], [["reception", "interview"], "Interview"], [["deciding", "letter", "induction"], "Outcome"]];
function Steps({ stage }: { stage: HiringStage }) {
  const at = STEPS.findIndex(([s]) => s.includes(stage));
  return (
    <ol className="mt-1 flex gap-1 text-[10px] font-black tracking-wide uppercase" aria-label="Hiring stages">
      {STEPS.map(([, label], i) => <li key={label} className={cn("rounded-full px-2 py-0.5", i < at ? "bg-[#6cc04a] text-white" : i === at ? "bg-[#ffd166] text-[#16213a]" : "bg-white/10 text-white/60")}>{label}</li>)}
    </ol>
  );
}

const Fact = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-2 rounded-xl bg-white p-3 shadow-sm"><span className="mt-0.5 text-[#2b5fd9]">{icon}</span><span><dt className="text-[10px] font-black tracking-widest text-black/50 uppercase">{label}</dt><dd className="font-bold">{children}</dd></span></div>
);
const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[7.5rem_1fr] gap-2"><dt className="font-black">{k}</dt><dd>{children}</dd></div>
);

function Letter({ from, children }: { from: string; children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-7">
      <div className="mx-auto max-w-xl rounded-sm bg-white p-6 font-serif leading-relaxed shadow-[0_6px_24px_rgba(0,0,0,.12)] sm:p-8">
        <p className="mb-4 text-right font-sans text-xs font-black tracking-widest text-black/50 uppercase">{from} · Recruitment</p>
        {children}
      </div>
    </div>
  );
}

function Waiting({ title, line }: { title: string; line: string }) {
  return (
    <div className="grid min-h-[320px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-[#2b5fd9] border-t-transparent" aria-hidden />
        <p className="text-xl font-black">{title}</p>
        <p className="mt-1 text-black/65">{line}</p>
      </div>
    </div>
  );
}

// ── Application and sift ─────────────────────────────────────────────────────
function Application({ spec, name, setName, onSubmit }: { spec: JobSpec; name: string; setName: (n: string) => void; onSubmit: (shortlisted: boolean) => void }) {
  const info = trackInfo(spec.track);
  const [statement, setStatement] = useState("");
  const [meets, setMeets] = useState<number[]>(info.essential.map(() => -1));
  const [declared, setDeclared] = useState(false);
  const ok = name.trim().length >= 2 && statement.trim().length >= 60 && meets.every((m) => m >= 0) && declared;
  return (
    <form className="p-5 sm:p-7" onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit(meets.reduce((s, m) => s + m, 0) >= info.essential.length && statement.trim().length >= 60); }}>
      <p className="text-xs font-black tracking-widest text-[#2b5fd9] uppercase">Application form</p>
      <label className="mt-3 block text-sm font-black">Full name
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 font-normal" />
      </label>
      <p className="mt-5 text-sm font-black">How do you meet the essential criteria?</p>
      <p className="text-xs text-black/60">The panel sifts every application against these. Be honest: you can use school, volunteering or home examples.</p>
      <div className="mt-2 grid gap-2">
        {info.essential.map((c, i) => (
          <fieldset key={c} className="rounded-xl bg-white p-3 shadow-sm">
            <legend className="sr-only">{c}</legend>
            <p className="text-sm font-bold">{c}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Not yet", "Partly", "Yes, I have an example"].map((label, v) => (
                <button key={label} type="button" onClick={() => setMeets((m) => m.map((x, k) => (k === i ? v : x)))} className={cn("rounded-full px-3 py-1.5 text-xs font-black", meets[i] === v ? "bg-[#16213a] text-white" : "bg-black/5 hover:bg-black/10")}>{label}</button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <label className="mt-5 block text-sm font-black">Supporting statement
        <span className="block text-xs font-normal text-black/60">Why this role, and what you&apos;d bring. Link it to the person specification.</span>
        <textarea value={statement} onChange={(e) => setStatement(e.target.value.slice(0, 800))} rows={4} className="mt-1 w-full resize-none rounded-xl border border-black/15 bg-white p-3 font-normal leading-6" placeholder={`I'd like to work as a ${spec.title.toLowerCase()} at ${spec.employer} because…`} />
        <span className={cn("block text-right text-xs font-normal", statement.trim().length >= 60 ? "text-[#15987f]" : "text-black/50")}>{statement.trim().length}/60 characters minimum</span>
      </label>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-1 size-4" />
        I confirm the information on this form is true and my own work.
      </label>
      <button type="submit" disabled={!ok} className="mt-5 w-full rounded-full bg-[#2b5fd9] py-3.5 font-black text-white disabled:opacity-40">Submit application</button>
    </form>
  );
}

// ── Reception ────────────────────────────────────────────────────────────────
function Reception({ spec, plan, name, pending, error, onReady }: { spec: JobSpec; plan: Interview; name: string; pending: boolean; error: string; onReady: () => void }) {
  const [step, setStep] = useState(0);
  const time = useMemo(() => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), []);
  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => setStep(3), 5000);
    return () => clearTimeout(t);
  }, [step]);
  const chair = plan.panel[0];
  return (
    <div className="p-5 sm:p-7">
      <div className="flex items-end gap-4 rounded-2xl bg-gradient-to-b from-[#dfe7f2] to-[#c9d4e4] p-4">
        <Face look={3} name={plan.receptionist} />
        <div className="relative flex-1 rounded-2xl bg-white p-3 text-[15px] shadow">
          <p className="text-[10px] font-black tracking-widest text-black/50 uppercase">{plan.receptionist} · Reception</p>
          {step === 0 && <p>Good morning, welcome to {spec.employer}. How can I help?</p>}
          {step === 1 && <p>Lovely. Could you sign in for me, please?</p>}
          {step === 2 && <p>Thanks. Take a seat; {chair.name.split(" ")[0]} will be down to collect you shortly.</p>}
          {step === 3 && <p className="font-bold">{chair.name} is here for you.</p>}
        </div>
      </div>
      {step === 0 && <button type="button" onClick={() => setStep(1)} className="mt-4 w-full rounded-full bg-[#16213a] py-3 font-black text-white">&ldquo;Hi, I&apos;m {name}. I have an interview with {chair.name}.&rdquo;</button>}
      {step === 1 && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-black tracking-widest text-black/50 uppercase">Visitor book</p>
          <table className="mt-2 w-full text-sm"><thead><tr className="text-left text-black/50"><th>Name</th><th>Visiting</th><th>Time in</th></tr></thead>
            <tbody><tr><td className="font-serif italic">{name}</td><td>{chair.name}</td><td>{time}</td></tr></tbody></table>
          <button type="button" onClick={() => setStep(2)} className="mt-3 w-full rounded-full bg-[#16213a] py-3 font-black text-white">Sign in and take a visitor badge</button>
        </div>
      )}
      {step === 2 && <p className="mt-4 flex items-center justify-center gap-2 text-center text-black/60"><Clock className="size-4 animate-pulse" /> Waiting in reception… a good moment to go over your STAR examples.</p>}
      {step === 3 && (
        <>
          <button type="button" disabled={pending} onClick={onReady} className="mt-4 w-full rounded-full bg-[#2b5fd9] py-3.5 font-black text-white disabled:opacity-50">{pending ? "Walking to the interview room…" : "Shake hands and follow them to the interview room"}</button>
          {error && <p role="alert" className="mt-3 rounded-xl bg-[#ffe1de] p-3 text-sm font-bold text-[#a3241c]">{error}</p>}
        </>
      )}
    </div>
  );
}

// ── The interview ────────────────────────────────────────────────────────────
const ACKS = ["Thank you.", "Okay, thanks for that.", "Thanks, that's helpful.", "Right, thank you.", "Okay."];

function PanelInterview({ plan, onDone }: { plan: Interview; onDone: (answers: (number | string)[]) => void }) {
  const [qi, setQi] = useState(-1);
  const [part, setPart] = useState(0);
  const [said, setSaid] = useState("");
  const [asked, setAsked] = useState<number[]>([]);
  const answers = useRef<(number | string)[]>([]);
  const q: Question | undefined = plan.questions[qi];
  const asker = q ? plan.panel[q.asker] : plan.panel[0];
  const total = plan.questions.length;
  const next = (values: (number | string)[], text: string) => {
    answers.current.push(...values);
    setSaid(text);
    setPart(0);
    setAsked([]);
    if (qi + 1 >= total) { setTimeout(() => onDone(answers.current), 1600); setQi(total); return; }
    setQi(qi + 1);
  };
  const starPrompt = ["", "And what did you do, specifically?", "What was the outcome, and what did you learn?"];
  const prompt = qi === -1
    ? `Thanks for coming in. I'm ${plan.panel[0].name}, ${plan.panel[0].title.toLowerCase()}, and this is ${plan.panel[1].name}, our ${plan.panel[1].title}, who'll be taking notes. We'll ask you ${total} questions, the same ones we ask every candidate, and there'll be time for your questions at the end. Ready?`
    : qi >= total ? "Thank you for your time. We'll let you know the outcome shortly." : part > 0 ? starPrompt[part] : q!.prompt;
  return (
    <div>
      <div className="relative flex items-end justify-center gap-6 bg-gradient-to-b from-[#e9e2d3] to-[#d7ccb6] px-4 pt-5 sm:gap-14">
        <div className="absolute inset-x-0 bottom-0 h-8 bg-[#8a5a3a]" aria-hidden />
        {plan.panel.map((p, i) => (
          <div key={p.name} className="relative z-10 flex flex-col items-center pb-2">
            <Face look={p.look} name={p.name} talking={!!q && q.asker === i && qi < total} />
            <p className="mt-1 rounded bg-white/90 px-2 text-[11px] font-black">{p.name}</p>
            <p className="text-[10px] font-bold text-white">{p.title}</p>
            {i === 1 && qi >= 0 && qi < total && <NotebookPen className="absolute top-2 -right-5 size-4 text-[#16213a]/60" aria-label="Taking notes" />}
          </div>
        ))}
      </div>
      <div className="p-4 sm:p-6">
        {said && qi >= 0 && <p className="mb-2 ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#2b5fd9] px-3 py-2 text-sm text-white">{said}</p>}
        {said && qi > 0 && qi < total && part === 0 && <p className="mb-2 text-xs italic text-black/50">{plan.panel[(q?.asker ?? 0) ^ 1].name.split(" ")[0]} writes a note. &ldquo;{ACKS[qi % ACKS.length]}&rdquo;</p>}
        <div className="rounded-2xl rounded-bl-sm bg-white p-4 shadow">
          <p className="text-[10px] font-black tracking-widest text-black/50 uppercase">{asker.name}{q && qi < total ? ` · Question ${qi + 1} of ${total}${q.star ? ` · ${["Situation", "Action", "Result"][part]}` : ""}` : ""}</p>
          <p className="mt-1 text-[17px] leading-7 font-bold">{prompt}</p>
        </div>
        <div className="mt-3 grid gap-2">
          {qi === -1 && <Choice onClick={() => setQi(0)}>Yes, I&apos;m ready. Thank you for seeing me.</Choice>}
          {q && qi < total && q.answers && q.answers.map((a, i) => <Choice key={a.text} onClick={() => next([i], a.text)}>{a.text}</Choice>)}
          {q && qi < total && q.star && (() => {
            const list = [q.star.situation, q.star.action, q.star.result][part];
            return list.map((a: Answer, i) => (
              <Choice key={a.text} onClick={() => {
                if (part < 2) { answers.current.push(i); setSaid(a.text); setPart(part + 1); }
                else next([i], a.text);
              }}>{a.text}</Choice>
            ));
          })()}
          {q && qi < total && q.ask && (
            <>
              <p className="text-xs text-black/60">Pick up to two questions to ask the panel.</p>
              {q.ask.map((a, i) => (
                <Choice key={a.text} selected={asked.includes(i)} onClick={() => setAsked((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length < 2 ? [...s, i] : s))}>{a.text}</Choice>
              ))}
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <button type="button" disabled={!asked.length} onClick={() => next([asked[0] ?? -1, asked[1] ?? -1], asked.map((i) => q.ask![i].text).join(" "))} className="rounded-full bg-[#2b5fd9] py-3 font-black text-white disabled:opacity-40">Ask {asked.length > 1 ? "these" : "this"}</button>
                <button type="button" onClick={() => next([-1, -1], "No, I think you've covered everything, thank you.")} className="rounded-full bg-black/5 py-3 font-black">No questions, thanks</button>
              </div>
            </>
          )}
          {q && qi < total && q.task && (
            <div className="rounded-2xl border border-black/10 bg-[#fbfaf7]">
              <p className="px-4 pt-3 text-xs font-black tracking-widest text-[#2b5fd9] uppercase">Technical exercise</p>
              <TaskCard key={q.id} bare blind task={q.task} index={0} total={1} onDone={(_, value) => next([value], `My answer: ${typeof value === "number" && q.task!.options ? q.task!.options[value] : value}`)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Choice = ({ children, onClick, selected }: { children: React.ReactNode; onClick: () => void; selected?: boolean }) => (
  <button type="button" onClick={onClick} className={cn("rounded-2xl border px-4 py-3 text-left text-[15px] leading-6 transition", selected ? "border-[#2b5fd9] bg-[#2b5fd9]/10 font-bold" : "border-black/10 bg-white hover:border-[#2b5fd9]/50 hover:bg-[#f2f6ff]")}>{children}</button>
);

// ── Outcome ──────────────────────────────────────────────────────────────────
function Outcome({ spec, name, card, error, pending, onAccept, onClose }: { spec: JobSpec; name: string; card: Scorecard | null; error: string; pending: boolean; onAccept: () => void; onClose: () => void }) {
  const info = trackInfo(spec.track);
  if (error === "sift")
    return (
      <Letter from={spec.employer}>
        <p>Dear {name},</p>
        <p className="mt-3">Thank you for applying for the role of {spec.title}. We&apos;ve reviewed your application against the essential criteria and, on this occasion, we won&apos;t be inviting you to interview.</p>
        <p className="mt-3">To be shortlisted you need to show how you meet every essential criterion (at least partly, with examples for most). Volunteering, school and home examples all count. You&apos;re welcome to apply again.</p>
        <p className="mt-4 italic">{info.manager}, {spec.employer}</p>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-[#16213a] py-3 font-sans font-black text-white">Close</button>
      </Letter>
    );
  if (error || !card)
    return (
      <Letter from={spec.employer}>
        <p className="font-sans font-bold text-[#a3241c]">{error || "Something went wrong. Please try again."}</p>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-[#16213a] py-3 font-sans font-black text-white">Close</button>
      </Letter>
    );
  return (
    <Letter from={spec.employer}>
      <p>Dear {name},</p>
      {card.passed ? (
        <>
          <p className="mt-3">Thank you for attending your interview. We&apos;re delighted to offer you the position of <b>{spec.title}</b>.</p>
          <p className="mt-3 font-sans text-xs font-black tracking-widest text-black/50 uppercase">Conditional offer of employment</p>
          <dl className="mt-2 grid gap-1.5 rounded-xl bg-[#f3efe6] p-4 font-sans text-sm">
            <Row k="Job title">{spec.title}</Row>
            <Row k="Pay">{spec.pay}</Row>
            <Row k="Hours">{spec.hours}</Row>
            <Row k="Location">{spec.place}</Row>
            <Row k="Start">Your next shift</Row>
            <Row k="Probation">3 months</Row>
            <Row k="Conditions">Satisfactory references; uniform and induction provided</Row>
          </dl>
        </>
      ) : (
        <p className="mt-3">Thank you for attending your interview. The panel enjoyed meeting you but, on this occasion, we won&apos;t be offering you the role. Your feedback is below. You can reapply in 10 minutes.</p>
      )}
      <p className="mt-4 font-sans text-xs font-black tracking-widest text-black/50 uppercase">Interview scores (1–7, need 4+ in each)</p>
      <ul className="mt-2 grid gap-1.5 font-sans text-sm">
        {card.scores.map((s) => (
          <li key={s.competency} className="flex items-center gap-2">
            <span className="flex-1">{s.label}</span>
            <span className="flex gap-0.5" aria-hidden>{Array.from({ length: 7 }, (_, i) => <span key={i} className={cn("h-2.5 w-3 rounded-sm", i < s.score ? (s.score >= 4 ? "bg-[#15987f]" : "bg-[#e0832a]") : "bg-black/10")} />)}</span>
            <span className="w-28 text-right text-xs font-black">{s.score} · {s.band}</span>
          </li>
        ))}
      </ul>
      <details className="mt-4 font-sans text-sm">
        <summary className="cursor-pointer font-black">The panel&apos;s notes on each answer</summary>
        <ol className="mt-2 grid gap-2">
          {card.notes.map((n) => (
            <li key={n.id} className="rounded-xl bg-[#f3efe6] p-3">
              <p className="font-bold">{n.prompt}</p>
              <p className="mt-1"><span className={cn("mr-1 rounded px-1.5 text-xs font-black text-white", n.marks >= 2.5 ? "bg-[#15987f]" : n.marks >= 1.5 ? "bg-[#e0a100]" : "bg-[#c8322d]")}>{n.marks}/3</span>{n.note}</p>
              <p className="mt-1 text-xs text-black/60">What good looks like: {n.tip}</p>
            </li>
          ))}
        </ol>
      </details>
      <p className="mt-4 italic">{info.manager}, {spec.employer}</p>
      {card.passed ? (
        <div className="mt-5 grid gap-2 font-sans sm:grid-cols-2">
          <button type="button" disabled={pending} onClick={onAccept} className="rounded-full bg-[#15987f] py-3 font-black text-white disabled:opacity-50">{pending ? "Accepting…" : "Accept the offer"}</button>
          <button type="button" onClick={onClose} className="rounded-full bg-black/5 py-3 font-black">{spec.kind === "company" ? "Close" : "Decline"}</button>
        </div>
      ) : (
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-[#16213a] py-3 font-sans font-black text-white">Close</button>
      )}
    </Letter>
  );
}

function Induction({ spec, onDone }: { spec: JobSpec; onDone: () => void }) {
  const steps = ["References received", "Uniform and staff ID issued", "Health and safety briefing", `Shown around ${spec.place}`];
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= steps.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), 900);
    return () => clearTimeout(t);
  }, [done, steps.length]);
  return (
    <div className="p-6 sm:p-8">
      <p className="text-xs font-black tracking-widest text-[#15987f] uppercase">Pre-employment checks and induction</p>
      <h3 className="mt-1 text-2xl font-black">Welcome to {spec.employer}!</h3>
      <ul className="mt-4 grid gap-2">
        {steps.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-3 rounded-xl p-3 transition", i < done ? "bg-white shadow-sm" : "bg-black/5 text-black/40")}>
            <span className={cn("grid size-7 place-items-center rounded-full", i < done ? "bg-[#15987f] text-white" : "bg-black/10")}>{i < done ? <Check className="size-4" /> : <Clock className="size-3.5" />}</span>{s}
          </li>
        ))}
      </ul>
      <button type="button" disabled={done < steps.length} onClick={onDone} className="mt-6 w-full rounded-full bg-[#2b5fd9] py-3.5 font-black text-white disabled:opacity-40">Start your first shift</button>
    </div>
  );
}

// ── Faces ────────────────────────────────────────────────────────────────────
const SKIN = ["#f1c9a5", "#e0ac83", "#c68a5c", "#a0673f", "#7a4a2a", "#5a3520", "#f5d6bd", "#b77a52"];
const HAIR = ["#1d1512", "#4a2f1f", "#2a1d17", "#8c5a2b", "#d9b06b", "#111", "#6b3a1e", "#3a3a3a"];
const SHIRT = ["#2b5fd9", "#16213a", "#7a5ce6", "#15987f", "#c8322d", "#e0a100", "#3b4a5c", "#8a5a3a"];

/** A simple illustrated head and shoulders, drawn in the game's flat style. */
function Face({ look, name, talking = false }: { look: number; name: string; talking?: boolean }) {
  const k = (look + name.length) % 8;
  return (
    <svg viewBox="0 0 80 90" className="h-24 w-[86px] drop-shadow sm:h-28 sm:w-24" role="img" aria-label={name}>
      <path d="M8 90 Q10 62 40 60 Q70 62 72 90 Z" fill={SHIRT[k]} stroke="#111" strokeWidth="2" />
      <path d="M33 61 L40 72 L47 61" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <rect x="34" y="50" width="12" height="12" fill={SKIN[look % 8]} stroke="#111" strokeWidth="1.5" />
      <rect x="20" y="16" width="40" height="40" rx="9" fill={SKIN[look % 8]} stroke="#111" strokeWidth="2" />
      {k % 3 === 0 ? <path d="M18 30 Q18 8 40 8 Q62 8 62 30 L62 46 L56 46 L56 22 L24 22 L24 46 L18 46 Z" fill={HAIR[k]} stroke="#111" strokeWidth="2" />
        : k % 3 === 1 ? <path d="M19 28 Q20 9 40 9 Q60 9 61 28 L56 22 L24 22 Z" fill={HAIR[k]} stroke="#111" strokeWidth="2" />
          : <path d="M17 32 Q14 6 40 7 Q66 6 63 32 Q58 18 40 19 Q22 18 17 32 Z" fill={HAIR[k]} stroke="#111" strokeWidth="2" />}
      <circle cx="32" cy="35" r="2.6" fill="#111" /><circle cx="48" cy="35" r="2.6" fill="#111" />
      {talking ? <ellipse cx="40" cy="46" rx="5" ry="3.5" fill="#5a1d1d" stroke="#111" strokeWidth="1.2"><animate attributeName="ry" values="3.5;1;3.5" dur=".4s" repeatCount="indefinite" /></ellipse>
        : <path d="M34 45 Q40 49 46 45" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}
