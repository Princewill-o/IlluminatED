"use client";

import { useEffect, useState, useTransition } from "react";

import { Bike, X } from "lucide-react";

import { TubeBadge } from "./tube-map";

import { hireBike } from "@/app/games/world/actions";
import { BIKES, type BikeBrand } from "@/game/core/bikes";
import { STATION_PLATFORM_Y, TILE, type WorldMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

/** A bike drawn under your character while you ride. */
export function BikeUnder({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 48 26" width={44} height={24} aria-hidden className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2">
      <circle cx="10" cy="17" r="7" fill="none" stroke="#15151c" strokeWidth="3" />
      <circle cx="38" cy="17" r="7" fill="none" stroke="#15151c" strokeWidth="3" />
      <path d="M10 17 20 6h12l6 11M20 6l4 11h-14M32 6l-2-3h-4" fill="none" stroke={colour} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="16" y="3" width="8" height="3" rx="1.5" fill="#15151c" />
    </svg>
  );
}

/** Dock beside a station: pick a brand, pay Clout, ride faster for a few minutes. */
export function BikeDock({ clout, riding, onRide, onDock, onClose }: { clout: number; riding: BikeBrand | null; onRide: (b: BikeBrand, clout: number) => void; onDock: () => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="absolute inset-0 z-[100000] grid place-items-end bg-black/60 md:place-items-center" onClick={onClose}>
      <div role="dialog" aria-label="Bike dock" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-[#f7f1e6] p-5 text-[#13203a] md:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-[#2b5fd9] uppercase">Bike dock</p>
            <h2 className="mt-1 text-2xl font-black">Hire a bike</h2>
            <p className="text-sm text-[#13203a]/70">Walking is slow. Bikes get you across London fast. You have {clout} Clout.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white">
            <X className="size-4" />
          </button>
        </div>
        {riding ? (
          <button type="button" onClick={onDock} className="mt-4 w-full rounded-full bg-[#13203a] py-3 font-black text-white">
            Dock your {riding.name} bike here
          </button>
        ) : (
          <ul className="mt-4 space-y-2">
            {BIKES.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  disabled={pending || clout < b.price}
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      const r = await hireBike(b.id);
                      if (r.ok) onRide(b, r.clout);
                      else setError(r.error);
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-2xl border-2 border-white bg-white px-3 py-3 text-left disabled:opacity-50"
                >
                  <span className="grid size-11 place-items-center rounded-xl" style={{ background: b.colour }}>
                    <Bike className="size-6 text-white" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black">{b.name}</span>
                    <span className="block text-xs text-[#13203a]/70">
                      {b.blurb} {b.speed}x speed for {b.minutes} min.
                    </span>
                  </span>
                  <span className="rounded-full bg-[#f2d9a6] px-3 py-1 text-sm font-black">{b.price}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-3 text-sm font-bold text-[#c8322d]">{error}</p>}
      </div>
    </div>
  );
}

/** Inside a station: the track, platform edge, signs and a train that pulls in and out. */
export function StationArt({ map }: { map: WorldMap }) {
  const trackY = (STATION_PLATFORM_Y + 3) * TILE;
  return (
    <div aria-hidden className="pointer-events-none absolute top-0 left-0" style={{ width: map.width, height: map.height }}>
      {/* Tiled wall with the station name. */}
      <div className="absolute flex items-center gap-2 rounded-lg border-4 border-[#13203a] bg-[#f6f2e8] px-4 py-1" style={{ left: map.width / 2 - 120, top: TILE * 0.15, width: 240 }}>
        <TubeBadge size={22} />
        <span className="truncate text-sm font-black text-[#13203a]">{map.name.replace(/ station$/, "")}</span>
      </div>
      {/* Platform edge. */}
      <div className="absolute bg-[#ffd166]" style={{ left: TILE, top: trackY - 8, width: map.width - TILE * 2, height: 6 }} />
      <div className="absolute bg-[#cfc8b8]" style={{ left: TILE, top: trackY - 2, width: map.width - TILE * 2, height: 4 }} />
      {/* Track pit with rails and sleepers. */}
      <div
        className="absolute overflow-hidden bg-[#2a2733]"
        style={{
          left: TILE,
          top: trackY + 2,
          width: map.width - TILE * 2,
          height: TILE * 3 - 2,
          backgroundImage: "repeating-linear-gradient(90deg, #4a4350 0 6px, transparent 6px 22px)",
        }}
      >
        <div className="absolute inset-x-0 h-1 bg-[#b8bcc8]" style={{ top: TILE * 0.9 }} />
        <div className="absolute inset-x-0 h-1 bg-[#b8bcc8]" style={{ top: TILE * 2.1 }} />
        <div className="station-train absolute flex" style={{ top: 4, height: TILE * 2.6 }}>
          {[0, 1, 2, 3].map((c) => (
            <div key={c} className="relative mr-1 h-full w-[220px] rounded-md border-2 border-[#13203a] bg-[#eef0f4]">
              <div className="absolute inset-x-0 top-1 h-3 bg-[#c8322d]" />
              <div className="absolute inset-x-0 bottom-2 h-2 bg-[#2b5fd9]" />
              {[0, 1, 2, 3, 4].map((w) => (
                <div key={w} className="absolute top-6 h-9 w-8 rounded-sm bg-[#1f2633]" style={{ left: 12 + w * 41 }} />
              ))}
              <div className="absolute top-5 left-[96px] h-[52px] w-6 border-x-2 border-[#13203a]/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Riding the Underground: inside the carriage while the tunnel rushes past, then the next station. */
export function TrainJourney({ to, onArrive }: { to: string; onArrive: () => void }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => setStage(1), 1600);
    const b = setTimeout(onArrive, 3600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [onArrive]);
  return (
    <div className="absolute inset-0 z-[100002] overflow-hidden bg-[#1a1822]" role="status" aria-live="polite">
      {/* Windows onto the tunnel. */}
      <div className="absolute inset-x-0 top-[12%] flex h-[34%] justify-around px-[6%]">
        {[0, 1, 2].map((w) => (
          <div key={w} className="relative w-[26%] overflow-hidden rounded-2xl border-[6px] border-[#cfd3dc] bg-[#0c0b10]">
            <div className={cn("tunnel-lights absolute inset-0", stage === 1 && "tunnel-slow")} />
          </div>
        ))}
      </div>
      {/* Carriage: seats, poles, floor. */}
      <div className="absolute inset-x-0 top-[50%] bottom-0 bg-[#e9e4d8]" />
      <div className="absolute inset-x-[4%] top-[50%] h-[16%] rounded-t-xl bg-[#2b5fd9] [background-image:repeating-linear-gradient(45deg,rgba(255,209,102,.35)_0_6px,transparent_6px_14px)]" />
      {[22, 50, 78].map((l) => (
        <div key={l} className="absolute top-0 bottom-[8%] w-2 rounded bg-[#ffd166]" style={{ left: `${l}%` }} />
      ))}
      <div className="absolute top-[3%] left-1/2 w-[min(90%,520px)] -translate-x-1/2 rounded-lg bg-black px-4 py-2 text-center font-mono text-sm font-black tracking-wide text-[#ffb020]">
        {stage === 0 ? `This train is for ${to}` : `Next station: ${to}. Please mind the gap.`}
      </div>
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-black text-[#13203a]">
        {stage === 0 ? "Departing..." : "Arriving..."}
      </div>
    </div>
  );
}
