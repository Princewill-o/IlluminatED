"use client";

import { useMemo, useState } from "react";

import { HeartHandshake, X } from "lucide-react";

import { APPROACHES, DISPUTES } from "@/game/core/street-disputes";
import { cn } from "@/lib/utils";

type Choice = { text: string; good: boolean; why: string };

/** Mixes the order so the calm answer isn't always first (stable per disagreement). */
function shuffled<T>(list: T[], seed: number) {
  const out = [...list];
  let k = seed * 9301 + 49297;
  for (let i = out.length - 1; i > 0; i--) { k = (k * 9301 + 49297) % 233280; const j = Math.floor((k / 233280) * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/**
 * Step in to a street disagreement: pick how to approach, then suggest a fair
 * fix. A wrong pick explains why it would make things worse, and you try again.
 */
export function DisputeHelp({ index, id, onDone, onClose }: { index: number; id: string; onDone: (firstTry: boolean) => void; onClose: () => void }) {
  const dispute = DISPUTES.find((d) => d.id === id) ?? DISPUTES[0];
  const [step, setStep] = useState<0 | 1>(0);
  const [picked, setPicked] = useState<Choice | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const choices = useMemo(() => shuffled(step === 0 ? APPROACHES : dispute.fixes, index + step), [step, dispute, index]);

  const pick = (c: Choice) => {
    setPicked(c);
    if (!c.good) { setMistakes((m) => m + 1); return; }
    if (step === 0) { window.setTimeout(() => { setStep(1); setPicked(null); }, 1100); return; }
    window.setTimeout(() => onDone(mistakes === 0), 1200);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-[100008] flex justify-center p-2 sm:p-4 md:inset-auto md:right-4 md:bottom-24" role="dialog" aria-label="Help calm it down">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border-b-8 border-black/25 bg-[#f7f4ee] text-[#16213a] shadow-2xl [color-scheme:light]">
        <header className="flex items-center gap-3 bg-[#15987f] px-4 py-3 text-white">
          <HeartHandshake className="size-6 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-black">Help calm it down</h2>
            <p className="truncate text-xs text-white/80">Two people are arguing about {dispute.about}.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Walk away" className="grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25"><X className="size-5" /></button>
        </header>
        <div className="space-y-3 p-4">
          <p className="text-xs font-black tracking-widest text-[#15987f] uppercase">Step {step + 1} of 2 · {step === 0 ? "How do you step in?" : "What fair fix do you suggest?"}</p>
          <div className="space-y-2">
            {choices.map((c) => (
              <button key={c.text} type="button" disabled={!!picked?.good} onClick={() => pick(c)}
                className={cn("w-full rounded-2xl border-2 bg-white px-4 py-3 text-left text-sm font-semibold shadow-sm transition-colors hover:border-[#15987f]/60",
                  picked === c ? (c.good ? "border-[#15987f] bg-[#dff5e3]" : "border-[#d6452a] bg-[#ffe1dc]") : "border-transparent")}>
                “{c.text}”
              </button>
            ))}
          </div>
          {picked && (
            <p className={cn("rounded-2xl px-3 py-2 text-sm", picked.good ? "bg-[#dff5e3] text-[#0e5e4e]" : "bg-[#ffe1dc] text-[#8a2a17]")} aria-live="polite">
              <b>{picked.good ? "Nice. " : "That would make it worse. "}</b>{picked.why}{picked.good ? "" : " Try another."}
            </p>
          )}
          <p className="text-[11px] text-black/50">If an argument ever looks unsafe in real life, keep your distance and get a trusted adult or call for help.</p>
        </div>
      </section>
    </div>
  );
}
