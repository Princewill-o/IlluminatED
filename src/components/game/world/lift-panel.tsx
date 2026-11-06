"use client";

import { useEffect, useState } from "react";

import { ArrowDown, ArrowUp, X } from "lucide-react";

import { play, soundOn } from "../sound";

type Floor = { mapId: string; label: string; current: boolean; level?: 0 | 1; x?: number; y?: number };

/** Inside the lift: press a floor, the doors close, the display counts, ding, and out you step. */
export function LiftPanel({ floors, onClose, onArrive }: { floors: Floor[]; onClose: () => void; onArrive: (f: Floor) => void }) {
  const here = floors.findIndex((f) => f.current);
  const [target, setTarget] = useState<number | null>(null);
  const [shown, setShown] = useState(here);
  const [doors, setDoors] = useState(1);
  useEffect(() => {
    if (target === null) return;
    setDoors(0);
    const steps = Math.abs(target - here);
    const timers: number[] = [];
    for (let i = 1; i <= steps; i++) timers.push(window.setTimeout(() => setShown(here + Math.sign(target - here) * i), 700 + i * 800));
    timers.push(window.setTimeout(() => { play("door", soundOn()); setDoors(1); }, 900 + steps * 800));
    timers.push(window.setTimeout(() => onArrive(floors[target]), 1500 + steps * 800));
    return () => timers.forEach(clearTimeout);
  }, [target, here, floors, onArrive]);
  const going = target === null ? 0 : Math.sign(target - here);
  return (
    <div className="fixed inset-0 z-[100010] grid place-items-center bg-black/60 p-4" role="dialog" aria-label="Lift">
      <section className="relative w-full max-w-sm overflow-hidden rounded-3xl border-b-8 border-black/40 bg-[linear-gradient(#c9ced6,#9aa3ad)] p-5 shadow-2xl">
        <div className="mx-auto mb-4 flex w-32 items-center justify-center gap-2 rounded-lg bg-[#141020] py-2 font-mono text-2xl font-black text-[#ff9f43] shadow-inner">
          {going > 0 ? <ArrowUp className="size-5" /> : going < 0 ? <ArrowDown className="size-5" /> : null}{shown === 0 ? "G" : shown}
        </div>
        {/* The doors. */}
        <div className="relative mx-auto mb-4 h-40 w-48 overflow-hidden rounded-lg bg-[#ffe9b0] shadow-inner">
          <div className="absolute inset-y-0 left-0 w-1/2 border-r border-black/20 bg-[linear-gradient(90deg,#aeb5be,#d4d9df)] transition-transform duration-700" style={{ transform: `translateX(${doors ? -92 : 0}%)` }} />
          <div className="absolute inset-y-0 right-0 w-1/2 border-l border-black/20 bg-[linear-gradient(270deg,#aeb5be,#d4d9df)] transition-transform duration-700" style={{ transform: `translateX(${doors ? 92 : 0}%)` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {floors.map((f, i) => (
            <button key={f.mapId} type="button" disabled={target !== null || f.current} onClick={() => { play("click", soundOn()); setTarget(i); }}
              className={`grid aspect-square place-items-center rounded-full border-4 text-lg font-black shadow ${target === i ? "border-[#ff9f43] bg-[#fff4e0] text-[#c85a00] shadow-[0_0_14px_#ff9f43]" : "border-[#6b7280] bg-[#eef1f4] text-[#13203a]"} disabled:opacity-60`}>
              <span>{i === 0 ? "G" : i}<span className="block text-[9px] font-bold">{f.label}</span></span>
            </button>
          ))}
        </div>
        {target === null && <button type="button" onClick={onClose} aria-label="Step out" className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/70"><X className="size-4" /></button>}
      </section>
    </div>
  );
}
