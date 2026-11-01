"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ONLINE } from "./art";
import { type QuizQuestion, useBankQuestions } from "./use-bank-questions";

import { answerBlameDeal, blameDealStatus, blameInbox, offerBlameDeal, type BlameOffer } from "@/app/games/world/actions";
import { honestStars } from "@/game/core/law";
import { POLICE_QUESTIONS } from "@/game/core/pursuit";

/**
 * The police interview room: a cutscene for when the police aren't sure you're
 * the culprit. A lamp swings over the table, the detective lays out the case,
 * and you choose: tell the truth (a lighter charge in court), say nothing, or
 * offer another player in your server Clout to take the blame. They decide;
 * nothing happens to them unless they accept.
 */
type Outcome = { kind: "court"; stars: number; charge: string } | { kind: "free"; by: string; clout: number };

const CSS = `
@keyframes ir-swing { 0%,100% { transform: rotate(-7deg) } 50% { transform: rotate(7deg) } }
@keyframes ir-flicker { 0%,100% { opacity: 1 } 91% { opacity: 1 } 92% { opacity: .55 } 93% { opacity: 1 } 96% { opacity: .8 } 97% { opacity: 1 } }
@keyframes ir-dust { from { transform: translate3d(0, 0, 0); opacity: 0 } 15% { opacity: .9 } to { transform: translate3d(var(--dx), 260px, 0); opacity: 0 } }
@keyframes ir-bars { from { height: 0 } to { height: 11vh } }
@keyframes ir-push { from { transform: scale(1.08) } to { transform: scale(1) } }
@keyframes ir-breathe { 0%,100% { transform: translateY(0) } 50% { transform: translateY(2px) } }
.ir-swing { animation: ir-swing 6s ease-in-out infinite; transform-origin: 50% 0; }
.ir-flicker { animation: ir-flicker 7s linear infinite; }
.ir-dust { animation: ir-dust var(--t) linear infinite; animation-delay: var(--d); }
.ir-bar { animation: ir-bars .9s cubic-bezier(.2,.8,.2,1) forwards; }
.ir-push { animation: ir-push 5s cubic-bezier(.2,.8,.2,1) forwards; }
.ir-breathe { animation: ir-breathe 4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .ir-swing, .ir-flicker, .ir-dust, .ir-push, .ir-breathe { animation: none !important; } }
`;

function useTypewriter(text: string, speed = 26) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(text.length); return; }
    const timer = setInterval(() => setShown(n => { if (n >= text.length) { clearInterval(timer); return n; } return n + 1; }), speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return { text: text.slice(0, shown), done: shown >= text.length, skip: () => setShown(text.length) };
}

/** The room itself: wall, mirror, table, chairs, the detective and the swinging lamp. */
function Room() {
  const dust = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    left: 40 + ((i * 37) % 22), top: 14 + ((i * 53) % 18), dx: `${((i * 29) % 40) - 20}px`, t: `${7 + (i % 5) * 1.6}s`, d: `${-(i * 0.9)}s`, size: 1 + (i % 3),
  })), []);
  return (
    <div aria-hidden className="ir-push absolute inset-0 overflow-hidden">
      {/* Back wall with soundproof panels and a one-way mirror. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#2b3442_0%,#161b24_55%,#07090d_100%)]" />
      <div className="absolute inset-x-0 top-[8%] h-[52%] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.035)_0_2px,transparent_2px_86px)]" />
      <div className="absolute top-[16%] left-[8%] h-[30%] w-[28%] rounded-sm border-[6px] border-[#2a2f38] bg-[linear-gradient(135deg,#1c2733_0%,#0e141c_45%,#22303d_60%,#0d1218_100%)] shadow-[inset_0_0_40px_rgba(0,0,0,.8)]">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,.07)_38%,transparent_46%)]" />
        <div className="absolute right-[18%] bottom-0 h-[55%] w-[16%] rounded-t-full bg-black/40 blur-[1px]" />
      </div>
      <div className="absolute top-[14%] right-[10%] rounded bg-[#1f262f] px-3 py-1.5 font-mono text-[10px] tracking-[0.25em] text-[#9aa7b5]/70">INTERVIEW 2 · RECORDING</div>
      <div className="absolute top-[13.4%] right-[7.6%] size-2.5 animate-pulse rounded-full bg-[#e5484d] shadow-[0_0_10px_#e5484d]" />
      {/* Floor. */}
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,#1a1f27,#0b0d11)]" />
      {/* Light: the cone and the pool on the table swing with the lamp. */}
      <div className="ir-swing absolute top-0 left-1/2 h-[78%] w-[70vw] -translate-x-1/2">
        <div className="absolute top-0 left-1/2 h-[19%] w-[2px] -translate-x-1/2 bg-[#0c0e12]" />
        <div className="absolute top-[18%] left-1/2 h-[7%] w-[11%] min-w-16 -translate-x-1/2 rounded-t-[50%] bg-[linear-gradient(180deg,#3b424d,#191d23)] shadow-[0_6px_14px_rgba(0,0,0,.7)]" />
        <div className="ir-flicker absolute top-[24.6%] left-1/2 h-3 w-[7%] min-w-10 -translate-x-1/2 rounded-full bg-[#fff1c4] shadow-[0_0_40px_14px_rgba(255,223,150,.55)]" />
        <div className="ir-flicker absolute top-[25%] left-1/2 h-[75%] w-full -translate-x-1/2 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgba(255,226,160,.45),rgba(255,226,160,.1)_70%,transparent)] [clip-path:polygon(45%_0,55%_0,88%_100%,12%_100%)]" />
        {dust.map((p, i) => (
          <span key={i} className="ir-dust absolute rounded-full bg-[#fff3cf]" style={{ left: `${p.left}%`, top: `${p.top + 25}%`, width: p.size, height: p.size, ["--dx" as string]: p.dx, ["--t" as string]: p.t, ["--d" as string]: p.d }} />
        ))}
      </div>
      {/* The detective, across the table. */}
      <div className="ir-breathe absolute bottom-[34%] left-1/2 w-[18%] min-w-28 -translate-x-1/2">
        <div className="mx-auto aspect-square w-[42%] rounded-full bg-[#14181e] shadow-[inset_-8px_-6px_0_rgba(0,0,0,.3)]">
          <div className="relative top-[38%] mx-auto flex w-[46%] justify-between">
            <span className="h-1 w-[34%] rounded-full bg-[#2c333c]" /><span className="h-1 w-[34%] rounded-full bg-[#2c333c]" />
          </div>
        </div>
        <div className="mx-auto -mt-1 h-24 w-full rounded-t-[42%] bg-[linear-gradient(180deg,#1c222b,#101318)]">
          <div className="mx-auto h-[60%] w-[14%] bg-[#3a2630] [clip-path:polygon(50%_0,100%_20%,60%_100%,40%_100%,0_20%)]" />
        </div>
      </div>
      {/* Table, with the case file and a cup under the lamp. */}
      <div className="absolute bottom-[14%] left-1/2 h-[24%] w-[62%] -translate-x-1/2 [perspective:600px]">
        <div className="absolute inset-0 origin-bottom rounded-md bg-[linear-gradient(180deg,#5b5f66,#3a3d43)] shadow-[0_30px_50px_rgba(0,0,0,.6)] [transform:rotateX(52deg)]">
          <div className="ir-swing absolute -top-[30%] left-1/2 h-[120%] w-[46%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,226,160,.55),transparent)]" />
          <div className="absolute top-[34%] left-[38%] h-[44%] w-[20%] rotate-[-6deg] rounded-sm bg-[#d8c9a3] shadow-md">
            <div className="m-2 h-1 w-1/2 bg-[#8a7a58]" /><div className="mx-2 h-1 w-3/4 bg-[#8a7a58]/60" /><div className="m-2 h-1 w-2/3 bg-[#8a7a58]/60" />
          </div>
          <div className="absolute top-[30%] left-[64%] size-[12%] rounded-full bg-[#e9e4da] shadow-[inset_0_0_0_4px_#cfc8bb]" />
        </div>
      </div>
      <div className="absolute bottom-0 left-[12%] h-[16%] w-[13%] rounded-t-lg bg-[#121419]" />
      <div className="absolute right-[12%] bottom-0 h-[16%] w-[13%] rounded-t-lg bg-[#121419]" />
    </div>
  );
}

export function InterviewRoom({ charge, stars, area, wallet, onDone }: { charge: string; stars: number; area: string; wallet: number; onDone: (outcome: Outcome) => void }) {
  const lines = useMemo(() => [
    `Interview recording started. Detective Hale, Interview Room 2. The reported offence is ${charge.toLowerCase()}, near ${area}. We will go through the incident in order.`,
    "The incident report and witness accounts are being reviewed. Give a clear account of where you were and what happened. Do not invent evidence or accuse another player to avoid responsibility.",
    "You can give your account, request support, or choose not to answer. This is a fictional game interview: the next screen explains each gameplay consequence before you choose. Real legal rights are not determined by a quiz score.",
  ], [charge, area]);
  const [line, setLine] = useState(0);
  const [mode, setMode] = useState<"talk" | "question" | "choose" | "deal" | "waiting" | "result">("talk");
  // The alibi question comes from the question bank; get it right and every option is a star lighter.
  const bank = useBankQuestions(1, () => POLICE_QUESTIONS[Math.floor(Math.random() * POLICE_QUESTIONS.length)]);
  const [alibi, setAlibi] = useState<QuizQuestion | null>(null);
  const [alibiPick, setAlibiPick] = useState<number | null>(null);
  const alibiOk = alibi !== null && alibiPick === alibi.answer;
  const base = alibiOk ? Math.max(1, stars - 1) : stars;
  const [target, setTarget] = useState<{ id: string; username: string } | null>(null);
  const [amount, setAmount] = useState(Math.max(10, Math.min(100, wallet)));
  const [note, setNote] = useState("");
  const [tried, setTried] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState(() => [...ONLINE]);
  const [result, setResult] = useState<Outcome | null>(null);
  const deal = useRef<string | null>(null);
  const t = useTypewriter(mode === "talk" ? lines[line] : mode === "result" && result ? (result.kind === "free" ? `@${result.by} has confessed. You're free to go. ${result.clout} Clout went to them.` : "Then we'll see you in court.") : "");
  const maxOffer = Math.max(0, Math.min(500, wallet));

  useEffect(() => { const timer = setInterval(() => setOnline([...ONLINE]), 2000); return () => clearInterval(timer); }, []);
  // While an offer is out, check every two seconds whether they've answered.
  useEffect(() => {
    if (mode !== "waiting" || !deal.current) return;
    const id = deal.current;
    const started = Date.now();
    const timer = setInterval(async () => {
      const status = await blameDealStatus(id);
      if (status === "accepted" && target) {
        clearInterval(timer);
        setResult({ kind: "free", by: target.username, clout: amount });
        setMode("result");
      } else if (status && status !== "pending") {
        clearInterval(timer);
        setNote(`@${target?.username} said no. The detective is still waiting for your answer.`);
        setMode("choose");
      } else if (Date.now() - started > 62_000) {
        clearInterval(timer);
        setNote(`@${target?.username} didn't answer in time.`);
        setMode("choose");
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [mode, target, amount]);

  const next = () => {
    if (!t.done) return t.skip();
    if (mode === "talk") { if (line < lines.length - 1) setLine(line + 1); else { setAlibi(bank.next()); setMode("question"); } }
    else if (mode === "result" && result) onDone(result);
  };
  const court = (s: number) => { setResult({ kind: "court", stars: s, charge }); setMode("result"); };
  const send = async () => {
    if (!target) return;
    setNote("");
    const r = await offerBlameDeal(target.id, charge, base, amount);
    if (!r.ok) { setNote(r.error); return; }
    deal.current = r.deal;
    setTried(old => new Set(old).add(target.id));
    setMode("waiting");
  };
  const choices = online.filter(p => !tried.has(p.id));

  return (
    <div role="dialog" aria-modal="true" aria-label="Police interview" className="absolute inset-0 z-[100014] overflow-hidden bg-black text-white">
      <style>{CSS}</style>
      <Room />
      <div className="ir-bar absolute inset-x-0 top-0 bg-black" />
      <div className="ir-bar absolute inset-x-0 bottom-0 bg-black" />
      <p className="absolute top-[12vh] left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-black tracking-[0.3em] text-[#f2d9a6] uppercase">Under caution · {stars} star{stars === 1 ? "" : "s"}</p>
      <div className="absolute inset-x-3 bottom-[12vh] mx-auto max-w-2xl">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-[#0d1117]/95 px-4 py-2 text-xs text-white/85"><span>Case record · {charge} · {area}</span><button type="button" onClick={() => setNote("Interview paused for support. Take your time; you can continue when ready. In real life, ask for a solicitor and an appropriate adult if needed.")} className="rounded-full border border-white/40 bg-white/10 px-3 py-2 font-bold text-white">Request support</button></div>
        {note && mode !== "choose" && <p role="status" className="mb-2 rounded-xl bg-[#17283a] px-4 py-2 text-sm text-white">{note}</p>}
        <div className="rounded-3xl border border-white/10 bg-[#0d1117]/92 p-4 shadow-2xl sm:p-5">
          {(mode === "talk" || mode === "result") && (
            <button type="button" onClick={next} className="gloss-off block w-full text-left">
              <p className="text-[11px] font-black tracking-widest text-[#f2d9a6] uppercase">Detective Hale</p>
              <p className="mt-1 min-h-[3.5rem] text-base leading-relaxed sm:text-lg">{t.text}<span className="animate-pulse">{t.done ? "" : "▍"}</span></p>
              <p className="mt-2 text-right text-[11px] text-white/50">{t.done ? (mode === "result" ? "Tap to continue" : "Tap for more") : "Tap to skip"}</p>
            </button>
          )}
          {mode === "question" && alibi && (
            <div>
              <p className="text-[11px] font-black tracking-widest text-[#f2d9a6] uppercase">Detective Hale · back up your story</p>
              <p className="mt-1 text-sm text-white/70">&ldquo;You say you were revising. Prove it.&rdquo;{alibi.subject ? ` · ${alibi.subject}` : ""}</p>
              <p className="mt-2 text-lg leading-snug font-black">{alibi.prompt}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {alibi.options.map((o, i) => (
                  <button key={`${o}-${i}`} type="button" disabled={alibiPick !== null} onClick={() => setAlibiPick(i)}
                    className={`gloss-off rounded-2xl p-3 text-left text-sm font-bold ring-1 ${alibiPick !== null && i === alibi.answer ? "bg-[#15987f] ring-[#15987f]" : alibiPick === i ? "bg-[#c8322d] ring-[#c8322d]" : "bg-white/10 ring-white/15"}`}>
                    {o}
                  </button>
                ))}
              </div>
              {alibiPick !== null && (
                <div className="mt-3 flex items-center gap-3">
                  <p className="flex-1 text-sm text-white/80">{alibiOk ? "Your story checks out. The detective eases off: one star less." : `Not quite${alibi.explain ? `: ${alibi.explain}` : "."} The detective isn't convinced.`}</p>
                  <button type="button" onClick={() => setMode("choose")} className="gloss-off shrink-0 rounded-full bg-[#f2d9a6] px-4 py-2 text-sm font-black text-[#0d1726]">Continue</button>
                </div>
              )}
            </div>
          )}
          {mode === "choose" && (
            <div>
              <p className="text-[11px] font-black tracking-widest text-[#f2d9a6] uppercase">Your answer</p>
              {note && <p className="mt-1 text-sm text-[#ffb4a8]">{note}</p>}
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => court(honestStars(base))} className="gloss-off rounded-2xl bg-[#f2d9a6] p-3 text-left text-[#0d1726]">
                  <span className="block font-black">Tell the truth</span><span className="block text-xs opacity-75">Court goes easier: {honestStars(base)} star{honestStars(base) === 1 ? "" : "s"}</span>
                </button>
                <button type="button" onClick={() => court(base)} className="gloss-off rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/15">
                  <span className="block font-black">Say nothing</span><span className="block text-xs opacity-75">The judge decides on {base} star{base === 1 ? "" : "s"}</span>
                </button>
                <button type="button" disabled={!choices.length || maxOffer < 10} onClick={() => { setTarget(choices[0] ?? null); setMode("deal"); }} className="gloss-off rounded-2xl bg-[#7a5ce6] p-3 text-left disabled:opacity-40">
                  <span className="block font-black">Offer a deal</span>
                  <span className="block text-xs opacity-80">{!choices.length ? "Nobody else is in your server" : maxOffer < 10 ? "You need at least 10 Clout" : "Pay a player to take the blame"}</span>
                </button>
              </div>
            </div>
          )}
          {mode === "deal" && (
            <div>
              <p className="text-[11px] font-black tracking-widest text-[#f2d9a6] uppercase">Offer a deal</p>
              <p className="mt-1 text-sm text-white/75">They&apos;ll see your offer and choose. If they accept, they get the Clout and face the charge in court; if not, it&apos;s back on you.</p>
              <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                {choices.map(p => (
                  <button key={p.id} type="button" aria-pressed={target?.id === p.id} onClick={() => setTarget(p)} className={`gloss-off rounded-full px-3 py-1.5 text-sm font-bold ${target?.id === p.id ? "bg-white text-[#0d1726]" : "bg-white/10 ring-1 ring-white/15"}`}>@{p.username}</button>
                ))}
              </div>
              <label className="mt-3 block text-xs font-bold">
                Offer: <span className="text-[#f2d9a6]">{amount} Clout</span> <span className="text-white/50">(you have {wallet})</span>
                <input type="range" min={10} max={Math.max(10, maxOffer)} step={5} value={amount} onChange={e => setAmount(Number(e.target.value))} className="mt-1 w-full accent-[#f2d9a6]" />
              </label>
              {note && <p className="mt-1 text-sm text-[#ffb4a8]">{note}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setMode("choose")} className="gloss-off rounded-full bg-white/10 px-4 py-2 text-sm font-bold">Back</button>
                <button type="button" disabled={!target} onClick={send} className="gloss-off flex-1 rounded-full bg-[#7a5ce6] px-4 py-2 text-sm font-black disabled:opacity-40">Send offer to @{target?.username ?? "…"}</button>
              </div>
            </div>
          )}
          {mode === "waiting" && (
            <div className="flex items-center gap-3">
              <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-[#f2d9a6]" />
              <div>
                <p className="font-black">Waiting for @{target?.username}…</p>
                <p className="text-xs text-white/60">They have a minute to decide. The detective taps the table.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** What the other player sees: an offer to take the blame for Clout. Their choice. */
export function BlameOfferPrompt({ busy, onAccepted }: { busy: boolean; onAccepted: (r: { charge: string; stars: number; clout: number; wallet?: number; from: string }) => void }) {
  const [offer, setOffer] = useState<BlameOffer | null>(null);
  const [working, setWorking] = useState(false);
  const [left, setLeft] = useState(60);
  useEffect(() => {
    if (busy) return;
    let alive = true;
    const check = async () => {
      const inbox = await blameInbox();
      if (alive && inbox[0]) setOffer(o => o ?? inbox[0]);
    };
    void check();
    const timer = setInterval(check, 4000);
    return () => { alive = false; clearInterval(timer); };
  }, [busy]);
  useEffect(() => {
    if (!offer) return;
    const tick = () => setLeft(Math.max(0, 60 - Math.floor((Date.now() - new Date(offer.created_at).getTime()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [offer]);
  useEffect(() => { if (offer && left === 0) setOffer(null); }, [offer, left]);
  if (!offer) return null;
  const answer = async (accept: boolean) => {
    setWorking(true);
    const r = await answerBlameDeal(offer.id, accept);
    setWorking(false);
    setOffer(null);
    if (r.ok && r.status === "accepted" && r.charge && r.stars) onAccepted({ charge: r.charge, stars: r.stars, clout: r.clout ?? offer.clout, wallet: r.wallet, from: offer.from_username });
  };
  return (
    <div role="alertdialog" aria-label="A deal offer" className="absolute top-20 left-1/2 z-[100013] w-[min(92vw,380px)] -translate-x-1/2 rounded-3xl border border-white/15 bg-[#13203a]/95 p-4 text-white shadow-2xl backdrop-blur">
      <p className="text-[10px] font-black tracking-[0.2em] text-[#f2d9a6] uppercase">A deal · {left}s</p>
      <p className="mt-1 text-sm leading-relaxed"><b>@{offer.from_username}</b> is in a police interview and offers you <b className="text-[#f2d9a6]">{offer.clout} Clout</b> to take the blame for <b>{offer.charge.toLowerCase()}</b> ({offer.stars} star{offer.stars === 1 ? "" : "s"}).</p>
      <p className="mt-1 text-xs text-white/60">If you accept, you get the Clout now and go to court for it. It&apos;s completely up to you.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={working} onClick={() => answer(false)} className="gloss-off flex-1 rounded-full bg-white/10 px-4 py-2 text-sm font-bold ring-1 ring-white/15">No thanks</button>
        <button type="button" disabled={working} onClick={() => answer(true)} className="gloss-off flex-1 rounded-full bg-[#f2d9a6] px-4 py-2 text-sm font-black text-[#0d1726]">Accept deal</button>
      </div>
    </div>
  );
}
