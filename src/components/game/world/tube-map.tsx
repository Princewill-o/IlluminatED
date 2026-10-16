"use client";

import { Home, Briefcase, Building2, Mountain, TrainFront, X } from "lucide-react";

import { LINES } from "@/game/core/london";
import type { OfficeOrg } from "@/game/core/world";
import { cn } from "@/lib/utils";

export type TubeTrip =
  | { kind: "station"; id: string }
  | { kind: "map"; mapId: string; label: string };

/** Our own Underground badge: a hexagon with a bar (not the real roundel). */
export function TubeBadge({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <path d="M20 2 36 11v18L20 38 4 29V11Z" fill="#2b5fd9" stroke="#13203a" strokeWidth="2.5" />
      <rect x="1" y="16" width="38" height="8" rx="2" fill="#f2d9a6" stroke="#13203a" strokeWidth="2" />
    </svg>
  );
}

export function TubeMap({
  here,
  stations,
  offices,
  onGo,
  onClose,
}: {
  here: string;
  stations: { id: string; name: string; lines: string[] }[];
  offices: OfficeOrg[];
  onGo: (trip: TubeTrip) => void;
  onClose: () => void;
}) {
  const current = stations.find((s) => s.id === here);
  return (
    <div className="absolute inset-0 z-[100000] grid place-items-end bg-black/60 md:place-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Underground"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88%] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#f6f2e8] p-5 text-[#13203a] md:rounded-3xl"
      >
        <div className="flex items-center gap-3">
          <TubeBadge size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-[0.25em] text-[#1f4fbf] uppercase">Underground</p>
            <h2 className="truncate text-2xl font-black">{current ? current.name : here === "highlands" ? "Glen Lorne" : "Station"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-black/10">
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-4 text-xs font-black tracking-widest text-[#5a6272] uppercase">London stations</p>
        <ul className="relative mt-2 space-y-1.5 pl-5">
          <span aria-hidden className="absolute top-2 bottom-2 left-[9px] w-1.5 rounded-full bg-[#2b5fd9]" />
          {stations.map((s) => {
            const on = s.id === here;
            return (
              <li key={s.id} className="relative">
                <span aria-hidden className={cn("absolute top-1/2 -left-[15px] size-4 -translate-y-1/2 rounded-full border-[3px] border-[#13203a]", on ? "bg-[#f2d9a6]" : "bg-white")} />
                <button
                  type="button"
                  disabled={on}
                  onClick={() => onGo({ kind: "station", id: s.id })}
                  className="flex w-full items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-left font-bold shadow-[0_2px_0_0_rgba(27,22,34,0.15)] transition active:scale-[0.98] disabled:bg-[#f2d9a6]/40"
                >
                  <span className="flex-1">{s.name}</span>
                  <span className="flex gap-1">
                    {s.lines.map((l) => (
                      <span key={l} title={LINES[l]?.name} className="h-2.5 w-5 rounded-full" style={{ background: LINES[l]?.colour }} />
                    ))}
                  </span>
                  {on && <span className="text-xs font-black">You are here</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-xs font-black tracking-widest text-[#5a6272] uppercase">Further afield</p>
        <div className="mt-2 grid gap-1.5">
          {here !== "highlands" && (
            <button
              type="button"
              onClick={() => onGo({ kind: "map", mapId: "highlands", label: "The Highlands" })}
              className="flex items-center gap-3 rounded-2xl bg-[#15987f] px-3 py-3 text-left font-black text-white active:scale-[0.98]"
            >
              <Mountain className="size-5" aria-hidden /> The Highlands <span className="ml-auto text-xs font-bold">Sleeper to Glen Lorne</span>
            </button>
          )}
          <button type="button" onClick={() => onGo({ kind: "map", mapId: "home", label: "Your house" })} className="flex items-center gap-3 rounded-2xl bg-[#ffb26b] px-3 py-3 text-left font-black active:scale-[0.98]">
            <Home className="size-5" aria-hidden /> Your house <span className="ml-auto text-xs font-bold">Homeward line</span>
          </button>
          <button type="button" onClick={() => onGo({ kind: "map", mapId: "campus", label: "Careers Campus" })} className="flex items-center gap-3 rounded-2xl bg-[#5fd3a5] px-3 py-3 text-left font-black active:scale-[0.98]">
            <Briefcase className="size-5" aria-hidden /> Careers Campus <span className="ml-auto text-xs font-bold">Careers line</span>
          </button>
          {offices.map((o) => (
            <button
              key={o.slug}
              type="button"
              onClick={() => onGo({ kind: "map", mapId: `office-${o.slug}`, label: o.name })}
              className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-left font-bold active:scale-[0.98]"
            >
              <Building2 className="size-5" aria-hidden style={{ color: o.accent }} /> {o.name} office
            </button>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-[#5a6272]">
          <TrainFront className="size-4" aria-hidden /> Trains every minute. Please mind the gap.
        </p>
      </div>
    </div>
  );
}
