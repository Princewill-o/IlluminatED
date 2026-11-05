"use client";

import { useEffect, useState } from "react";

import { Bus, GraduationCap, X } from "lucide-react";

import { COACHES } from "@/game/core/coaches";
import { UK_PLACES } from "@/game/core/uk-world";
import { UNIVERSITIES } from "@/game/core/universities";
import { cn } from "@/lib/utils";

const cityName = (id: string) => (id === "city" ? "London" : UK_PLACES.find((p) => p.id === id)?.name.split(" · ")[0] ?? id);

/**
 * The university coach: pick a university anywhere in the UK, ride the coach
 * and step off at its front entrance. London universities are a short hop;
 * other cities are a longer ride along the motorway.
 */
export function CoachTrip({ from, onGo, onClose }: { from: string; onGo: (city: string, university: string) => void; onClose: () => void }) {
  const [riding, setRiding] = useState<{ city: string; id: string; name: string } | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!riding) return;
    const start = performance.now(), length = riding.city === from ? 2200 : 4200;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / length);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else onGo(riding.city, riding.id);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [riding, from, onGo]);
  const cities = [...new Set(UNIVERSITIES.map((u) => u.city))];
  const coach = COACHES[riding ? (riding.id.length % COACHES.length) : 0];

  return (
    <div className="absolute inset-0 z-[100015] grid place-items-center bg-[#07101f]/60 p-4 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
      <section role="dialog" aria-modal="true" aria-labelledby="coach-title" className="max-h-[90%] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/15 bg-[#13203a]/95 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,.5)]">
        {!riding ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black tracking-[0.2em] text-[#9ec5ff] uppercase"><Bus className="size-4" aria-hidden /> University coach</p>
                <h2 id="coach-title" className="mt-1 text-2xl font-black">Where would you like to visit?</h2>
                <p className="mt-1 text-sm text-white/70">The coach drops you at the university&apos;s front entrance. Go inside to talk to the subject guide, events ambassador and networking mentor.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="gloss-off grid size-10 shrink-0 place-items-center rounded-full bg-white/10"><X className="size-5" aria-hidden /></button>
            </div>
            <div className="mt-5 grid gap-4">
              {cities.map((city) => (
                <div key={city}>
                  <p className="text-[11px] font-black tracking-widest text-white/55 uppercase">{cityName(city)}{city === from && " · you're here"}</p>
                  <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                    {UNIVERSITIES.filter((u) => u.city === city).map((u) => (
                      <button key={u.id} type="button" onClick={() => setRiding({ city, id: u.id, name: u.fullName })}
                        className="gloss-off flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 hover:bg-white/10">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: u.colour }}><GraduationCap className="size-5" aria-hidden /></span>
                        <span className="min-w-0">
                          <span className="block font-black">{u.fullName}</span>
                          <span className="block text-xs text-white/60">{city === from ? "Short ride across town" : `Coach from ${cityName(from)}`}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-4 text-center" role="status" aria-live="polite">
            <p className="text-xs font-black tracking-[0.2em] text-[#9ec5ff] uppercase">On the coach</p>
            <h2 className="mt-1 text-2xl font-black">{riding.name}</h2>
            <div className="relative mx-auto mt-6 h-24 max-w-md overflow-hidden rounded-2xl bg-[#0b1220]">
              <div className="absolute inset-x-0 bottom-5 h-1 bg-[repeating-linear-gradient(90deg,#f2d9a6_0_18px,transparent_18px_36px)]" style={{ backgroundPositionX: `${-progress * 600}px` }} />
              <div className="absolute bottom-7 h-11 w-28 rounded-lg shadow-lg" style={{ left: `calc(${progress * 70}% + 4%)`, background: coach.body }}>
                <span className="absolute inset-x-2 top-1.5 h-4 rounded bg-[#9fc4dc]/80" />
                <span className="absolute inset-x-0 bottom-2 h-1.5" style={{ background: coach.accent }} />
                <span className="absolute -bottom-1.5 left-4 size-4 rounded-full bg-[#1b1b1f]" />
                <span className="absolute right-4 -bottom-1.5 size-4 rounded-full bg-[#1b1b1f]" />
              </div>
            </div>
            <p className={cn("mt-4 text-sm text-white/70")}>{riding.city === from ? "Across town" : `${cityName(from)} → ${cityName(riding.city)}`} · {Math.round(progress * 100)}%</p>
          </div>
        )}
      </section>
    </div>
  );
}
