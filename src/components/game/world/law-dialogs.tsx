"use client";
import { useEffect, useMemo, useRef, useState } from "react";

import { BookOpen, Coins, Gavel, ShieldCheck, Siren, X } from "lucide-react";

import { type QuizQuestion, useBankQuestions } from "./use-bank-questions";

import { ARCADE } from "@/game/core/arcade";
import { adjudicateStreetCase, settleStreetVerdict, type StreetCourtCase, type StreetResolution, type StreetVerdict } from "@/game/core/civilian-conflict";
import { POLICE_QUESTIONS } from "@/game/core/pursuit";
import { createRng, newSeed } from "@/game/core/rng";
import { cn } from "@/lib/utils";

export function PoliceChallenge({
  onResult,
}: {
  onResult: (correct: boolean) => void;
}) {
  // A real question from the question bank (your subjects), or a built-in one offline.
  const bank = useBankQuestions(1, () => POLICE_QUESTIONS[Math.floor(Math.random() * POLICE_QUESTIONS.length)]);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  useEffect(() => { if (bank.ready && !question) setQuestion(bank.next()); }, [bank, question]);
  const [picked, setPicked] = useState<number | null>(null);
  if (!question) return (
    <div className="absolute inset-0 z-[100008] grid place-items-center bg-[#13203a]/80 p-4">
      <p role="status" className="rounded-2xl bg-[#f7f1e6] px-5 py-4 font-black text-[#13203a]">The officer is thinking of a question…</p>
    </div>
  );
  const correct = picked === question.answer;
  return (
    <div className="absolute inset-0 z-[100008] grid place-items-center overflow-y-auto bg-[#13203a]/80 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Police knowledge challenge"
        className="w-full max-w-lg rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a] [color-scheme:light]"
      >
        <Siren className="size-9 text-[#2b5fd9]" />
        <h2 className="mt-3 text-2xl font-black">
          One chance to talk your way out
        </h2>
        <p className="mt-2 text-sm text-[#5a6272]">
          The officers caught up. Answer correctly for a warning; a wrong answer
          sends you to a court hearing. This is a fictional game rule.
        </p>
        {question.subject && <p className="mt-5 inline-block rounded-full bg-[#2b5fd9]/10 px-3 py-1 text-xs font-black text-[#2b5fd9]">{question.subject}{question.topic ? ` · ${question.topic}` : ""}</p>}
        <p className="mt-3 text-xl font-black">{question.prompt}</p>
        <div className="mt-4 grid gap-2">
          {question.options.map((o, i) => (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={cn(
                "rounded-2xl border-2 bg-white p-3 text-left font-bold",
                picked !== null && i === question.answer
                  ? "border-[#15987f]"
                  : picked === i
                    ? "border-[#c8322d]"
                    : "border-transparent",
              )}
            >
              {o}
            </button>
          ))}
        </div>
        {picked !== null && (
          <>
            {question.explain && <p className="mt-4 text-sm">{question.explain}</p>}
            <button
              type="button"
              onClick={() => onResult(correct)}
              className="jelly mt-4 w-full rounded-full bg-[#2b5fd9] py-3 font-black text-white"
            >
              {correct ? "Accept the warning" : "Go to the hearing"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export function PrisonStudy({
  progress,
  onCorrect,
  onClose,
}: {
  progress: number;
  onCorrect: () => void;
  onClose: () => void;
}) {
  const rng = useMemo(() => createRng(newSeed()), []);
  const bank = useBankQuestions(6, () => ARCADE[0].make(rng));
  const [q, setQ] = useState<QuizQuestion>(() => ARCADE[0].make(rng));
  const swapped = useRef(false);
  useEffect(() => { if (bank.ready && !swapped.current) { swapped.current = true; setQ(bank.next()); } }, [bank]);
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="absolute inset-0 z-[100008] grid place-items-center overflow-y-auto bg-black/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Prison study desk"
        className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="size-6 text-[#2b5fd9]" />
          <h2 className="flex-1 text-xl font-black">Study towards release</h2>
          <button type="button" onClick={onClose} aria-label="Close study desk">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-[#5a6272]">
          Get three revision answers right and serve your remaining time. Or
          complete assigned homework and use a homework card.
        </p>
        <p role="status" className="mt-3 font-black">
          {Math.min(3, progress)}/3 correct
        </p>
        <p className="mt-5 text-2xl font-black">{q.prompt}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {q.options.map((o, i) => (
            <button
              key={i}
              type="button"
              disabled={picked !== null || progress >= 3}
              onClick={() => {
                setPicked(i);
                if (i === q.answer) onCorrect();
              }}
              className={cn(
                "rounded-2xl border-2 bg-white p-3 font-bold",
                picked !== null && i === q.answer
                  ? "border-[#15987f]"
                  : picked === i
                    ? "border-[#c8322d]"
                    : "border-transparent",
              )}
            >
              {o}
            </button>
          ))}
        </div>
        {picked !== null && (
          <>
            <p className="mt-3 text-sm">
              {picked === q.answer
                ? "Correct. Your study progress is saved."
                : `Correct answer: ${q.options[q.answer]}. Try the next one.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setQ(bank.next());
                setPicked(null);
              }}
              disabled={progress >= 3}
              className="mt-4 w-full rounded-full bg-[#2b5fd9] py-3 font-black text-white disabled:opacity-40"
            >
              Next question
            </button>
          </>
        )}
        {progress >= 3 && (
          <p className="mt-4 font-bold text-[#0f7a52]">
            Study complete. You can leave when the sentence timer ends.
          </p>
        )}
      </section>
    </div>
  );
}

/** A separate evidence-based hearing for recorded civilian encounters. */
export function StreetHearingDialog({ caseFile, balance, onResolved }: {
  caseFile: StreetCourtCase;
  balance: number;
  onResolved: (resolution: StreetResolution) => void;
}) {
  const [verdict,setVerdict] = useState<StreetVerdict | null>(null);
  const completed = useRef(false);
  const [busy,setBusy] = useState(false);
  const defence = caseFile.evidence.firstAttacker === "civilian";
  const evidence = caseFile.evidence;
  const resolve = (choice: "pay" | "custody") => {
    if (!verdict || completed.current) return;
    completed.current = true; setBusy(true);
    onResolved(settleStreetVerdict(verdict,balance,Date.now(),choice));
  };
  return <div className="absolute inset-0 z-[100008] grid place-items-center overflow-y-auto bg-[#13203a]/80 p-4">
    <section role="dialog" aria-modal="true" aria-label="Street incident hearing" className="my-auto w-full max-w-lg rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a] [color-scheme:light]">
      <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#e0ece7] text-[#247666]"><Gavel className="size-7"/></span><div><p className="text-xs font-black uppercase tracking-widest text-[#6a634e]">Crown Court · fictional game</p><h2 className="mt-1 text-xl font-black">{defence ? "Present your self-defence case" : "Street-scuffle hearing"}</h2></div></div>
      <p className="mt-4 text-sm leading-relaxed">{caseFile.charge}. The court reviews who landed the first hit and what happened afterwards.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 text-sm">
        <div><dt className="text-xs text-[#68717c]">First landed hit</dt><dd className="mt-1 font-bold">{defence ? caseFile.npcName : "You"}</dd></div>
        <div><dt className="text-xs text-[#68717c]">Incident duration</dt><dd className="mt-1 font-bold">{Math.ceil(evidence.durationMs/1000)} seconds</dd></div>
        <div><dt className="text-xs text-[#68717c]">Damage you received</dt><dd className="mt-1 font-bold">{evidence.damageToPlayer}</dd></div>
        <div><dt className="text-xs text-[#68717c]">Damage you dealt</dt><dd className="mt-1 font-bold">{evidence.damageToCivilian}</dd></div>
      </dl>
      {defence && <p className={cn("mt-3 rounded-xl p-3 text-sm",evidence.proportionate?"bg-[#e0ece7] text-[#195b4f]":"bg-[#fff0d3] text-[#775229]")}><ShieldCheck className="mr-2 inline size-4"/>{evidence.proportionate ? "The record supports a prompt, limited response to the attack." : evidence.hitsAfterThreatEnded ? "The record includes hits after the civilian stopped attacking." : evidence.lateRetaliationHits ? "The record includes a delayed response after the attack." : "The response caused substantially more damage than the attack."}</p>}
      {!verdict ? <div className="mt-5 space-y-2">
        <p className="mb-3 text-sm">A lost case brings a {caseFile.fine} Clout fine. You can pay and leave; if you cannot afford it, you serve {Math.round(caseFile.stars*45)} seconds in the existing jail activity.</p>
        <button type="button" onClick={()=>setVerdict(adjudicateStreetCase(caseFile,"contest"))} className="min-h-12 w-full rounded-2xl bg-[#2b5fd9] px-4 py-3 text-left font-black text-white">{defence ? "Explain self-defence and contest the case" : "Contest the case"}<span className="mt-1 block text-xs font-medium text-white/85">Game acquittal chance: {Math.round(caseFile.acquittalChance*100)}% · {evidence.witnesses} witness{evidence.witnesses===1?"":"es"}</span></button>
        <button type="button" onClick={()=>setVerdict(adjudicateStreetCase(caseFile,"admit"))} className="min-h-11 w-full rounded-2xl border border-[#13203a]/20 bg-white px-4 py-3 text-left text-sm font-bold">Accept responsibility · {Math.max(1,Math.round(caseFile.fine*.8))} Clout fine</button>
      </div> : verdict.outcome === "acquitted" ? <div className="mt-5 rounded-2xl bg-[#e0ece7] p-4">
        <p className="font-black text-[#195b4f]">Case dismissed. No fine or jail.</p><p className="mt-1 text-sm">The incident is closed. You can return to the city.</p>
        <button type="button" disabled={busy} onClick={()=>resolve("pay")} className="mt-4 min-h-11 w-full rounded-full bg-[#247666] px-4 py-3 font-black text-white disabled:opacity-50">Leave the court</button>
      </div> : <div className="mt-5 rounded-2xl bg-white p-4">
        <p className="flex items-center gap-2 font-black"><Coins className="size-5 text-[#a27325]"/>Fine: {verdict.fine} Clout</p><p className="mt-2 text-sm">Your balance: {Math.max(0,Math.floor(balance))} Clout.</p>
        {balance >= verdict.fine ? <button type="button" disabled={busy} onClick={()=>resolve("pay")} className="mt-4 min-h-11 w-full rounded-full bg-[#2b5fd9] px-4 py-3 font-black text-white disabled:opacity-50">Pay {verdict.fine} Clout and leave</button> : <><p className="mt-3 text-sm text-[#8a463c]">You cannot afford this fine. Your Clout will stay unchanged and the sentence lasts {Math.round(verdict.custodyMs/1000)} seconds.</p><button type="button" disabled={busy} onClick={()=>resolve("custody")} className="mt-4 min-h-11 w-full rounded-full bg-[#13203a] px-4 py-3 font-black text-white disabled:opacity-50">Cannot pay · serve the sentence</button></>}
      </div>}
    </section>
  </div>;
}
