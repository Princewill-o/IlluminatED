"use client";
import { useMemo, useState } from "react";

import { BookOpen, Siren, X } from "lucide-react";

import { ARCADE } from "@/game/core/arcade";
import { POLICE_QUESTIONS } from "@/game/core/pursuit";
import { createRng, newSeed } from "@/game/core/rng";
import { cn } from "@/lib/utils";

export function PoliceChallenge({
  onResult,
}: {
  onResult: (correct: boolean) => void;
}) {
  const [question] = useState(
    () => POLICE_QUESTIONS[Math.floor(Math.random() * POLICE_QUESTIONS.length)],
  );
  const [picked, setPicked] = useState<number | null>(null);
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
        <p className="mt-5 text-xl font-black">{question.prompt}</p>
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
            <p className="mt-4 text-sm">{question.explain}</p>
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
  const [q, setQ] = useState(() => ARCADE[0].make(rng));
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
                setQ(ARCADE[Math.floor(rng() * ARCADE.length)].make(rng));
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
