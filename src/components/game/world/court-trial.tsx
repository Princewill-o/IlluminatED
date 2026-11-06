"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { COURT, PLAYER_WORK } from "./art";

import { type CourtCase, courtCase, scoreClosing } from "@/game/core/court-case";
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
  | { kind: "file" }
  | { kind: "cross" }
  | { kind: "contradiction" }
  | { kind: "alibi" }
  | { kind: "closing" }
  | { kind: "escape" }
  | { kind: "deliberate" }
  | { kind: "verdict" };

const WHO: Record<string, string> = {
  usher: "Court usher", judge: "Judge", clerk: "Court clerk", prosecution: "Prosecution", defence: "Your barrister", witness: "Witness", "jury-1": "Jury foreperson",
};
const say = (speaker: string, text: string, ms?: number): Beat => ({ kind: "say", line: { who: WHO[speaker] ?? speaker, speaker, text }, ms });

function script(charge: string, solicitor: boolean, c: CourtCase): Beat[] {
  return [
    say("usher", "All rise."),
    say("judge", "Please be seated. Call the case."),
    say("clerk", `The defendant is charged with ${charge.charAt(0).toLowerCase()}${charge.slice(1)}. How do you plead?`, 2600),
    { kind: "plea" },
    say("prosecution", `Your Honour, the prosecution says the defendant was at ${c.place} at ${c.time}. We have a witness and CCTV.`, 3200),
    { kind: "file" },
    say("prosecution", "I call our witness."),
    say("witness", c.statement, 3200),
    { kind: "cross" },
    { kind: "contradiction" },
    say("usher", "Your Honour, I'll fetch exhibit B from the store room.", 2400),
    { kind: "escape" },
    {
      kind: "choose",
      prompt: { who: WHO.prosecution, speaker: "prosecution", text: `Exhibit B: CCTV from near ${c.place}, timed at ${c.cctv.time}. It's ${c.cctv.quality}. How do you answer it?` },
      choices: [
        { label: `"The offence was at ${c.time}. Look at the time on that footage."`, effect: c.cctv.matches ? -0.06 : 0.16, reply: c.cctv.matches ? { who: WHO.judge, speaker: "judge", text: "The times match exactly. That point doesn't help you." } : { who: WHO.judge, speaker: "judge", text: `Noted: the footage is ${c.cctv.time}, not ${c.time}. The jury will bear that in mind.` } },
        { label: "\"You can't see a face. It could be anyone.\"", effect: 0.08, reply: { who: WHO.prosecution, speaker: "prosecution", text: "…The face isn't visible, Your Honour, no." } },
        { label: "Accept it and move on", effect: -0.05, reply: { who: WHO.judge, speaker: "judge", text: "Very well. The footage stands unchallenged." } },
      ],
    },
    { kind: "alibi" },
    { kind: "closing" },
    say("judge", solicitor ? "Thank you. The duty solicitor's notes are with the jury too. Members of the jury, please retire." : "Members of the jury, please retire and consider your verdict."),
    { kind: "deliberate" },
    { kind: "verdict" },
  ];
}

export function CourtTrial({ charge, stars, cards, solicitor, onVerdict }: { charge: string; stars: number; cards: number; solicitor: boolean; onVerdict: (v: TrialVerdict) => void }) {
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const file = useMemo(() => courtCase(seed), [seed]);
  const beats = useMemo(() => script(charge, solicitor, file), [charge, solicitor, file]);
  const [asked, setAsked] = useState<string[]>([]);
  const [exhibit, setExhibit] = useState<string | null>(null);
  const [speech, setSpeech] = useState("");
  const [heard, setHeard] = useState<string[]>([]);
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

  const line: Line | null = useMemo(() => reply ?? (beat.kind === "say" ? beat.line : beat.kind === "choose" ? beat.prompt : beat.kind === "plea" ? { who: WHO.clerk, speaker: "clerk", text: "How do you plead?" } : beat.kind === "deliberate" ? { who: "Narrator", speaker: "", text: "The jury leaves to talk it over…" } : beat.kind === "escape" ? { who: "Narrator", speaker: "", text: "The usher has left the room. The side door is unguarded…" } : beat.kind === "file" ? { who: WHO.defence, speaker: "defence", text: "Here's the case file. Read it carefully: what don't they know for sure?" } : beat.kind === "cross" ? { who: WHO.defence, speaker: "defence", text: `Cross-examine the witness. You can ask three questions (${3 - asked.length} left).` } : beat.kind === "contradiction" ? { who: WHO.defence, speaker: "defence", text: "Did the witness contradict themselves? Only say so if you heard it." } : beat.kind === "alibi" ? { who: WHO.defence, speaker: "defence", text: "Your evidence locker. Show the court one item, or none. Choose carefully: the wrong thing can hurt you." } : beat.kind === "closing" ? { who: WHO.judge, speaker: "judge", text: "Closing speech. In your own words, tell the jury why they can't be sure you did it." } : null), [reply, beat, asked.length]);

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
    // Replies stay up long enough to read; you keep cross-examining until you're done.
    if (reply) { const t = window.setTimeout(() => (beat.kind === "cross" && asked.length < 3 ? setReply(null) : next()), Math.min(6000, Math.max(2600, 1400 + reply.text.length * 32))); return () => clearTimeout(t); }
    if (beat.kind === "say") { const t = window.setTimeout(next, beat.ms ?? 2100); return () => clearTimeout(t); }
    if (beat.kind === "deliberate") { const t = window.setTimeout(next, 3200); return () => clearTimeout(t); }
  }, [beat, reply, next, result, asked.length]);

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
  const ask = (q: CourtCase["questions"][number]) => {
    setAsked((a) => [...a, q.id]);
    setHeard((h) => [...h, `${q.ask} → ${q.answer}`]);
    setLean((l) => Math.max(0.05, Math.min(0.9, l + q.helps)));
    setReply({ who: q.id === "lead" ? WHO.judge : WHO.witness, speaker: q.id === "lead" ? "judge" : "witness", text: q.id === "lead" ? "Counsel will not badger the witness. Ask a proper question." : q.answer });
  };
  const spot = (claim: "clothes" | "none" | "time") => {
    const heardClothes = asked.includes("clothes");
    const real = file.contradiction !== null;
    const right = claim === "clothes" ? real && heardClothes : claim === "none" ? !real || !heardClothes : false;
    setLean((l) => Math.max(0.05, Math.min(0.9, l + (right ? (claim === "clothes" ? 0.16 : 0.02) : -0.08))));
    setReply(claim === "clothes" && right ? { who: WHO.judge, speaker: "judge", text: "Yes: first one item of clothing, now another. The jury will note the witness isn't consistent." } : right ? { who: WHO.judge, speaker: "judge", text: "Fair enough. Let's move on." } : { who: WHO.prosecution, speaker: "prosecution", text: "The witness said no such thing, Your Honour. Check your notes." });
  };
  const present = (id: string | null) => {
    setExhibit(id);
    const e = file.locker.find((x) => x.id === id);
    setLean((l) => Math.max(0.05, Math.min(0.9, l + (e?.strength ?? 0))));
    setReply(e ? { who: WHO.judge, speaker: "judge", text: `${e.name}: ${e.why}` } : { who: WHO.judge, speaker: "judge", text: "No evidence from the defence. That's your right." });
  };
  const close = () => {
    const r = scoreClosing(speech, file, { exhibit: exhibit ?? undefined, askedFound: asked });
    setLean((l) => Math.max(0.05, Math.min(0.92, l + r.score)));
    setReply({ who: WHO.judge, speaker: "judge", text: r.notes.length ? `Thank you. ${r.notes.join(" ")}` : "Thank you. The jury has heard you." });
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
          {!reply && !result && beat.kind === "file" && (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[11px] font-black uppercase opacity-60">Offence</p><p className="font-bold">{file.time} at {file.place}</p></div>
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[11px] font-black uppercase opacity-60">Witness statement</p><p className="font-bold">&ldquo;{file.statement}&rdquo;</p></div>
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[11px] font-black uppercase opacity-60">CCTV</p><p className="font-bold">Timed {file.cctv.time} · {file.cctv.quality}</p></div>
              <button type="button" onClick={next} className="pixel-button px-3 py-2.5 text-sm sm:col-span-3">I&apos;ve read it</button>
            </div>
          )}
          {!reply && !result && beat.kind === "cross" && (
            <div className="mt-3 grid gap-2">
              {heard.length > 0 && <ul className="max-h-24 overflow-y-auto rounded-xl bg-white/70 p-2 text-xs">{heard.map((h) => <li key={h}>• {h}</li>)}</ul>}
              {asked.length < 3 ? file.questions.filter((q) => !asked.includes(q.id)).map((q) => <button key={q.id} type="button" onClick={() => ask(q)} className="pixel-button px-3 py-2 text-left text-sm">{q.ask}</button>) : null}
              <button type="button" onClick={next} className="pixel-button px-3 py-2 text-sm">{asked.length ? "No more questions" : "No questions for this witness"}</button>
            </div>
          )}
          {!reply && !result && beat.kind === "contradiction" && (
            <div className="mt-3 grid gap-2">
              {heard.length > 0 && <ul className="rounded-xl bg-white/70 p-2 text-xs"><li>• Statement: {file.statement}</li>{heard.map((h) => <li key={h}>• {h}</li>)}</ul>}
              <button type="button" onClick={() => spot("clothes")} className="pixel-button px-3 py-2 text-left text-sm">&ldquo;Your Honour, the witness has described different clothes.&rdquo;</button>
              <button type="button" onClick={() => spot("time")} className="pixel-button px-3 py-2 text-left text-sm">&ldquo;The witness changed the time.&rdquo;</button>
              <button type="button" onClick={() => spot("none")} className="pixel-button px-3 py-2 text-left text-sm">Say nothing: no contradiction</button>
            </div>
          )}
          {!reply && !result && beat.kind === "alibi" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {file.locker.map((e) => <button key={e.id} type="button" onClick={() => present(e.id)} className="pixel-button px-3 py-2 text-left text-sm"><span className="block font-black">{e.name}</span><span className="block text-xs opacity-80">{e.detail}</span></button>)}
              <button type="button" onClick={() => present(null)} className="pixel-button px-3 py-2 text-sm sm:col-span-2">Show nothing</button>
            </div>
          )}
          {!reply && !result && beat.kind === "closing" && (
            <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); if (speech.trim().length >= 10) close(); }}>
              <textarea value={speech} onChange={(e) => setSpeech(e.target.value)} rows={3} maxLength={600} placeholder="Members of the jury…" className="w-full rounded-xl border-2 border-[#13203a]/20 bg-white p-3 text-sm text-[#13203a] outline-none focus:border-[#13203a]" />
              <p className="text-[11px] text-[#13203a]/70">Tip: the prosecution has to prove it so the jury is sure. Use what you found: the witness&apos;s view, the CCTV time, your evidence.</p>
              <button type="submit" disabled={speech.trim().length < 10} className="pixel-button px-3 py-2.5 text-sm disabled:opacity-40">Deliver closing speech</button>
            </form>
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
