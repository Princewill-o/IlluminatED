"use client";

import { Home, Briefcase, Building2, Mountain, TrainFront, X } from "lucide-react";

import { LINES } from "@/game/core/london";
import type { OfficeOrg } from "@/game/core/world";

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

/** Our own schematic Underground map: 45-degree lines, ticks for stations, rings for interchanges. */
function TubeSchematic({ stations, here, onGo }: { stations: { id: string; name: string; lines: string[]; exit?: { x: number; y: number } }[]; here: string; onGo: (t: TubeTrip) => void }) {
  // Hand-placed like a real schematic: straight runs and 45-degree turns, not geography.
  const SPOT: Record<string, { x: number; y: number }> = {
    oxford: { x: 120, y: 60 },
    bank: { x: 380, y: 60 },
    westminster: { x: 120, y: 170 },
    waterloo: { x: 230, y: 240 },
    "london-bridge": { x: 380, y: 240 },
    "tower-hill": { x: 470, y: 150 },
    canary: { x: 470, y: 300 },
    brixton: { x: 300, y: 310 },
    "study-quarter": { x: 430, y: 370 },
    "riverside-campus": { x: 610, y: 60 },
    "conservatory": { x: 610, y: 240 },
    "orchard-commons": { x: 180, y: 410 },
  };
  const ORDER: Record<string, string[]> = {
    revision: ["study-quarter", "brixton", "waterloo", "westminster", "oxford", "bank"],
    careers: ["westminster", "waterloo", "london-bridge", "tower-hill", "canary", "study-quarter"],
    homeward: ["oxford", "waterloo", "london-bridge", "brixton"],
    city: ["orchard-commons", "london-bridge", "bank", "tower-hill", "riverside-campus", "conservatory"],
  };
  const pos = (s: (typeof stations)[number]) => SPOT[s.id] ?? { x: 30 + (s.exit?.x ?? 0) * 5, y: 30 + (s.exit?.y ?? 0) * 4 };
  const elbow = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.min(Math.abs(dx), Math.abs(dy));
    const mx = b.x - Math.sign(dx) * d;
    return `L ${mx} ${a.y} L ${b.x} ${b.y}` + (Math.abs(dy) > d ? "" : "");
  };
  const lineIds = Object.keys(LINES);
  return (
    <svg viewBox="0 0 660 450" className="mt-2 w-full rounded-2xl border-2 border-[#13203a]/10 bg-white" role="group" aria-label="Underground map">
      <path d="M 0 200 L 160 200 L 200 180 L 420 180 L 450 210 L 540 210" fill="none" stroke="#bfe3ff" strokeWidth="14" strokeLinejoin="round" />
      {lineIds.map((l, li) => {
        const on = (ORDER[l] ?? []).map((id) => stations.find((s) => s.id === id && s.lines.includes(l))).filter((s): s is (typeof stations)[number] => Boolean(s));
        if (on.length < 2) return null;
        const off = (li - 1.5) * 5;
        const pts = on.map((s) => {
          const p = pos(s);
          return { x: p.x, y: p.y + off };
        });
        const d = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p, i) => elbow(pts[i], p)).join(" ");
        return <path key={l} d={d} fill="none" stroke={LINES[l].colour} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {stations.map((s) => {
        const p = pos(s);
        const on = s.id === here;
        const inter = s.lines.length > 1;
        return (
          <g key={s.id} role="button" tabIndex={0} aria-label={on ? `${s.name}, you are here` : `Travel to ${s.name}`} className={on ? "" : "cursor-pointer"} onClick={() => !on && onGo({ kind: "station", id: s.id })} onKeyDown={(e) => e.key === "Enter" && !on && onGo({ kind: "station", id: s.id })}>
            {inter ? <circle cx={p.x} cy={p.y} r="9" fill={on ? "#f2d9a6" : "white"} stroke="#13203a" strokeWidth="3.5" /> : <rect x={p.x - 3} y={p.y - 10} width="6" height="10" fill={LINES[s.lines[0]]?.colour} />}
            <text x={p.x > 420 ? p.x - 13 : p.x + 13} y={p.y - 12} textAnchor={p.x > 420 ? "end" : "start"} fontSize="12" fontWeight="800" fill="#13203a" stroke="white" strokeWidth="3" paintOrder="stroke">
              {s.name}
            </text>
            {on && (
              <text x={p.x + 13} y={p.y + 4} fontSize="9" fontWeight="800" fill="#2b5fd9">
                YOU ARE HERE
              </text>
            )}
          </g>
        );
      })}
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
  stations: { id: string; name: string; lines: string[]; exit?: { x: number; y: number } }[];
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

        <p className="mt-4 text-xs font-black tracking-widest text-[#5a6272] uppercase">Tap a station to travel</p>
        <TubeSchematic stations={stations} here={here} onGo={onGo} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold">
          {Object.entries(LINES).map(([id, l]) => (
            <span key={id} className="flex items-center gap-1">
              <span className="h-1.5 w-5 rounded-full" style={{ background: l.colour }} /> {l.name}
            </span>
          ))}
        </div>

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
