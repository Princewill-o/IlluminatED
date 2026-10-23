"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  Award, Baby, Briefcase, Cake, Coins, Crown, GraduationCap, Heart, Lightbulb, Rocket, RotateCcw, Smile, Sparkles, Stethoscope, Trophy, Users, Zap,
} from "lucide-react";

import {
  ACHIEVEMENTS, ACTIVITIES, CAREERS, HOBBIES, STAGE_NAME, WHAT_IFS, activitiesFor, ageUp, applyFor, careerById, choose, continueAs, decide,
  decisionFor, doActivity, newLife, restore, serialise, stageOf, weeklyChallenge, type Activity, type Hobby, type Person, type Stat,
} from "@/game/core/life-story";
import { cn } from "@/lib/utils";

const STATS: { id: Stat; name: string; icon: typeof Smile; colour: string }[] = [
  { id: "happiness", name: "Happiness", icon: Smile, colour: "#e0a100" },
  { id: "health", name: "Health", icon: Heart, colour: "#e5484d" },
  { id: "smarts", name: "Smarts", icon: Lightbulb, colour: "#2b5fd9" },
  { id: "confidence", name: "Confidence", icon: Zap, colour: "#7a5ce6" },
];
const money = (n: number) => `${n < 0 ? "−" : ""}£${Math.abs(n).toLocaleString("en-GB")}`;
/** Copy a person while keeping the live event object (with its functions). */
const keep = (p: Person) => ({ ...p, stats: { ...p.stats }, skills: { ...p.skills }, log: [...p.log], children: [...p.children], pets: [...p.pets], achievements: [...p.achievements] });

function Bar({ value, colour }: { value: number; colour: string }) {
  return (
    <span className="block h-2.5 overflow-hidden rounded-full bg-[#13203a]/10">
      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${value}%`, background: colour }} />
    </span>
  );
}

/**
 * What If: a whole life as a text adventure. Age up, choose how to spend each
 * year, react to random events and chase a dream career, then carry on as
 * your child. Saved on this device.
 */
export function WhatIf({ userId }: { userId: string }) {
  const key = `illuminated:what-if:${userId}`;
  const [p, setP] = useState<Person | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hobby, setHobby] = useState<Hobby>("music");
  const [sheet, setSheet] = useState<"careers" | "awards" | null>(null);
  const [toast, setToast] = useState("");
  const [name, setName] = useState({ first: "", last: "" });
  const [whatIf, setWhatIf] = useState<string | null>(null);
  const logEnd = useRef<HTMLDivElement>(null);
  const challenge = useMemo(() => weeklyChallenge(new Date()), []);

  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setP(restore(s)); } catch { /* Starts fresh. */ }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    try { if (p) localStorage.setItem(key, serialise(p)); else localStorage.removeItem(key); } catch { /* Not saved this time. */ }
  }, [p, key, loaded]);
  useEffect(() => { logEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [p?.log.length]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);

  const mutate = (fn: (x: Person) => void) => { if (!p) return; const x = keep(p); x.pending = p.pending; fn(x); setP(x); };

  if (!loaded) return <div className="h-96 animate-pulse rounded-3xl bg-[#13203a]/5" />;

  /* ---------- Start screen ---------- */
  if (!p) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-[2rem] bg-[#13203a] p-6 text-white md:p-8">
          <p className="text-xs font-black tracking-[0.3em] text-[#f2d9a6] uppercase">New life</p>
          <h2 className="mt-2 text-3xl font-black">Who will you be?</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-black tracking-widest text-white/60 uppercase">First name
              <input value={name.first} onChange={(e) => setName({ ...name, first: e.target.value.slice(0, 20) })} placeholder="Random" className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2.5 text-base font-bold text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-[#f2d9a6]" />
            </label>
            <label className="text-xs font-black tracking-widest text-white/60 uppercase">Surname
              <input value={name.last} onChange={(e) => setName({ ...name, last: e.target.value.slice(0, 20) })} placeholder="Random" className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2.5 text-base font-bold text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-[#f2d9a6]" />
            </label>
          </div>
          <p className="mt-6 text-xs font-black tracking-widest text-white/60 uppercase">Pick a What If (optional)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {WHAT_IFS.map((w) => (
              <button key={w.id} type="button" aria-pressed={whatIf === w.id} onClick={() => setWhatIf(whatIf === w.id ? null : w.id)}
                className={cn("gloss-off rounded-2xl p-3 text-left transition", whatIf === w.id ? "bg-[#f2d9a6] text-[#0d1726]" : "bg-white/8 hover:bg-white/15")}>
                <span className="block font-black">{w.title}</span>
                <span className={cn("mt-0.5 block text-xs", whatIf === w.id ? "text-[#0d1726]/75" : "text-white/65")}>{w.blurb}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setP(newLife(Math.floor(Math.random() * 2 ** 31), { first: name.first, last: name.last, whatIf }))}
            className="arcade-btn mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#f2d9a6] px-6 py-4 text-lg font-black text-[#0d1726]">
            <Baby className="size-5" aria-hidden /> Start a new life
          </button>
        </section>
        <aside className="grid content-start gap-4">
          <div className="rounded-3xl border-2 border-[#13203a]/10 bg-white p-5">
            <p className="flex items-center gap-2 text-xs font-black tracking-widest text-[#7a5ce6] uppercase"><Trophy className="size-4" aria-hidden /> This week&apos;s challenge</p>
            <p className="mt-2 text-lg font-black">{challenge.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">Complete it in any life this week.</p>
          </div>
          <div className="rounded-3xl border-2 border-[#13203a]/10 bg-white p-5 text-sm">
            <p className="font-black">How it works</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              <li>Each year you get two actions: study, practise a hobby, exercise and more.</li>
              <li>Random events pop up. Your choices shape your stats.</li>
              <li>At 16 and 18 you choose your route and your degree.</li>
              <li>Chase a dream career: surgeon, pop star, astronaut or Prime Minister.</li>
              <li>When your story ends, carry on as one of your children.</li>
            </ul>
          </div>
        </aside>
      </div>
    );
  }

  /* ---------- A life in progress ---------- */
  const stage = stageOf(p.age);
  const decision = p.alive ? decisionFor(p) : null;
  const career = careerById(p.career);
  const acts = activitiesFor(p);
  const challengeDone = challenge.test(p);
  const byYear = p.log.reduce<{ age: number; lines: string[] }[]>((acc, l) => {
    const last = acc[acc.length - 1];
    if (last && last.age === l.age) last.lines.push(l.text); else acc.push({ age: l.age, lines: [l.text] });
    return acc;
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* Character card */}
      <aside className="grid content-start gap-4">
        <section className="rounded-[2rem] bg-[#13203a] p-5 text-white">
          <p className="text-[11px] font-black tracking-widest text-[#f2d9a6] uppercase">Generation {p.gen} · {STAGE_NAME[stage]}</p>
          <h2 className="mt-1 text-2xl leading-tight font-black">{p.first} {p.last}</h2>
          <p className="text-sm text-white/70">Age {p.age} · {p.city}</p>
          {career && <p className="mt-2 flex items-center gap-1.5 text-sm font-bold"><Briefcase className="size-4" aria-hidden /> {career.ladder[p.rank]}</p>}
          {p.degree && <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80"><GraduationCap className="size-4" aria-hidden /> Degree: {p.degree.replace("-", " ")}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-sm font-bold"><Coins className="size-4 text-[#f2d9a6]" aria-hidden /> {money(p.money)}{p.fame > 0 && <span className="ml-2 flex items-center gap-1 text-white/80"><Sparkles className="size-3.5" aria-hidden /> Fame {Math.min(100, p.fame)}</span>}</p>
        </section>
        <section className="grid gap-3 rounded-3xl border-2 border-[#13203a]/10 bg-white p-4">
          {STATS.map((s) => (
            <div key={s.id}>
              <p className="mb-1 flex items-center justify-between text-xs font-black"><span className="flex items-center gap-1.5"><s.icon className="size-3.5" style={{ color: s.colour }} aria-hidden />{s.name}</span>{p.stats[s.id]}</p>
              <Bar value={p.stats[s.id]} colour={s.colour} />
            </div>
          ))}
          <div className="mt-1 grid grid-cols-5 gap-1 text-center">
            {(Object.keys(HOBBIES) as Hobby[]).map((h) => (
              <div key={h} className="rounded-xl bg-[#f7f1e6] px-1 py-1.5"><p className="text-[10px] font-bold text-muted-foreground">{HOBBIES[h]}</p><p className="text-sm font-black">{p.skills[h]}</p></div>
            ))}
          </div>
        </section>
        {(p.partner || p.children.length > 0 || p.pets.length > 0) && (
          <section className="rounded-3xl border-2 border-[#13203a]/10 bg-white p-4 text-sm">
            <p className="flex items-center gap-1.5 font-black"><Users className="size-4" aria-hidden /> Family</p>
            {p.partner && <p className="mt-1">Partner: {p.partner}</p>}
            {p.children.length > 0 && <p className="mt-1">Children: {p.children.join(", ")}</p>}
            {p.pets.length > 0 && <p className="mt-1">Pets: {p.pets.join(", ")}</p>}
          </section>
        )}
        <div className={cn("rounded-3xl p-4 text-sm", challengeDone ? "bg-[#e3f6ef] text-[#0d5c48]" : "bg-[#efeafd]")}>
          <p className="text-[11px] font-black tracking-widest uppercase">Weekly challenge {challengeDone && "· done!"}</p>
          <p className="mt-1 font-black">{challenge.title}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setSheet("awards")} className="jelly flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2.5 text-sm font-black text-[#13203a]" style={{ "--jelly": "#ffffff", "--jelly-hi": "#ffffff", "--jelly-edge": "#c9c2b4", "--jelly-ink": "#13203a" } as CSSProperties}><Award className="size-4" aria-hidden /> {p.achievements.length}/{ACHIEVEMENTS.length}</button>
          <button type="button" onClick={() => { if (confirm("Start a brand new life? This one will be lost.")) setP(null); }} className="jelly flex items-center justify-center gap-1.5 rounded-full bg-[#2a3346] px-3 py-2.5 text-sm font-black text-white" style={{ "--jelly": "#2a3346", "--jelly-hi": "#4a5878", "--jelly-edge": "#141a26", "--jelly-ink": "#fff" } as CSSProperties}><RotateCcw className="size-4" aria-hidden /> New life</button>
        </div>
      </aside>

      {/* Story */}
      <section className="flex min-h-[70dvh] flex-col overflow-hidden rounded-[2rem] border-2 border-[#13203a]/10 bg-[#fffdf8]">
        <div className="flex-1 space-y-4 overflow-y-auto p-5 md:max-h-[62dvh]" aria-live="polite">
          {byYear.map((y, i) => (
            <div key={`${y.age}-${i}`} className="what-if-year">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-black tracking-widest text-[#7a5ce6] uppercase"><Cake className="size-3.5" aria-hidden /> Age {y.age}</p>
              <ul className="space-y-1.5">
                {y.lines.map((l, j) => (
                  <li key={j} className={cn("rounded-2xl px-3 py-2 text-sm", l.startsWith("Achievement") ? "bg-[#fff3cf] font-bold" : l.includes("Prime Minister") || l.startsWith("Promotion") ? "bg-[#e8f0ff] font-bold" : "bg-[#f7f1e6]")}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
          <div ref={logEnd} />
        </div>

        {/* Controls */}
        <div className="border-t-2 border-[#13203a]/10 bg-white p-4">
          {!p.alive ? (
            <div className="text-center">
              <p className="text-lg font-black">The end of {p.first}&apos;s story</p>
              <p className="mt-1 text-sm text-muted-foreground">Lived to {p.age}{career ? ` as a ${career.ladder[p.rank].toLowerCase()}` : ""} · {money(p.money)} · {p.achievements.length} achievements</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {p.children.map((c) => (
                  <button key={c} type="button" onClick={() => setP(continueAs(p, c, Math.floor(Math.random() * 2 ** 31)))} className="arcade-btn rounded-full bg-[#f2d9a6] px-5 py-3 font-black text-[#0d1726]">Continue as {c}</button>
                ))}
                <button type="button" onClick={() => setP(null)} className="jelly rounded-full bg-[#13203a] px-5 py-3 font-black text-white">Start a new life</button>
              </div>
            </div>
          ) : (
            <>
              {p.actions > 0 && acts.length > 0 && (
                <>
                  <p className="mb-2 flex items-center justify-between text-xs font-black tracking-widest text-muted-foreground uppercase">
                    <span>This year: {p.actions} action{p.actions === 1 ? "" : "s"} left</span>
                    {acts.includes("hobby") && (
                      <select value={hobby} onChange={(e) => setHobby(e.target.value as Hobby)} aria-label="Which hobby" className="rounded-full bg-[#f7f1e6] px-2 py-1 text-xs font-black normal-case">
                        {(Object.keys(HOBBIES) as Hobby[]).map((h) => <option key={h} value={h}>{HOBBIES[h]}</option>)}
                      </select>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {acts.map((a) => (
                      <button key={a} type="button" disabled={Boolean(p.pending || decision)} onClick={() => mutate((x) => { doActivity(x, a as Activity, hobby); })}
                        className="gloss-off rounded-full border-2 border-[#13203a]/15 bg-white px-3 py-1.5 text-sm font-bold hover:border-[#2b5fd9] disabled:opacity-40">
                        {a === "hobby" ? `Practise ${HOBBIES[hobby].toLowerCase()}` : ACTIVITIES[a as Activity].name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="mt-3 flex gap-2">
                {p.age >= 18 && <button type="button" onClick={() => setSheet("careers")} disabled={Boolean(p.pending || decision)} className="jelly flex items-center gap-1.5 rounded-full bg-[#7a5ce6] px-4 py-3 font-black text-white disabled:opacity-40" style={{ "--jelly": "#7a5ce6", "--jelly-hi": "#a58cff", "--jelly-edge": "#4a34a4", "--jelly-ink": "#fff" } as CSSProperties}><Briefcase className="size-4" aria-hidden /> Careers</button>}
                <button type="button" disabled={Boolean(p.pending || decision)} onClick={() => mutate((x) => { ageUp(x); })}
                  className="arcade-btn flex flex-1 items-center justify-center gap-2 rounded-full bg-[#6cc04a] px-5 py-3 text-lg font-black text-[#0d1726] disabled:opacity-50">
                  <Cake className="size-5" aria-hidden /> Age up
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Random event */}
      {p.pending && p.alive && (
        <Modal title={`Age ${p.age}`} icon={<Sparkles className="size-5" aria-hidden />}>
          <p className="text-lg font-bold">{p.pending.text}</p>
          <div className="mt-4 grid gap-2">
            {p.pending.choices.map((c, i) => (
              <button key={c.label} type="button" onClick={() => { let out = ""; mutate((x) => { out = choose(x, i); }); if (out) setToast(out); }}
                className="gloss-off rounded-2xl border-2 border-[#13203a]/10 bg-white p-3 text-left font-bold hover:border-[#2b5fd9]">{c.label}</button>
            ))}
          </div>
        </Modal>
      )}

      {/* Big decisions */}
      {decision && !p.pending && (
        <Modal title={decision.kind === "route" ? "After your GCSEs" : "University"} icon={<GraduationCap className="size-5" aria-hidden />}>
          <p className="text-lg font-bold">{decision.kind === "route" ? "What's next after Year 11?" : "Which degree will you apply for?"}</p>
          {decision.kind === "degree" && <p className="mt-1 text-sm text-muted-foreground">Courses need Smarts. Yours: {p.stats.smarts}.</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {decision.options.map((o) => {
              const ok = !("ok" in o) || o.ok;
              return (
                <button key={o.id} type="button" disabled={!ok} onClick={() => mutate((x) => { decide(x, o.id); })}
                  className="gloss-off rounded-2xl border-2 border-[#13203a]/10 bg-white p-3 text-left font-bold hover:border-[#2b5fd9] disabled:opacity-40">
                  {o.name}{!ok && <span className="block text-xs font-normal">Grades not high enough</span>}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Careers sheet */}
      {sheet === "careers" && (
        <Modal title="Careers" icon={<Briefcase className="size-5" aria-hidden />} onClose={() => setSheet(null)}>
          <p className="text-sm text-muted-foreground">Applying uses one action. Dream careers are harder to get into. {p.actions === 0 && <strong className="text-[#e5484d]">No actions left this year.</strong>}</p>
          <ul className="mt-3 grid gap-2">
            {CAREERS.map((c) => {
              const why = c.needs(p);
              const Icon = c.id === "surgeon" ? Stethoscope : c.id === "astronaut" ? Rocket : c.id === "pm" ? Crown : c.dream ? Sparkles : Briefcase;
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                  <Icon className={cn("size-5 shrink-0", c.dream ? "text-[#7a5ce6]" : "text-[#5a6272]")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-black">{c.name}{c.dream && <span className="ml-1.5 rounded-full bg-[#efeafd] px-1.5 py-0.5 text-[10px] text-[#7a5ce6]">DREAM</span>}</span>
                    <span className="block text-xs text-muted-foreground">{why ?? `Starts as ${c.ladder[0].toLowerCase()} · ${money(c.pay[0])} a year`}</span>
                  </span>
                  <button type="button" disabled={Boolean(why) || p.career === c.id || p.actions === 0}
                    onClick={() => { let out = ""; mutate((x) => { out = applyFor(x, c.id).text; }); setToast(out); setSheet(null); }}
                    className="jelly rounded-full bg-[#2b5fd9] px-3 py-1.5 text-xs font-black text-white disabled:opacity-40">{p.career === c.id ? "Your job" : "Apply"}</button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}

      {sheet === "awards" && (
        <Modal title="Achievements" icon={<Award className="size-5" aria-hidden />} onClose={() => setSheet(null)}>
          <p className="text-sm text-muted-foreground">Achievements carry on through your family.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const got = p.achievements.includes(a.id);
              return <li key={a.id} className={cn("rounded-2xl p-3 text-sm font-bold", got ? "bg-[#fff3cf]" : "bg-white text-muted-foreground")}>{got ? "🏆 " : "🔒 "}{a.name}</li>;
            })}
          </ul>
        </Modal>
      )}

      {toast && <div role="status" className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl bg-[#13203a] px-4 py-3 text-sm font-bold text-white shadow-2xl md:bottom-8">{toast}</div>}
    </div>
  );
}

function Modal({ title, icon, children, onClose }: { title: string; icon: React.ReactNode; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#07101f]/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="what-if-pop max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#f7f1e6] p-6 text-[#13203a] shadow-2xl">
        <p className="flex items-center gap-2 text-xs font-black tracking-widest text-[#7a5ce6] uppercase">{icon}{title}</p>
        <div className="mt-3">{children}</div>
        {onClose && <button type="button" onClick={onClose} className="jelly mt-5 w-full rounded-full bg-[#13203a] py-3 font-black text-white">Close</button>}
      </section>
    </div>
  );
}

