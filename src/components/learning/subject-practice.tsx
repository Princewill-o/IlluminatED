"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import styles from "./subjects.module.css";

import { loadSubjectProgress, saveSubjectDraft, startSubjectAttempt, submitSubjectAttempt, type SubjectAttempt } from "@/lib/learning/actions";
import { practiceSet, racePoints, type SubjectPack } from "@/lib/learning/packs";
import { createSaveQueue } from "@/lib/learning/save-queue";


type Result = { score: number; maxScore: number; seconds: number; points?: number; saved: boolean };
export function SubjectPractice({ pack, assignment }: { pack: SubjectPack; assignment: string | null }) {
  const [answers, setAnswers] = useState<number[]>([-1,-1,-1,-1]);
  const [indices, setIndices] = useState(() => practiceSet(pack));
  const [written, setWritten] = useState("");
  const [attempt, setAttempt] = useState<SubjectAttempt | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"practice" | "race">("practice");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<SubjectAttempt[]>([]);
  const [status, setStatus] = useState("Loading saved work…");
  const [error, setError] = useState("");
  const [ticks, setTicks] = useState(0);
  const [modelVisible, setModelVisible] = useState(false);
  const startedAt = useRef(0);
  const round = useRef(0);
  const saveQueue = useRef(createSaveQueue());
  const draftTimer = useRef<number | null>(null);
  const localKey = `illumed-subject-draft:${pack.product}:${pack.slug}:${assignment ?? "solo"}`;
  const storageKey = useRef(`${localKey}:guest`);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const progress = await loadSubjectProgress(pack.product);
        if (!active) return;
        storageKey.current = `${localKey}:${progress.userId ?? "guest"}`;
        let localWritten = "";
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey.current) ?? "null");
          if (saved && typeof saved.written === "string") localWritten = saved.written.slice(0,12000);
          if (saved && Array.isArray(saved.answers) && saved.answers.length === 4 && saved.answers.every((a: unknown) => Number.isInteger(a) && Number(a) >= -1 && Number(a) < 4) && Array.isArray(saved.indices) && saved.indices.length === 4 && saved.indices.every((i: unknown) => Number.isInteger(i) && Number(i) >= 0 && Number(i) < pack.questions.length)) {
            setAnswers(saved.answers);setIndices(saved.indices);round.current=Math.floor(saved.indices[0]/4)+1;
          }
        } catch { /* Blocked browser storage does not prevent cloud learning. */ }
        setWritten(localWritten);
        setSignedIn(progress.signedIn);
        setHistory(progress.attempts.filter((item) => item.topic_slug === pack.slug));
        if (progress.signedIn) {
          const started = await startSubjectAttempt(pack.product,pack.slug,"practice",assignment);
          if (!active) return;
          if (started.ok) {
            setAttempt(started.attempt);
            setIndices(started.attempt.question_indices);
            setAnswers(started.attempt.draft_answers);
            setWritten(started.attempt.written_response ?? localWritten);
            setStatus("Signed in · draft sync is on");
          } else {
            setError(("error" in started ? started.error : undefined) ?? "Sign in to save this assignment.");
            setStatus("Browser backup only · cloud sync unavailable");
          }
        } else {
          setStatus("Guest practice · drafts stay in this browser");
          if (assignment) setError("Sign in with your class account to submit this assignment. Guest practice is not sent to your teacher.");
        }
      } catch {
        if (active) { setError("Saved work could not load. You can still practise here."); setStatus("Browser backup only"); }
      } finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, [pack.product,pack.slug,pack.questions.length,assignment,localKey]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey.current,JSON.stringify({ answers, written,indices })); } catch { /* Report cloud state independently. */ }
    if (!attempt || attempt.submitted_at || result || busy) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setStatus("Saving draft…");
      void saveQueue.current.enqueue(() => saveSubjectDraft(attempt.id,answers,written)).then((saved) => {
        if (active) setStatus(saved.ok ? "Draft saved to your account" : saved.error);
      }).catch(() => { if (active) setStatus("Cloud sync failed · browser backup retained"); });
    },800);
    draftTimer.current = timer;
    return () => {active=false;window.clearTimeout(timer);};
  }, [answers,written,indices,attempt,ready,localKey,result,busy]);

  useEffect(() => {
    if (!playing || result || mode !== "race") return;
    const timer = window.setInterval(() => setTicks(Math.max(0,Math.floor((Date.now()-startedAt.current)/1000))),250);
    return () => window.clearInterval(timer);
  }, [playing,result,mode]);

  async function begin(nextMode: "practice" | "race") {
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
    setBusy(true); setError("");
    try {
      await saveQueue.current.settled();
      if (signedIn) {
        if (attempt && !attempt.submitted_at) {
          const flushed = await saveQueue.current.enqueue(() => saveSubjectDraft(attempt.id,answers,written));
          if (!flushed.ok) {setError(flushed.error);return;}
        }
        const next = nextMode === "practice" && attempt?.mode === "practice" && !attempt.submitted_at && !result
          ? { ok: true as const, attempt: {...attempt,draft_answers:answers,written_response:written} }
          : await startSubjectAttempt(pack.product,pack.slug,nextMode,assignment);
        if (!next.ok) { setError(("error" in next ? next.error : undefined) ?? "Sign in again to save this attempt."); return; }
        setAttempt(next.attempt); setIndices(next.attempt.question_indices); setAnswers(next.attempt.draft_answers);
        setWritten(next.attempt.written_response ?? written);
      } else {
        if (!(nextMode === "practice" && !playing && !result && answers.some((answer) => answer>=0))) {
          const chosen = nextMode === "race" ? pack.questions.map((_,i) => i) : practiceSet(pack,round.current++);
          setIndices(chosen); setAnswers(chosen.map(() => -1));
        }
        setAttempt(null);
      }
      startedAt.current = Date.now(); setTicks(0); setMode(nextMode); setResult(null); setPlaying(true);
      window.setTimeout(() => document.getElementById("practice-heading")?.focus(),0);
    } catch { setError("The attempt could not start. Try again."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (answers.some((answer) => answer < 0)) { setError("Choose an answer for every question first."); return; }
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
    setBusy(true); setError("");
    try {
      await saveQueue.current.settled();
      if (signedIn && attempt) {
        const saved = await submitSubjectAttempt(attempt.id,answers,written);
        if (!saved.ok) { setError(saved.error); return; }
        const item = saved.attempt;
        setAttempt(item); setHistory((items) => [item,...items.filter((previous) => previous.id !== item.id)]);
        setResult({ score:item.score ?? 0,maxScore:item.max_score,seconds:item.elapsed_seconds ?? 0,...(item.race_points !== null ? {points:item.race_points} : {}),saved:true });
        setStatus(assignment ? "Submitted to your class · teacher feedback appears in School" : "Result saved to your account");
      } else {
        const score = answers.filter((answer,i) => answer === pack.questions[indices[i]].answer).length;
        const seconds = Math.max(1,Math.floor((Date.now()-startedAt.current)/1000));
        setResult({score,maxScore:indices.length,seconds,...(mode === "race" ? {points:racePoints(score,indices.length,seconds)} : {}),saved:false});
        setStatus("Practice result in this visit · sign in to save results across devices");
      }
      window.setTimeout(() => document.getElementById("practice-result")?.focus(),0);
    } catch { setError("Your result could not sync. Your answers remain here so you can retry submitting."); }
    finally { setBusy(false); }
  }

  const raceHistory = history.filter((item) => item.mode === "race" && item.submitted_at).sort((a,b) => (b.race_points ?? 0)-(a.race_points ?? 0));
  const questions = indices.map((index) => pack.questions[index]);
  const answered = answers.filter((answer) => answer >= 0).length;
  return <>
    {assignment && <p className={styles.feedback}>Class assignment · complete the quiz{pack.writing ? " and your written response" : ""}, then submit. <Link href="/school" className="underline">View assignments and feedback</Link>.</p>}
    {pack.writing && <section className={styles.section} id="writing-workshop">
      <p className={styles.eyebrow}>Writing workshop</p><h2>Your draft, your revision</h2><p>{pack.writing.prompt}</p>
      <label htmlFor="subject-writing"><strong>Your response</strong> <span className={styles.muted}>(maximum 12,000 characters)</span></label>
      <textarea id="subject-writing" className={styles.textarea} value={written} onChange={(event) => setWritten(event.target.value)} maxLength={12000} disabled={!ready || busy || !!result} placeholder="Build your response here. Your writing is not automatically assigned an exam grade." />
      <p className={styles.muted}>{written.trim() ? written.trim().split(/\s+/).length : 0} words · account drafts sync automatically when signed in; guest drafts use this browser.</p>
      <h3>Review your own response</h3><div className={styles.rubric}>{pack.writing.rubric.map((item) => <label key={item.criterion}><input type="checkbox" /><span><strong>{item.criterion}</strong><br />{item.guidance}</span></label>)}</div>
      <details open={modelVisible} onToggle={(event) => setModelVisible(event.currentTarget.open)}><summary>Compare with an example response</summary><p className={styles.muted}>One possible response, not the only correct answer. Use the rubric to revise your own writing.</p><div className={styles.model}>{pack.writing.model}</div></details>
      <p className={styles.muted}>The quiz is marked automatically. Your writing remains ungraded until reviewed by a teacher. Self-check boxes are reflection, not marks.</p>
    </section>}

    <section className={styles.section} id="practice">
      <p className={styles.eyebrow}>Try · understand · retry</p><h2 id="practice-heading" tabIndex={-1}>{mode === "race" && playing ? "Solo Maths Race" : "Check your understanding"}</h2>
      <p>Practise four questions from this {pack.questions.length}-question bank, then read the explanations. Another set prioritises questions outside your last set when available{signedIn ? "" : " in this visit"}.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={!ready || busy} onClick={() => void begin("practice")}>{result ? "Retry with another set" : playing ? "Restart / resume practice" : "Start / resume practice"}</button>
        {pack.product === "maths" && <button type="button" className={styles.secondary} disabled={!ready || busy} onClick={() => void begin("race")}>Race all {pack.questions.length} questions</button>}
      </div>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>
      {error && <p className={styles.error} role="alert">{error} {error.includes("profile") && <Link href={`/onboarding?next=${encodeURIComponent(`/${pack.product}/${pack.slug}`)}`} className="underline">Open account setup</Link>}</p>}
      {!signedIn && ready && <p className={styles.muted}><Link href={`/sign-in?next=${encodeURIComponent(`/${pack.product}/${pack.slug}${assignment ? `?assignment=${assignment}` : ""}`)}`} className="underline">Sign in</Link> for saved topic results, cross-device drafts and class submissions.</p>}
      {playing && mode === "race" && <div className={styles.race}><strong>🏁 Accuracy first. Time breaks ties.</strong><div className={styles.track}><div className={styles.racer} style={{width:`${answered/questions.length*100}%`}} /></div><span className={styles.raceCount}>{answered}/{questions.length} answered · {ticks}s</span><p className={styles.muted}>Solo practice against your own best. Saved time starts when the server creates the race, so network/start delay can affect it. No prizes or Clout are awarded.</p></div>}
      {result && <div className={styles.result} id="practice-result" tabIndex={-1} role="status"><strong>{result.score}/{result.maxScore} correct · {Math.round(result.score/result.maxScore*100)}%</strong><p>{mode === "race" ? `${result.seconds}s · ${result.points?.toLocaleString()} practice points. ` : ""}{result.saved ? "Saved to your account." : "Guest result; not saved to an account."}</p><p>Read every explanation, revisit the example, then try another set. This result covers this mini-pack and does not predict an exam grade.</p>{pack.writing && <p>Writing: {written.trim() ? "response included" : "no response included"}; no automatic writing grade.</p>}</div>}
      {playing && <form onSubmit={(event) => {event.preventDefault(); void submit();}}>
        {questions.map((question,index) => <fieldset className={styles.question} key={`${indices[index]}:${index}`} disabled={busy || !!result}>
          <legend>{index+1}. {question.prompt}</legend><div className={styles.options}>{question.options.map((option,choice) => <label className={styles.option} key={option}><input type="radio" name={`question-${index}`} value={choice} checked={answers[index] === choice} onChange={() => setAnswers((previous) => previous.map((answer,i) => i === index ? choice : answer))} /><span>{option}</span></label>)}</div>
          {result && <p className={styles.feedback}><strong>{answers[index] === question.answer ? "Correct." : `Review: ${question.options[question.answer]}.`}</strong> {question.explanation}</p>}
        </fieldset>)}
        {!result && <button className={styles.button} type="submit" disabled={busy || !ready}>{busy ? "Saving…" : assignment ? "Submit quiz and response" : "Mark answers and save"}</button>}
      </form>}
    </section>
    {pack.product === "maths" && <section className={styles.section}><h2>Your topic race record</h2><p>Accuracy contributes up to 100,000 points. The time bonus is at most 998, so a faster, less accurate attempt cannot outrank a more accurate one in these banks.</p>{raceHistory.length ? <ul className={styles.history}>{raceHistory.slice(0,5).map((item) => <li key={item.id}><strong>{item.score}/{item.max_score}</strong> · {item.elapsed_seconds}s · {item.race_points?.toLocaleString()} points · {new Date(item.submitted_at!).toLocaleDateString("en-GB")}</li>)}</ul> : <p className={styles.muted}>No saved races for this topic yet. Sign in and finish a race to set your first record.</p>}</section>}
  </>;
}
