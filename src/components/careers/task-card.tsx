"use client";

import { useState } from "react";

import { Check, X } from "lucide-react";

import { SKILLS, type Task, checkAnswer } from "@/game/core/careers";
import { cn } from "@/lib/utils";

/** One work task: the material, the question, and what you learn from it. */
export function TaskCard({ task, index, total, onDone }: { task: Task; index: number; total: number; onDone: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

  const answer = (value: number | string) => {
    if (result !== null) return;
    const ok = checkAnswer(task, value);
    setResult(ok);
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
        <span className="tracking-widest uppercase">
          Task {index + 1} of {total}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1">{SKILLS[task.skill]}</span>
      </div>
      <h3 className="mt-2 text-xl font-black">{task.title}</h3>
      <p className="mt-2 leading-7">{task.prompt}</p>

      {task.doc?.type === "code" && (
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#1b1622] p-4 text-[13px] leading-6 text-[#e9e6f2]">
          <code>
            {task.doc.text!.split("\n").map((l, i) => (
              <span key={i} className="block">
                <span className="mr-4 inline-block w-5 text-right text-[#6d6680] select-none">{i + 1}</span>
                {l}
              </span>
            ))}
          </code>
        </pre>
      )}
      {task.doc?.type === "ticket" && (
        <pre className="mt-3 w-fit rotate-[-1deg] rounded-md border border-dashed border-[#c9bfaa] bg-[#fffaf0] px-5 py-4 font-mono text-sm leading-6 whitespace-pre-wrap text-[#1b1622] shadow-sm">
          {task.doc.text}
        </pre>
      )}
      {task.doc?.type === "table" && task.doc.rows && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <tbody>
              {task.doc.rows.map((r, i) => (
                <tr key={i} className={cn(i === 0 ? "bg-secondary font-bold" : "border-t border-border")}>
                  {r.map((c, j) => (
                    <td key={j} className={cn("px-3 py-2", c === "Booked" || c === "Lunch" ? "text-muted-foreground" : c === "Free" ? "font-bold text-ink-mint" : "")}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {task.numeric ? (
        <form
          className="mt-4 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) answer(typed);
          }}
        >
          <label className="flex items-center gap-1 rounded-2xl border border-input bg-background px-3 py-2.5 text-lg font-bold">
            {task.numeric.prefix && <span className="text-muted-foreground">{task.numeric.prefix}</span>}
            <input
              inputMode="decimal"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={result !== null}
              aria-label="Your answer"
              className="w-28 bg-transparent outline-none"
            />
            {task.numeric.unit && <span className="text-muted-foreground">{task.numeric.unit}</span>}
          </label>
          {result === null && (
            <button type="submit" className="rounded-full bg-brand px-5 py-3 font-black text-white disabled:opacity-40" disabled={!typed.trim()}>
              Submit
            </button>
          )}
        </form>
      ) : (
        <div className="mt-4 grid gap-2">
          {task.options!.map((o, i) => {
            const isRight = result !== null && i === task.answer;
            const isWrongPick = result === false && i === picked;
            return (
              <button
                key={i}
                type="button"
                disabled={result !== null}
                onClick={() => {
                  setPicked(i);
                  answer(i);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] leading-6 transition",
                  isRight ? "border-ink-mint bg-[#5fd3a5]/15 font-bold" : isWrongPick ? "border-ink-coral bg-[#ff7a6b]/15" : "border-border hover:bg-hover",
                )}
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-black">
                  {isRight ? <Check className="size-4" aria-hidden /> : isWrongPick ? <X className="size-4" aria-hidden /> : String.fromCharCode(65 + i)}
                </span>
                <span className="whitespace-pre-wrap">{o}</span>
              </button>
            );
          })}
        </div>
      )}

      {result !== null && (
        <div className={cn("mt-4 rounded-2xl p-4", result ? "bg-[#5fd3a5]/15" : "bg-[#ff7a6b]/12")} role="status">
          <p className="font-black">{result ? "Spot on." : task.numeric ? `Not quite. The answer is ${task.numeric.prefix ?? ""}${task.answer}${task.numeric.unit ? ` ${task.numeric.unit}` : ""}.` : "Not quite."}</p>
          <p className="mt-1 text-sm leading-6">{task.explain}</p>
          <button type="button" onClick={() => onDone(result)} className="mt-3 rounded-full bg-brand px-5 py-2.5 font-black text-white">
            {index + 1 === total ? "Finish" : "Next task"}
          </button>
        </div>
      )}
    </div>
  );
}
