"use client";

import { useEffect, useId, useRef } from "react";

import { Trophy, X } from "lucide-react";

import { AwardCollection } from "@/components/game/awards";
import type { LearningAward } from "@/game/core/awards";

export function LearningAwards({ awards, onClose }: { awards: LearningAward[]; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const title = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key === "Tab") {
        const buttons = panel.current?.querySelectorAll<HTMLElement>("button, a[href], [tabindex='0']");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <div className="absolute inset-0 z-[100009] grid place-items-center bg-[#13203a]/70 p-3 backdrop-blur-sm" onClick={onClose}>
      <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title} onClick={(e) => e.stopPropagation()} className="max-h-[95%] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-background p-5 text-foreground shadow-2xl outline-none sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#ffedbd] text-[#825d14]"><Trophy aria-hidden /></span>
          <div className="flex-1"><p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Study Quarter</p><h2 id={title} className="text-2xl font-black">Your awards cabinet</h2></div>
          <button type="button" onClick={onClose} aria-label="Close awards cabinet" className="jelly grid size-11 place-items-center rounded-full bg-muted focus-visible:outline-2"><X className="size-5" /></button>
        </div>
        <p className="mt-4 mb-5 text-sm leading-6 text-muted-foreground">{awards.filter((award) => award.earned).length} of {awards.length} milestones earned. Build your collection through subject study and simulated work shifts. These are game achievements, not accredited qualifications.</p>
        <AwardCollection awards={awards} />
      </section>
    </div>
  );
}
