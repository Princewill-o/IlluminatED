"use client";

import { useState } from "react";

import { Bus, GraduationCap, X } from "lucide-react";


import { VehicleJourney } from "./vehicle-journey";

import { COACHES } from "@/game/core/coaches";
import { UK_PLACES } from "@/game/core/uk-world";
import { UNIVERSITIES } from "@/game/core/universities";

/** Rough road miles from London, for the motorway signs on the way. */
const FROM_LONDON: Record<string, number> = { manchester: 200, birmingham: 120, leeds: 195, edinburgh: 400, glasgow: 410, bristol: 120, oxford: 60, cambridge: 60, liverpool: 215, newcastle: 280, cardiff: 150, nottingham: 130, sheffield: 170, southampton: 80, brighton: 55, york: 210, bath: 115, durham: 260, exeter: 170, leicester: 100 };
const milesFor = (from: string, to: string) => {
  if (from === to) return 4;
  const key = (id: string) => Object.keys(FROM_LONDON).find((k) => id.includes(k));
  const a = from === "city" ? 0 : FROM_LONDON[key(from) ?? ""] ?? 120, b = to === "city" ? 0 : FROM_LONDON[key(to) ?? ""] ?? 120;
  return Math.max(30, Math.abs(a - b) || Math.round((a + b) / 3));
};
const cityName = (id: string) => (id === "city" ? "London" : UK_PLACES.find((p) => p.id === id)?.name.split(" · ")[0] ?? id);

/**
 * The university coach: pick a university anywhere in the UK, ride the coach
 * and step off at its front entrance. London universities are a short hop;
 * other cities are a longer ride along the motorway.
 */
export function CoachTrip({ from, onGo, onClose }: { from: string; onGo: (city: string, university: string) => void; onClose: () => void }) {
  const [riding, setRiding] = useState<{ city: string; id: string; name: string } | null>(null);
  const cities = [...new Set(UNIVERSITIES.map((u) => u.city))];
  const coach = COACHES[riding ? (riding.id.length % COACHES.length) : 0];

  if (riding) {
    const miles = milesFor(from, riding.city);
    return <VehicleJourney kind="coach" coach={coach.id} from={cityName(from)} to={riding.name} miles={miles} seconds={riding.city === from ? 9 : Math.round(14 + Math.min(16, miles / 25))} onArrive={() => onGo(riding.city, riding.id)} />;
  }
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
        ) : null}
      </section>
    </div>
  );
}
