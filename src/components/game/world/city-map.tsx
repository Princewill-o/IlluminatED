"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ArrowUp, Map as MapIcon, X } from "lucide-react";

import { PLAYER } from "./art";

import { CITY, TILE, type Portal, type WorldMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

/**
 * London map: a minimap that follows you, and a full map with every station,
 * bus stop, bike dock, job and venue. Pick a place (or a task) to set a
 * waypoint; an arrow and distance then guide you there.
 */
const COLOUR: Record<string, string> = {
  w: "#5aa9e6",
  g: "#9fd37a",
  f: "#9fd37a",
  T: "#6fb15a",
  "=": "#55596a",
  ":": "#55596a",
  "-": "#e9e2d2",
  _: "#e2d3a8",
  "|": "#c9c2b2",
  L: "#e9e2d2",
};

export type PlaceKind = "university" | "station" | "bus" | "bike" | "job" | "games" | "home" | "view" | "food" | "dealer" | "hospital" | "court" | "study";
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  x: number;
  y: number;
}

const KIND: Record<PlaceKind, { label: string; colour: string }> = {
  university:{label:"Universities",colour:"#7153b9"},
  station: { label: "Underground", colour: "#2b5fd9" },
  bus: { label: "Bus stops", colour: "#d4241f" },
  bike: { label: "Bike docks", colour: "#6cc04a" },
  job: { label: "Jobs", colour: "#e0a100" },
  games: { label: "Games Hall", colour: "#7a5ce6" },
  home: { label: "Home", colour: "#13203a" },
  view: { label: "Viewpoints", colour: "#15987f" },
  food: { label: "Food", colour: "#e98a1f" },
  dealer: { label: "Car dealership", colour: "#d72a22" },
  hospital: { label: "Hospital and pharmacy", colour: "#15987f" },
  study: { label: "Study spaces", colour: "#1f4fbf" },
  court: { label: "Crown Court", colour: "#7a4f32" },
};

function kindOf(p: Portal): PlaceKind | null {
  const t = p.to;
  if ((t.kind === "map" && t.mapId.startsWith("station-")) || t.kind === "tube") return "station";
  if (t.kind === "act" && t.activity === "hike") return "view";
  if (t.kind === "act" && t.activity === "eat") return "food";
  if (t.kind === "map" && t.mapId === "home") return "home";
  if (t.kind === "university" || t.kind === "map" && (t.mapId==="universities" || t.mapId.startsWith("university-"))) return "university";
  if (t.kind === "bus") return "bus";
  if (t.kind === "bike") return "bike";
  if (t.kind === "work" || t.kind === "game") return "job";
  if (t.kind === "study-room" || t.kind === "awards" || t.kind === "map" && t.mapId === "study-lobby") return "study";
  if (t.kind === "games") return "games";
  if (t.kind === "act" && t.activity === "study" || t.kind === "link" && t.href === "/learn") return "study";
  if (t.kind === "dealer") return "dealer";
  if (t.kind === "shop") return t.shop === "bootz" ? "hospital" : "food";
  if (t.kind === "map" && t.mapId === "hospital") return "hospital";
  if (t.kind === "map" && t.mapId === "court") return "court";
  return null;
}

export const placesFor = (map: WorldMap): Place[] => map.portals.flatMap((p) => {
  const kind = kindOf(p);
  if (!kind) return [];
  const name = p.label.replace(/^Bus stop: /, "").replace(/: .*$/, "");
  return [{ id: p.id, name: kind === "bus" ? `Bus stop, ${name}` : name, kind, x: p.rect.x + p.rect.w / 2, y: p.rect.y + p.rect.h / 2 }];
});
export const PLACES = placesFor(CITY);

/** Where a task sends you: the nearest matching place. */
export function placeForTask(tag: string, title: string): PlaceKind | null {
  const t = `${tag} ${title}`.toLowerCase();
  if (t.includes("bus")) return "bus";
  if (t.includes("study") || t.includes("learn")) return "study";
  if (t.includes("job") || t.includes("shift")) return "job";
  if (t.includes("arcade") || t.includes("game")) return "games";
  if (t.includes("homework")) return "home";
  return null;
}

export const nearest = (kind: PlaceKind, places: Place[] = PLACES) =>
  places.filter((p) => p.kind === kind).sort((a, b) => Math.hypot(a.x - PLAYER.x, a.y - PLAYER.y) - Math.hypot(b.x - PLAYER.x, b.y - PLAYER.y))[0] ?? null;

function useCityCanvas(map: WorldMap, scale: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    c.width = map.cols * scale;
    c.height = map.rows * scale;
    ctx.fillStyle = "#d9cfbd";
    ctx.fillRect(0, 0, c.width, c.height);
    map.tiles.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        ctx.fillStyle = COLOUR[ch] ?? (map.id === "highlands" ? (ch === "k" ? "#9a98a2" : "#a98f6f") : "#c7b9a3");
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }),
    );
  }, [map, scale]);
  return ref;
}

/** Full-screen map: legend, places, and setting a waypoint. */
export function CityMap({ map, waypoint, onPick, onClose, searchArea }: { searchArea?: { origin: { x: number; y: number }; radius: number } | null; map: WorldMap; waypoint: Place | null; onPick: (p: Place | null) => void; onClose: () => void }) {
  const S = map.cols > 100 ? 6 : 8;
  const canvas = useCityCanvas(map, S);
  const places = useMemo(() => placesFor(map), [map]);
  const kinds = (Object.keys(KIND) as PlaceKind[]).filter((k) => places.some((p) => p.kind === k));
  const [show, setShow] = useState<Set<PlaceKind>>(new Set(Object.keys(KIND) as PlaceKind[]));
  const me = { x: (PLAYER.x / TILE) * S, y: (PLAYER.y / TILE) * S };
  const mapViewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = mapViewport.current;
    if (viewport) {
      viewport.scrollLeft = (PLAYER.x / TILE) * S - viewport.clientWidth / 2;
      viewport.scrollTop = (PLAYER.y / TILE) * S - viewport.clientHeight / 2;
    }
  }, [map, S]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-[100003] grid place-items-center bg-[#13203a]/80 p-2 sm:p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Map of ${map.name}`} onClick={(e) => e.stopPropagation()} className="map-open flex h-full max-h-[760px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#f7f1e6] text-[#13203a] md:flex-row">
        <div ref={mapViewport} className="relative min-h-[160px] flex-1 overflow-auto overscroll-contain bg-[#d9cfbd]">
          <div className="relative" style={{ width: map.cols * S, height: map.rows * S }}>
            {searchArea && <span aria-label="Police search area" className="pointer-events-none absolute z-10 rounded-full border-2 border-[#e04a3f] bg-[#e04a3f]/20" style={{left:(searchArea.origin.x-searchArea.radius)/TILE*S,top:(searchArea.origin.y-searchArea.radius)/TILE*S,width:searchArea.radius*2/TILE*S,height:searchArea.radius*2/TILE*S}}/>}
            <canvas ref={canvas} className="absolute inset-0" style={{ imageRendering: "pixelated" }} aria-hidden />
            {places.filter((p) => show.has(p.kind)).map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.name}
                aria-label={`Set waypoint: ${p.name}`}
                onClick={() => onPick(p)}
                className={cn("absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition hover:scale-150", waypoint?.id === p.id && "scale-150 ring-2 ring-[#13203a]")}
                style={{ left: (p.x / TILE) * S, top: (p.y / TILE) * S, background: KIND[p.kind].colour }}
              />
            ))}
            <span className="map-me absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#f2a03a]" style={{ left: me.x, top: me.y }} />
          </div>
        </div>
        <div className="max-h-[52%] w-full shrink-0 overflow-y-auto overscroll-contain p-3 sm:p-4 md:max-h-full md:w-64">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">{map.name}</h2>
            <button type="button" onClick={onClose} aria-label="Close the map" className="grid size-11 shrink-0 place-items-center rounded-full bg-white">
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-[#13203a]/70">Tap a dot to set a waypoint. The orange dot is you.</p>
          <ul className="mt-3 space-y-1.5">
            {kinds.map((k) => (
              <li key={k}>
                <div className="flex items-center gap-1 rounded-xl bg-white px-2 text-sm font-bold">
                  <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
                    <input type="checkbox" checked={show.has(k)} onChange={() => setShow((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })} className="size-4" />
                    <span className="size-3 rounded-full" style={{ background: KIND[k].colour }} />
                    <span className="flex-1">{KIND[k].label}</span>
                  </label>
                  <button type="button" aria-label={`Find nearest ${KIND[k].label.toLowerCase()}`} className="min-h-11 shrink-0 px-1.5 text-xs text-[#2b5fd9] underline" onClick={() => { onPick(nearest(k, places)); onClose(); }}>
                    Nearest
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {waypoint && (
            <div className="mt-3 rounded-xl bg-[#13203a] p-3 text-sm text-white">
              <p className="font-black">Heading to {waypoint.name}</p>
              <button type="button" onClick={() => onPick(null)} className="mt-1 min-h-11 text-sm underline">Clear waypoint</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small map that follows you, with an arrow and distance to your waypoint. */
export function MiniMap({ map, waypoint, onOpen, onArrive, searchArea }: { searchArea?: { origin: { x: number; y: number }; radius: number } | null; map: WorldMap; waypoint: Place | null; onOpen: () => void; onArrive: () => void }) {
  const S = 4;
  const canvas = useCityCanvas(map, S);
  const wrap = useRef<HTMLSpanElement>(null);
  const viewport = useRef<HTMLSpanElement>(null);
  const arrow = useRef<HTMLDivElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  const pin = useRef<HTMLSpanElement>(null);
  const places = useMemo(() => placesFor(map).filter((p) => p.kind === "station" || p.kind === "games" || p.kind === "view"), [map]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const mx = (PLAYER.x / TILE) * S;
      const my = (PLAYER.y / TILE) * S;
      if (wrap.current && viewport.current) wrap.current.style.transform = `translate(${viewport.current.clientWidth / 2 - mx}px, ${viewport.current.clientHeight / 2 - my}px)`;
      if (waypoint) {
        const dx = waypoint.x - PLAYER.x;
        const dy = waypoint.y - PLAYER.y;
        if (arrow.current) arrow.current.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`;
        // Rough metres: a tile is about 8 m of London.
        if (Math.hypot(dx, dy) < TILE * 1.6) onArrive();
        if (dist.current) dist.current.textContent = `${Math.round((Math.hypot(dx, dy) / TILE) * 8)} m`;
        if (pin.current) {
          pin.current.style.left = `${(waypoint.x / TILE) * S}px`;
          pin.current.style.top = `${(waypoint.y / TILE) * S}px`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [waypoint, onArrive]);
  return (
    <button type="button" onClick={onOpen} aria-label="Open the map" className="absolute top-[72px] right-3 z-[100001] block text-left">
      <span ref={viewport} className="relative block size-20 overflow-hidden rounded-full border-4 border-[#f6f2e8] bg-[#d9cfbd] shadow-xl sm:size-[104px] xl:size-28">
        <span ref={wrap} className="absolute top-0 left-0 block" style={{ width: map.cols * S, height: map.rows * S }}>
          {searchArea && <span aria-label="Police search area" className="pointer-events-none absolute z-10 rounded-full border-2 border-[#e04a3f] bg-[#e04a3f]/20" style={{left:(searchArea.origin.x-searchArea.radius)/TILE*S,top:(searchArea.origin.y-searchArea.radius)/TILE*S,width:searchArea.radius*2/TILE*S,height:searchArea.radius*2/TILE*S}}/>}
            <canvas ref={canvas} className="absolute inset-0" aria-hidden />
          {places.map((p) => (
            <span key={p.id} className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" style={{ left: (p.x / TILE) * S, top: (p.y / TILE) * S, background: KIND[p.kind].colour }} />
          ))}
          {waypoint && <span ref={pin} className="map-me absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#d4241f]" />}
        </span>
        <span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#f2a03a]" />
        <span className="absolute right-1 bottom-1 grid size-7 place-items-center rounded-full bg-[#13203a] text-white">
          <MapIcon className="size-4" aria-hidden />
        </span>
      </span>
      {waypoint && (
        <span className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-[#13203a] px-2 py-1 text-xs font-black text-white">
          <span ref={arrow} className="inline-block">
            <ArrowUp className="size-3.5" aria-hidden />
          </span>
          <span className="hidden max-w-24 truncate sm:inline">{waypoint.name}</span>
          <span ref={dist} className="text-[#f2d9a6]" />
        </span>
      )}
    </button>
  );
}
