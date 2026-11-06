"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { COURT, PLAYER_WORK } from "./art";

import { acquittalChance, sentenceMs } from "@/game/core/law";
import { cn } from "@/lib/utils";

/**
 * A Crown Court trial played out in the courtroom: the usher, judge, barristers, a witness and
 * the jury take turns (they gesture in the 3D room while they speak), you make the calls for
 * your defence, and there's one chance to make a run for the door. Fictional and simplified.
 */
export type TrialVerdict = "dismissed" | "acquitted" | "guilty" | "escaped" | "caught";
type Line = { who: string; speaker: string; text: string };
type Choice = { label: string; effect: number; reply: Line };
type Beat =
  | { kind: "say"; line: Line; ms?: number }
  | { kind: "plea" }
  | { kind: "choose"; prompt: Line; choices: Choice[] }
  | { kind: "escape" }
  | { kind: "deliberate" }
  | { kind: "verdict" };

const WHO: Record<string, string> = {
  usher: "Court usher", judge: "Judge", clerk: "Court clerk", prosecution: "Prosecution", defence: "Your barrister", witness: "Witness", "jury-1": "Jury foreperson",
};
const say = (speaker: string, text: string, ms?: number): Beat => ({ kind: "say", line: { who: WHO[speaker] ?? speaker, speaker, text }, ms });

function script(charge: string, solicitor: boolean): Beat[] {
  return [
    say("usher", "All rise."),
    say("judge", "Please be seated. Call the case."),
    say("clerk", `The defendant is charged with ${charge.charAt(0).toLowerCase()}${charge.slice(1)}. How do you plead?`, 2600),
    { kind: "plea" },
    say("prosecution", "Your Honour, the prosecution will show the defendant was at the scene and acted on purpose.", 3000),
    {
      kind: "choose",
      prompt: { who: WHO.defence, speaker: "defence", text: "How do you want me to open your defence?" },
      choices: [
        { label: "\"The prosecution must prove it beyond reasonable doubt. Let's test their evidence.\"", effect: 0.12, reply: { who: WHO.judge, speaker: "judge", text: "Quite right. The burden of proof is on the prosecution." } },
        { label: "\"My client is a good person, so they couldn't have done it.\"", effect: -0.04, reply: { who: WHO.judge, speaker: "judge", text: "Character alone doesn't answer the evidence. Carry on." } },
        { label: "Shout across the court that it's all a stitch-up", effect: -0.15, reply: { who: WHO.judge, speaker: "judge", text: "Order! Any more of that and you'll be in contempt of court." } },
      ],
    },
    say("prosecution", "I call our witness."),
    say("witness", "I saw someone in a dark jacket near the shops. I think it was them.", 2800),
    {
      kind: "choose",
      prompt: { who: WHO.defence, speaker: "defence", text: "Cross-examination. What should I ask the witness?" },
      choices: [
        { label: "\"How far away were you, how long did you look, and was it dark?\"", effect: 0.14, reply: { who: WHO.witness, speaker: "witness", text: "Erm… across the road. A few seconds. It was getting dark." } },
        { label: "\"Lots of people wear dark jackets, don't they?\"", effect: 0.06, reply: { who: WHO.witness, speaker: "witness", text: "I suppose they do, yes." } },
        { label: "\"You're lying and everyone knows it!\"", effect: -0.12, reply: { who: WHO.judge, speaker: "judge", text: "Counsel will not badger the witness." } },
      ],
    },
    say("usher", "Your Honour, I'll fetch exhibit B from the store room.", 2400),
    { kind: "escape" },
    say("prosecution", "Exhibit B: CCTV from the high street at 6:14 pm.", 2600),
    {
      kind: "choose",
      prompt: { who: WHO.defence, speaker: "defence", text: "The CCTV is blurry. How do we answer it?" },
      choices: [
        { label: "Ask for the full, timestamped footage and the camera's location", effect: 0.13, reply: { who: WHO.prosecution, speaker: "prosecution", text: "…The full footage is still being retrieved, Your Honour." } },
        { label: "Admit it was you but say a friend made you do it", effect: -0.2, reply: { who: WHO.judge, speaker: "judge", text: "That is an admission. The jury will note it." } },
        { label: "Say nothing about it", effect: 0, reply: { who: WHO.judge, speaker: "judge", text: "Very well. Closing speeches." } },
      ],
    },
    say("defence", solicitor ? "Members of the jury: the duty solicitor's notes show gaps in every piece of evidence. If you're not sure, you must acquit." : "Members of the jury: if you are not sure, you must find my client not guilty.", 3200),
    say("judge", "Members of the jury, please retire and consider your verdict."),
    { kind: "deliberate" },
    { kind: "verdict" },
  ];
}

export function CourtTrial({ charge, stars, cards, solicitor, onVerdict }: { charge: string; stars: number; cards: number; solicitor: boolean; onVerdict: (v: TrialVerdict) => void }) {
  const beats = useMemo(() => script(charge, solicitor), [charge, solicitor]);
  const [at, setAt] = useState(0);
  const [lean, setLean] = useState(() => Math.min(0.85, acquittalChance(stars) + (solicitor ? 0.12 : 0)));
  const [reply, setReply] = useState<Line | null>(null);
  const [result, setResult] = useState<TrialVerdict | null>(null);
  const [typed, setTyped] = useState(0);
  const [escapeLeft, setEscapeLeft] = useState(6);
  const [running, setRunning] = useState(false);
  const decided = useRef(false);
  const beat = beats[Math.min(at, beats.length - 1)];
  const next = useCallback(() => { setReply(null); setAt((n) => n + 1); }, []);

  const line: Line | null = useMemo(() => reply ?? (beat.kind === "say" ? beat.line : beat.kind === "choose" ? beat.prompt : beat.kind === "plea" ? { who: WHO.clerk, speaker: "clerk", text: "How do you plead?" } : beat.kind === "deliberate" ? { who: "Narrator", speaker: "", text: "The jury leaves to talk it over…" } : beat.kind === "escape" ? { who: "Narrator", speaker: "", text: "The usher has left the room. The side door is unguarded…" } : null), [reply, beat]);

  // Whoever is talking gestures in the 3D courtroom; you stand in the dock.
  useEffect(() => { COURT.speaker = line?.speaker || null; }, [line]);
  useEffect(() => { PLAYER_WORK.activity = null; return () => { COURT.speaker = null; PLAYER_WORK.activity = null; }; }, []);
  useEffect(() => { setTyped(0); }, [line?.text]);
  useEffect(() => {
    if (!line || typed >= line.text.length) return;
    const t = window.setTimeout(() => setTyped((n) => Math.min(line.text.length, n + 2)), 18);
    return () => clearTimeout(t);
  }, [line, typed]);

  // Spoken lines and replies move on by themselves.
  useEffect(() => {
    if (result) return;
    if (reply) { const t = window.setTimeout(next, 2600); return () => clearTimeout(t); }
    if (beat.kind === "say") { const t = window.setTimeout(next, beat.ms ?? 2100); return () => clearTimeout(t); }
    if (beat.kind === "deliberate") { const t = window.setTimeout(next, 3200); return () => clearTimeout(t); }
  }, [beat, reply, next, result]);

  // The escape window closes after a few seconds.
  useEffect(() => {
    if (beat.kind !== "escape" || running || result) return;
    if (escapeLeft <= 0) { next(); return; }
    const t = window.setTimeout(() => setEscapeLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [beat, escapeLeft, running, next, result]);

  // The verdict: the foreperson stands, the gavel falls.
  useEffect(() => {
    if (beat.kind !== "verdict" || decided.current) return;
    decided.current = true;
    const v: TrialVerdict = Math.random() < lean ? "acquitted" : "guilty";
    COURT.speaker = "jury-1";
    const t1 = window.setTimeout(() => { COURT.gavelAt = performance.now(); setResult(v); }, 2400);
    return () => clearTimeout(t1);
  }, [beat, lean]);

  const plead = (p: "guilty" | "not" | "card") => {
    if (p === "card") { COURT.gavelAt = performance.now(); onVerdict("dismissed"); return; }
    if (p === "guilty") { setReply({ who: WHO.judge, speaker: "judge", text: "You have pleaded guilty. I'll take that into account when sentencing." }); COURT.gavelAt = performance.now(); window.setTimeout(() => setResult("guilty"), 2300); return; }
    setReply({ who: WHO.judge, speaker: "judge", text: "A plea of not guilty. The trial will begin." });
  };
  const choose = (c: Choice) => { setLean((l) => Math.max(0.05, Math.min(0.9, l + c.effect))); setReply(c.reply); };
  const run = () => {
    setRunning(true);
    PLAYER_WORK.activity = "walk";
    const ok = Math.random() < 0.35;
    window.setTimeout(() => { PLAYER_WORK.activity = null; setResult(ok ? "escaped" : "caught"); }, 2600);
  };

  const verdictLine = result === "acquitted" ? "Not guilty." : result === "guilty" ? "Guilty." : null;
  return (
    <>
      {running && !result && (
        <div className="pointer-events-none fixed inset-0 z-[100010] grid place-items-center bg-[#0d1726]/40">
          <style>{`@keyframes court-run{0%{transform:translateX(-30vw)}100%{transform:translateX(30vw)}}`}</style>
          <p className="rounded-2xl bg-[#c8322d] px-6 py-4 text-2xl font-black text-white shadow-2xl" style={{ animation: "court-run 2.4s ease-in both" }}>You bolt for the side door…</p>
        </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-[100004] flex justify-center p-3">
        <section role="dialog" aria-label="Crown Court trial" className="pixel-panel w-full max-w-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black tracking-[0.2em] text-[#7a4f32] uppercase">Crown Court · R v You · {charge}</p>
            <div className="flex items-center gap-2 text-[11px] font-black" title="How the case seems to be going">
              <span>Guilty</span>
              <span className="relative h-2 w-24 overflow-hidden rounded-full bg-[#c8322d]/30"><span className="absolute inset-y-0 left-0 rounded-full bg-[#15987f] transition-[width] duration-700" style={{ width: `${lean * 100}%` }} /></span>
              <span>Not guilty</span>
            </div>
          </div>
          {line && !result && (
            <div className="mt-3 rounded-2xl bg-[#13203a] p-3 text-white">
              <p className="text-xs font-black text-[#ffd166] uppercase">{line.who}</p>
              <p className="mt-1 min-h-[2.75rem] text-base leading-snug font-bold">{line.text.slice(0, typed)}</p>
            </div>
          )}
          {!reply && !result && beat.kind === "plea" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => plead("not")} className="pixel-button px-3 py-3 text-sm">Not guilty: go to trial</button>
              <button type="button" onClick={() => plead("guilty")} className="pixel-button px-3 py-3 text-sm">Plead guilty</button>
              <button type="button" disabled={!cards} onClick={() => plead("card")} className="pixel-button pixel-button--green px-3 py-3 text-sm disabled:opacity-40">Show finished homework ({cards})</button>
            </div>
          )}
          {!reply && !result && beat.kind === "choose" && (
            <div className="mt-3 grid gap-2">
              {beat.choices.map((c) => <button key={c.label} type="button" onClick={() => choose(c)} className="pixel-button px-3 py-2.5 text-left text-sm">{c.label}</button>)}
            </div>
          )}
          {!result && beat.kind === "escape" && !running && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={run} className="pixel-button bg-[#c8322d] px-3 py-3 text-sm font-black text-white">Make a run for the door ({escapeLeft}s)</button>
              <button type="button" onClick={next} className="pixel-button px-3 py-3 text-sm">Stay in the dock</button>
              <p className="text-xs text-[#13203a]/70 sm:col-span-2">If you're caught it counts against you. If you get away, you're on the run with 5 wanted stars.</p>
            </div>
          )}
          {result && (
            <div className="mt-3">
              <p className={cn("rounded-2xl p-3 text-lg font-black", result === "acquitted" || result === "escaped" ? "bg-[#e3f5ec] text-[#15987f]" : "bg-[#fdeceb] text-[#c8322d]")}>
                {verdictLine ? `Foreperson: "${verdictLine}"` : result === "escaped" ? "You're out of the side door and away! The police will be looking for you." : "Court security tackle you at the door. That's contempt of court."}
                <span className="mt-1 block text-sm font-bold text-[#13203a]/70">{result === "acquitted" ? "You're free to go." : result === "guilty" ? `Judge: "Take them down." ${Math.round(sentenceMs(stars) / 1000)} seconds in HMP Thames.` : result === "caught" ? `Guilty, with 45 seconds added for contempt.` : "Lose the police to clear your record."}</span>
              </p>
              <button type="button" onClick={() => onVerdict(result)} className="pixel-button mt-3 w-full rounded-full bg-[#13203a] py-3 font-black text-white">
                {result === "acquitted" ? "Leave the court" : result === "escaped" ? "Run!" : "Go to prison"}
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
