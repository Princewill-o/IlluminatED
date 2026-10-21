"use client";

import { useEffect, useState, useTransition } from "react";

import { Bike, X } from "lucide-react";

import { TubeBadge } from "./tube-map";

import { buyCar, hireBike } from "@/app/games/world/actions";
import { BIKES, type BikeBrand } from "@/game/core/bikes";
import { CARS } from "@/game/core/cars";
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
      <div role="dialog" aria-modal="true" aria-label="Bike dock" onClick={(e) => e.stopPropagation()} className="max-h-[calc(100%-16px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-[#f7f1e6] p-4 text-[#13203a] sm:p-5 md:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-[#2b5fd9] uppercase">Bike dock</p>
            <h2 className="mt-1 text-2xl font-black">Hire a bike</h2>
            <p className="text-sm text-[#13203a]/70">Walking is slow. Bikes get you across London fast. You have {clout} Clout.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="jelly grid size-11 shrink-0 place-items-center rounded-full bg-white">
            <X className="size-4" />
          </button>
        </div>
        {riding ? (
          <button type="button" onClick={onDock} className="jelly mt-4 w-full rounded-full bg-[#13203a] py-3 font-black text-white">
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
                      if (r.ok) onRide(b, r.clout ?? clout);
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

/** A tube train in the new deep-level style: red cab ends, white and blue cars, red doors. */
function TubeTrain({ cars = 4, tall }: { cars?: number; tall: number }) {
  return (
    <div className="flex items-end" style={{ height: tall }}>
      {Array.from({ length: cars }, (_, c) => {
        const end = c === cars - 1;
        return (
          <div key={c} className="relative mr-[3px] h-full overflow-hidden border-2 border-[#13203a] bg-[#eef0f4]" style={{ width: 230, borderRadius: end ? "8px 40px 14px 8px" : 8 }}>
            {/* blue lower band and pin stripe */}
            <div className="absolute inset-x-0 bottom-[14%] h-[22%] bg-[#1f3fa8]" />
            <div className="absolute inset-x-0 bottom-[38%] h-[3%] bg-[#1f3fa8]" />
            {/* windows */}
            {[0, 1, 2].map((w) => (
              <div key={w} className="absolute top-[22%] h-[28%] w-[34px] rounded-[4px] border-2 border-[#13203a] bg-[#2a3346]" style={{ left: 18 + w * 42 }}>
                <div className="absolute top-1 left-1 h-1 w-3 rounded-full bg-white/40" />
              </div>
            ))}
            {/* red double doors with a green light */}
            <div className="absolute top-[10%] bottom-[14%] left-[146px] w-[44px] border-x-2 border-[#13203a] bg-[#d72a22]">
              <div className="absolute inset-y-[12%] left-1/2 w-[2px] -translate-x-1/2 bg-[#13203a]" />
              <div className="absolute top-[18%] left-[6px] h-[30%] w-[12px] rounded-sm bg-[#2a3346]" />
              <div className="absolute top-[18%] right-[6px] h-[30%] w-[12px] rounded-sm bg-[#2a3346]" />
            </div>
            <div className="absolute top-[4%] left-[160px] h-[5%] w-[16px] rounded-full bg-[#6cf08a]" />
            {/* red cab end with the lit outline round the windscreen */}
            {end && (
              <div className="absolute inset-y-0 right-0 w-[70px] bg-[#d72a22]">
                <div className="absolute top-[12%] right-[10px] bottom-[26%] left-[8px] border-[3px] border-white/90 bg-[#1c2430] [clip-path:polygon(18%_0,82%_0,100%_18%,100%_82%,82%_100%,18%_100%,0_82%,0_18%)]" />
                <div className="absolute right-[18px] bottom-[10%] h-[8%] w-[28px] rounded-sm bg-[#13203a]" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-[14%] bg-[#2a2733]" />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Inside a station, drawn over the whole room: a white-tiled arched tunnel with
 * steel beams, an LED departures board, ticket machines, gate line, benches,
 * the platform edge and a train that pulls in, waits and leaves.
 */
export function StationArt({ map }: { map: WorldMap }) {
  const T = TILE;
  const W = map.width;
  const trackY = (STATION_PLATFORM_Y + 3) * T;
  const name = map.name.replace(/ station$/, "");
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute top-0 left-0 overflow-hidden bg-[#e9e6df]" style={{ width: W, height: map.height }}>
      {/* Ticket hall floor */}
      <div className="absolute inset-x-0 top-0 [background:repeating-linear-gradient(90deg,transparent_0_31px,rgba(19,32,58,.06)_31px_32px),repeating-linear-gradient(0deg,#efece6_0_31px,rgba(19,32,58,.06)_31px_32px)]" style={{ height: 7 * T }} />
      {/* Back wall: cream tiles with a blue frieze */}
      <div className="absolute inset-x-0 top-0 bg-[#f6f2e8] [background-image:repeating-linear-gradient(90deg,transparent_0_15px,rgba(19,32,58,.08)_15px_16px),repeating-linear-gradient(0deg,transparent_0_9px,rgba(19,32,58,.08)_9px_10px)]" style={{ height: T * 1.15 }} />
      <div className="absolute inset-x-0 bg-[#2b5fd9]" style={{ top: T * 1.1, height: 6 }} />
      {/* Name board */}
      <div className="absolute flex items-center gap-2 rounded-md border-[3px] border-[#13203a] bg-white px-3 py-0.5" style={{ left: W / 2 - 110, top: 4, width: 220 }}>
        <TubeBadge size={20} />
        <span className="truncate text-sm font-black text-[#13203a]">{name}</span>
      </div>
      {/* Ticket machines and help points */}
      {[2, 25].map((x) => (
        <div key={x} className="absolute flex gap-1" style={{ left: x * T + 2, top: 1.4 * T }}>
          {[0, 1, 2].map((k) => (
            <div key={k} className="relative h-[52px] w-[28px] rounded-t-md border-2 border-[#13203a] bg-[#2b5fd9]">
              <div className="absolute inset-x-1 top-1.5 h-4 rounded-sm bg-[#bfe3ff]" />
              <div className="absolute inset-x-2 top-7 h-1.5 rounded-full bg-[#ffd166]" />
            </div>
          ))}
        </div>
      ))}
      {/* Gate line: steel barriers with green arrows */}
      <div className="absolute inset-x-0" style={{ top: 7 * T - 6, height: T + 6 }}>
        {Array.from({ length: map.cols - 2 }, (_, i) => {
          const x = i + 1;
          const gate = x >= 12 && x < 18;
          return (
            <div key={x} className="absolute" style={{ left: x * T, top: 0, width: T, height: T + 6 }}>
              {gate ? (
                <>
                  <div className="absolute top-1 left-0 h-[30px] w-[7px] rounded-sm border border-[#13203a] bg-[#c9ced8]" />
                  <div className="absolute top-2 left-2 h-[10px] w-[9px] rounded-sm bg-[#d72a22]" />
                  <div className="absolute top-3 right-2 text-[10px] font-black text-[#15987f]">&#9650;</div>
                </>
              ) : (
                <div className="absolute inset-x-0 top-3 h-[22px] border-y-2 border-[#13203a] bg-[#c9ced8]" />
              )}
            </div>
          );
        })}
      </div>
      {/* Platform: arched tiled tunnel */}
      <div className="absolute inset-x-0 overflow-hidden" style={{ top: 8 * T, height: map.height - 8 * T }}>
        <div className="absolute inset-0 bg-[#f4f4f6] [background-image:repeating-linear-gradient(90deg,transparent_0_47px,rgba(19,32,58,.07)_47px_48px),repeating-linear-gradient(0deg,transparent_0_23px,rgba(19,32,58,.07)_23px_24px)]" />
        {/* steel arches overhead */}
        {Array.from({ length: Math.ceil(W / (T * 6)) }, (_, k) => (
          <div key={k} className="absolute top-0 h-4 w-[6px] bg-[#4a4fb8]" style={{ left: k * T * 6 + T * 2 }} />
        ))}
        <div className="absolute inset-x-0 top-0 h-3 bg-[#4a4fb8] [background-image:repeating-linear-gradient(90deg,transparent_0_10px,rgba(255,255,255,.25)_10px_12px)]" />
        {/* LED departures board */}
        <div className="absolute rounded-md border-[3px] border-[#13203a] bg-[#141418] px-3 py-1 font-mono text-[11px] leading-tight font-black text-[#ffd400] shadow-lg" style={{ left: W / 2 - 120, top: 18, width: 240 }}>
          <div className="flex justify-between">
            <span>1 Westbound</span>
            <span>1 min</span>
          </div>
          <div className="flex justify-between">
            <span>2 Eastbound</span>
            <span>3 mins</span>
          </div>
          <div className="text-center">{clock}</div>
        </div>
        {/* Benches and posters */}
        {[4, 22].map((x) => (
          <div key={x} className="absolute flex gap-[2px]" style={{ left: x * T, top: 2 * T + 4 }}>
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="h-[24px] w-[30px] rounded-t-md border-2 border-[#13203a] bg-[#4a4fb8]" />
            ))}
          </div>
        ))}
        {[9, 19].map((x) => (
          <div key={x} className="absolute h-[44px] w-[64px] rounded-sm border-2 border-[#13203a] bg-[#f2d9a6] p-1 text-[7px] leading-tight font-black text-[#13203a]" style={{ left: x * T, top: 1 * T }}>
            REVISE ON THE MOVE · IlluminatED
          </div>
        ))}
      </div>
      {/* Platform edge: yellow line and tactile strip */}
      <div className="absolute inset-x-0 bg-[#d9d6cf]" style={{ top: trackY - 18, height: 18 }} />
      <div className="absolute inset-x-0 bg-[#ffd400]" style={{ top: trackY - 12, height: 5 }} />
      <div className="absolute inset-x-0 [background:radial-gradient(circle,#c9a800_1.5px,transparent_2px)_0_0/8px_8px] bg-[#ffd400]/60" style={{ top: trackY - 6, height: 6 }} />
      {/* Track */}
      <div className="absolute inset-x-0 overflow-hidden bg-[#2a2733] [background-image:repeating-linear-gradient(90deg,#3d3846_0_8px,transparent_8px_26px)]" style={{ top: trackY, height: map.height - trackY }}>
        <div className="absolute inset-x-0 h-1 bg-[#b8bcc8]" style={{ top: T * 0.9 }} />
        <div className="absolute inset-x-0 h-1 bg-[#b8bcc8]" style={{ top: T * 2.1 }} />
      </div>
      <div className="station-train absolute" style={{ top: trackY - T * 1.9, left: 0 }}>
        <TubeTrain tall={T * 3.6} />
      </div>
    </div>
  );
}

/** Riding the Underground: inside the carriage while the tunnel rushes past, then the next station. */
export function TrainJourney({ to, onArrive }: { to: string; onArrive: () => void }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => setStage(1), 800);
    const b = setTimeout(onArrive, 1600);
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
      {/* Passengers on the seats, swaying with the train. */}
      <div className="carriage-sway absolute inset-x-[6%] top-[38%] flex h-[20%] items-end justify-around">
        {Array.from({ length: 7 }, (_, k) => (
          <div key={k} className="flex flex-col items-center" style={{ opacity: k === 3 ? 0 : 1 }}>
            <span className="size-7 rounded-full border-2 border-[#13203a]" style={{ background: ["#f1c7a2", "#8d5a3b", "#c58c62", "#5a3a28", "#e8b48c", "#a46a45", "#f3d2b3"][k] }} />
            <span className="mt-0.5 h-10 w-12 rounded-t-2xl border-2 border-[#13203a]" style={{ background: ["#2b5fd9", "#d4536a", "#15987f", "#e98a1f", "#7a5ce6", "#13203a", "#6cc04a"][k] }} />
          </div>
        ))}
      </div>
      {/* Line diagram: where you are on the journey. */}
      <div className="absolute inset-x-[10%] bottom-[22%] h-2 rounded-full bg-[#13203a]/20">
        <div className={cn("h-full rounded-full bg-[#c8322d] transition-[width] duration-[1800ms] ease-in-out", stage === 0 ? "w-[30%]" : "w-full")} />
        <span className="absolute -top-1.5 left-0 size-5 rounded-full border-4 border-[#13203a] bg-white" />
        <span className="absolute -top-1.5 right-0 size-5 rounded-full border-4 border-[#13203a] bg-white" />
      </div>
      <div className="absolute top-[3%] left-1/2 w-[min(90%,520px)] -translate-x-1/2 rounded-lg bg-black px-4 py-2 text-center font-mono text-sm font-black tracking-wide text-[#ffb020]">
        {stage === 0 ? `This train is for ${to}` : `Next station: ${to}. Please mind the gap.`}
      </div>
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-black text-[#13203a]">
        {stage === 0 ? "Departing..." : "Arriving..."}
      </div>
    </div>
  );
}

/** Side-on London street scene with our double-decker driving through it (parallax layers). */
export function BusJourneyScene({ route, to, className = "h-40" }: { route: string; to: string; className?: string }) {
  const far = ["#b9c6dd", "#a9b8d3"];
  return (
    <div aria-hidden className={cn("relative overflow-hidden bg-gradient-to-b from-[#9fd2ef] to-[#d8eef8]", className)}>
      {/* Far skyline: landmarks */}
      <div className="journey-far absolute inset-x-0 bottom-10 flex h-24 w-[200%] items-end gap-10 pl-6">
        {[0, 1].map((k) => (
          <div key={k} className="flex w-1/2 items-end gap-10">
            <span className="block h-20 w-5 rounded-t-sm" style={{ background: far[0] }} />
            <span className="block h-14 w-16 rounded-t-[40px]" style={{ background: far[1] }} />
            <span className="block h-24 w-6 [clip-path:polygon(50%_0,100%_100%,0_100%)]" style={{ background: far[0] }} />
            <span className="block size-16 rounded-full border-[5px]" style={{ borderColor: far[1] }} />
            <span className="block h-12 w-24" style={{ background: far[0] }} />
            <span className="block h-[72px] w-8 rounded-t-full" style={{ background: far[1] }} />
          </div>
        ))}
      </div>
      {/* Mid: terraces and shops */}
      <div className="journey-mid absolute inset-x-0 bottom-8 flex h-16 w-[200%] items-end">
        {Array.from({ length: 24 }, (_, k) => (
          <span key={k} className="relative block shrink-0" style={{ width: 60 + ((k * 13) % 30), height: 34 + ((k * 17) % 30), background: ["#e3a66a", "#c76b4f", "#f2d9a6", "#a7b8c8"][k % 4] }}>
            <span className="absolute top-2 left-2 h-2 w-3 bg-[#13203a]/40" />
            <span className="absolute top-2 right-2 h-2 w-3 bg-[#13203a]/40" />
          </span>
        ))}
      </div>
      {/* Road and lamp posts */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-[#55596a]" />
      <div className="journey-near absolute inset-x-0 bottom-3 h-1 w-[200%] [background:repeating-linear-gradient(90deg,#f6f2e8_0_26px,transparent_26px_64px)]" />
      <div className="journey-lamps absolute inset-x-0 bottom-8 flex h-24 w-[200%] items-end justify-around">
        {Array.from({ length: 8 }, (_, k) => (
          <span key={k} className="relative block h-20 w-1.5 bg-[#2a2733]">
            <span className="absolute -top-1 -left-1.5 block size-3.5 rounded-full bg-[#ffd166]" />
          </span>
        ))}
      </div>
      {/* The bus */}
      <div className="journey-bus absolute bottom-2 left-1/2 h-[96px] w-[172px] -translate-x-1/2">
        <div className="absolute inset-x-0 top-0 bottom-3 rounded-t-[14px] rounded-b-md border-2 border-[#15151c] bg-[#d4241f]">
          <div className="absolute inset-x-2 top-2.5 h-6 rounded-sm bg-[#1f2633]">
            {[10, 40, 70, 100, 130].map((x, k) => (
              <span key={x} className="absolute bottom-0 size-3 rounded-t-full" style={{ left: x, background: ["#f1c7a2", "#8d5a3b", "#c58c62", "#5a3a28", "#e8b48c"][k] }} />
            ))}
          </div>
          <div className="absolute inset-x-2 top-11 right-10 h-6 rounded-sm bg-[#1f2633]" />
          <div className="absolute top-11 right-2 h-11 w-6 rounded-sm bg-[#1f2633]" />
          <div className="absolute top-0.5 right-1 rounded-sm bg-[#15151c] px-1 font-mono text-[9px] leading-tight font-black text-[#ffb020]">{route}</div>
        </div>
        <span className="journey-wheel absolute bottom-0 left-6 size-7 rounded-full border-[5px] border-[#15151c] bg-[#8b8f9c]" />
        <span className="journey-wheel absolute right-7 bottom-0 size-7 rounded-full border-[5px] border-[#15151c] bg-[#8b8f9c]" />
      </div>
      <div className="absolute top-2 left-2 rounded-md bg-[#15151c] px-2 py-0.5 font-mono text-xs font-black text-[#ffb020]">
        {route} to {to}
      </div>
    </div>
  );
}

/** Riding without revising: a few seconds of the journey, then you're there. */
export function BusRide({ route, to, onArrive }: { route: string; to: string; onArrive: () => void }) {
  useEffect(() => {
    const t = setTimeout(onArrive, 1600);
    return () => clearTimeout(t);
  }, [onArrive]);
  return (
    <div className="absolute inset-0 z-[100002] grid place-items-center bg-[#13203a]/85 p-4" role="status" aria-live="polite">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-[#f7f1e6]">
        <BusJourneyScene route={route} to={to} className="h-56" />
        <p className="p-4 text-center font-black text-[#13203a]">Next stop: {to}</p>
      </div>
    </div>
  );
}

/** Motor Mile: buy a car with Clout, or take one from your garage for a drive. */
export function Dealership({
  clout,
  owned,
  driving,
  onBought,
  onDrive,
  onClose,
}: {
  clout: number;
  owned: string[];
  driving: string | null;
  onBought: (car: string, clout: number) => void;
  onDrive: (car: string | null) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="absolute inset-0 z-[100000] grid place-items-center bg-black/60 p-2 sm:p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Car dealership" onClick={(e) => e.stopPropagation()} className="max-h-full w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl bg-[#f7f1e6] text-[#13203a]">
        <div className="relative overflow-hidden bg-[#13203a] px-4 pt-4 pb-4 text-white">
          <div className="absolute inset-x-0 bottom-0 h-3 [background:repeating-linear-gradient(90deg,#ffd166_0_30px,transparent_30px_60px)] opacity-60" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.25em] text-[#f2d9a6] uppercase">Motor Mile</p>
              <h2 className="mt-1 text-2xl font-black">Car dealership</h2>
              <p className="text-sm text-white/75">Buy once, keep it forever. Cars are much faster than walking. You have {clout} Clout.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="jelly grid size-11 shrink-0 place-items-center rounded-full bg-white/15">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <details className="mx-4 mt-3 rounded-xl bg-[#e8eef8] px-3 text-[#13203a]">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">Driving controls and road rules</summary>
          <div className="space-y-2 pb-3 text-xs leading-5">
            <p><strong>Keyboard:</strong> W / ↑ accelerate · S / ↓ brake, then reverse · A D / ← → steer · Space brake.</p>
            <p><strong>Touch:</strong> push the driving joystick up to accelerate, down to brake or reverse, and sideways to steer. Use Park to get out.</p>
            <p><strong>Keep left.</strong> Brake before the stop line on amber; wait on red. Give way to people at zebra crossings and leave room for other cars.</p>
            <p>Collisions and road violations add wanted stars, and the game’s police may respond.</p>
          </div>
        </details>
        <ul className="grid gap-3 p-4 sm:grid-cols-2">
          {CARS.map((c) => {
            const mine = owned.includes(c.id);
            const on = driving === c.id;
            return (
              <li key={c.id} className="flex flex-col rounded-2xl border-2 border-white bg-white p-3 shadow-[0_4px_0_rgba(19,32,58,0.08)]">
                <div className="grid h-20 place-items-center rounded-xl bg-[#e8eef8] [background-image:linear-gradient(transparent_70%,#d0d8e6_70%)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/world/movers/${c.id}-E.webp`} alt="" className="dealer-car h-16 object-contain" />
                </div>
                <p className="mt-3 font-black">{c.name}</p>
                <p className="text-xs text-[#13203a]/70">{c.blurb}</p>
                <p className="mt-1 text-xs font-bold">{c.speed}x walking speed</p>
                <div className="mt-3 flex items-center gap-2">
                  {mine ? (
                    <button type="button" onClick={() => onDrive(on ? null : c.id)} className={`min-h-11 flex-1 rounded-full px-3 py-2.5 text-sm font-black ${on ? "bg-[#13203a] text-white" : "bg-[#2b5fd9] text-white"}`}>
                      {on ? "Park it" : "Drive"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending || clout < c.price}
                      onClick={() =>
                        start(async () => {
                          setError(null);
                          const r = await buyCar(c.id);
                          if (r.ok) onBought(c.id, r.clout ?? clout);
                          else setError(r.error);
                        })
                      }
                      className="jelly min-h-11 flex-1 rounded-full bg-[#f2d9a6] px-3 py-2.5 text-sm font-black disabled:opacity-50"
                    >
                      Buy for {c.price} Clout
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {error && <p className="px-5 pb-4 text-sm font-bold text-[#c8322d]">{error}</p>}
      </div>
    </div>
  );
}
