"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  BedDouble, Bike, Binoculars, BookOpen, Briefcase, Bus, Car, Cross, Gamepad2, Gavel, GraduationCap, House,
  Landmark, LocateFixed, MapPin, Minus, Navigation, Plus, Search, TrainFront, UtensilsCrossed, X, type LucideIcon,
} from "lucide-react";

import { PLAYER } from "./art";

import { CITY_CENTRE, FOUNTAIN } from "@/game/core/city-centre";
import { buildLondon } from "@/game/core/london";
import {
  KIND,
  MAP_AREAS,
  describeSpot,
  type SpotInfo,
  placesFor,
  walkingRoute,
  mapPinGroups,
  type Place,
  type PlaceKind,
} from "@/game/core/map-guide";
import { TILE, type WorldMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

/** Bright, illustrated map palette: green parks, blue water, white streets. */
const COLOURS: Record<string, string> = {
  w: "#7cc6ef",
  g: "#bfe3a2",
  f: "#b2dd92",
  T: "#bfe3a2",
  B: "#eef0ec",
  L: "#eef0ec",
  "=": "#ffffff",
  ":": "#ffffff",
  "-": "#eef0ec",
  _: "#f4ecd6",
  X: "#eef0ec",
  "#": "#d9d4cc",
  W: "#cfe3ea",
  "|": "#f2ede2",
};
const ROAD = new Set(["=", ":"]);
const GREEN = new Set(["g", "f", "T"]);

/** Category icons for the teardrop pins and the list. */
export const KIND_ICON: Record<PlaceKind, LucideIcon> = {
  hotel: BedDouble, landmark: Landmark, university: GraduationCap, station: TrainFront, bus: Bus, bike: Bike,
  job: Briefcase, games: Gamepad2, home: House, view: Binoculars, food: UtensilsCrossed, dealer: Car,
  hospital: Cross, study: BookOpen, court: Gavel,
};

/** Paints the illustrated base map onto a canvas at S pixels per tile. */
function paintMap(ctx: CanvasRenderingContext2D, map: WorldMap, S: number) {
  const W = map.cols, H = map.rows, t = map.tiles;
  ctx.fillStyle = "#e9ece6";
  ctx.fillRect(0, 0, W * S, H * S);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const tile = t[y][x];
      ctx.fillStyle = COLOURS[tile] ?? "#e3dfd6";
      ctx.fillRect(Math.floor(x * S), Math.floor(y * S), Math.ceil(S) + 1, Math.ceil(S) + 1);
    }
  // Soft outlines where roads meet the pavement, and darker river banks.
  ctx.lineWidth = Math.max(1, S * 0.14);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const tile = t[y][x];
      const edge = (nx: number, ny: number, kind: "road" | "water") => {
        const n = t[ny]?.[nx];
        if (n === undefined) return false;
        return kind === "road" ? !ROAD.has(n) && n !== "|" : n !== "w";
      };
      const kind = ROAD.has(tile) ? "road" : tile === "w" ? "water" : null;
      if (!kind) continue;
      ctx.strokeStyle = kind === "road" ? "#d6dae0" : "#5aaedc";
      ctx.beginPath();
      if (edge(x, y - 1, kind)) { ctx.moveTo(x * S, y * S); ctx.lineTo((x + 1) * S, y * S); }
      if (edge(x, y + 1, kind)) { ctx.moveTo(x * S, (y + 1) * S); ctx.lineTo((x + 1) * S, (y + 1) * S); }
      if (edge(x - 1, y, kind)) { ctx.moveTo(x * S, y * S); ctx.lineTo(x * S, (y + 1) * S); }
      if (edge(x + 1, y, kind)) { ctx.moveTo((x + 1) * S, y * S); ctx.lineTo((x + 1) * S, (y + 1) * S); }
      ctx.stroke();
    }
  // Road centre lines in a warm yellow, like a printed street map.
  ctx.fillStyle = "#ffd76a";
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (t[y][x] === ":") {
        const horizontal = t[y][x - 1] === ":" || t[y][x + 1] === ":";
        if (horizontal) ctx.fillRect(x * S, (y + 0.42) * S, S, Math.max(1, S * 0.16));
        else ctx.fillRect((x + 0.42) * S, y * S, Math.max(1, S * 0.16), S);
      }
  // Trees as rounded canopies.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (t[y][x] === "T" || (GREEN.has(t[y][x]) && (x * 7 + y * 13) % 23 === 0)) {
        ctx.fillStyle = t[y][x] === "T" ? "#7cc06a" : "#a3d68a";
        ctx.beginPath();
        ctx.arc((x + 0.5) * S, (y + 0.5) * S, S * (t[y][x] === "T" ? 0.62 : 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
  if (map.id !== "city") return;
  const L = buildLondon();
  // Buildings: white blocks with a soft drop shadow, landmarks in rose.
  for (const thing of L.things) {
    if (thing.kind !== "building" && thing.kind !== "landmark" && thing.kind !== "station") continue;
    if (thing.kind === "landmark" && thing.name === "fountain") continue;
    const x = (thing.x + 0.15) * S, y = (thing.y + 0.15) * S, w = (thing.w - 0.3) * S, h = (thing.h - 0.3) * S;
    ctx.fillStyle = "rgba(60,70,90,.16)";
    ctx.fillRect(x + S * 0.25, y + S * 0.3, w, h);
    ctx.fillStyle = thing.kind === "landmark" ? "#f6d3dc" : thing.kind === "station" ? "#d9e4fb" : thing.id.startsWith("hotel-") ? "#d7ece4" : "#ffffff";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = thing.kind === "landmark" ? "#dfa3b4" : "#d6d2ca";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
  // Fountain Square: a paved circle round the fountain.
  ctx.fillStyle = "#7cc6ef";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, S * 0.3);
  ctx.beginPath();
  ctx.arc((FOUNTAIN.x + FOUNTAIN.w / 2) * S, (FOUNTAIN.y + FOUNTAIN.h / 2) * S, FOUNTAIN.w * 0.48 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // River and area names.
  ctx.font = `italic 700 ${Math.max(12, S * 1.7)}px Georgia, serif`;
  ctx.fillStyle = "#2f7fb3";
  const point = L.river[Math.floor(L.river.length / 2)];
  ctx.save();
  ctx.translate(point[0] * S, point[1] * S);
  ctx.rotate(0.06);
  ctx.fillText("River Thames", 0, 0);
  ctx.restore();
  for (const area of MAP_AREAS) {
    const centre = area.name === "Fountain Square";
    const x = (area.x + area.w / 2) * S, y = centre ? (CITY_CENTRE.y + CITY_CENTRE.h - 1.4) * S : (area.y + area.h / 2) * S;
    ctx.save();
    ctx.font = `800 ${Math.max(10, S * (centre ? 1.5 : 1.25))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = area.name.toUpperCase();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.strokeText(label, x, y);
    ctx.fillStyle = centre ? "#b4234f" : "#3d5a4a";
    ctx.fillText(label, x, y);
    ctx.restore();
  }
}

export function LocationMap({
  map,
  waypoint,
  onPick,
  onClose,
  searchArea,
  intro,
}: {
  map: WorldMap;
  waypoint: Place | null;
  onPick: (place: Place | null) => void;
  onClose: () => void;
  searchArea?: { origin: { x: number; y: number }; radius: number } | null;
  /** Replaces the default instructions (e.g. when picking a bus destination). */
  intro?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const S = (map.cols > 100 ? 7 : 9) * zoom;
  const [query, setQuery] = useState("");
  /** The spot you tapped on the map, and what's there. */
  const [spot, setSpot] = useState<{ x: number; y: number; info: SpotInfo } | null>(null);
  const [area, setArea] = useState<string[] | null>(null);
  const [show, setShow] = useState<Set<PlaceKind>>(new Set((Object.keys(KIND) as PlaceKind[]).filter(k=>k!=="bike"&&k!=="bus")));
  const category = show.size === Object.keys(KIND).length ? "All" : [...show].every(k=>["bike","bus","station"].includes(k)) ? "Transport" : "Explore";
  const [position, setPosition] = useState({ x: PLAYER.x, y: PLAYER.y });
  const focus = useRef({ x: PLAYER.x, y: PLAYER.y });
  const canvas = useRef<HTMLCanvasElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null);
  const places = useMemo(() => placesFor(map), [map]);
  const filtered = places.filter(
    (p) =>
      (query.trim() || show.has(p.kind)) &&
      (!area || area.includes(p.id)) &&
      `${p.name} ${KIND[p.kind].label}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const kinds = (Object.keys(KIND) as PlaceKind[]).filter((k) =>
    places.some((p) => p.kind === k),
  );
  const pinGroups = mapPinGroups(waypoint && !filtered.some(p=>p.id===waypoint.id) ? [...filtered,waypoint] : filtered, S, waypoint?.id);
  const nearby = [...filtered].sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y));
  const tileX = Math.floor(position.x / TILE),
    tileY = Math.floor(position.y / TILE);
  const route = useMemo(
    () =>
      waypoint
        ? walkingRoute(
            map,
            { x: (tileX + 0.5) * TILE, y: (tileY + 0.5) * TILE },
            waypoint,
          )
        : [],
    [map, tileX, tileY, waypoint],
  );
  const centre = (x: number, y: number) => {
    focus.current = {x,y};
    if (viewport.current) {
      viewport.current.scrollLeft =
        (x / TILE) * S - viewport.current.clientWidth / 2;
      viewport.current.scrollTop =
        (y / TILE) * S - viewport.current.clientHeight / 2;
    }
  };
  const pick = (place: Place) => {
    onPick(place);
    setSpot(null);
    centre(place.x, place.y);
  };
  const goToSpot = () => {
    if (!spot) return;
    pick(spot.info.place ?? { id: `spot-${Math.floor(spot.x)}-${Math.floor(spot.y)}`, name: spot.info.title, kind: "view", x: (Math.floor(spot.x) + 0.5) * TILE, y: (Math.floor(spot.y) + 0.5) * TILE });
  };
  useEffect(() => {
    const c = canvas.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    c.width = Math.ceil(map.cols * S);
    c.height = Math.ceil(map.rows * S);
    paintMap(ctx, map, S);
    if (viewport.current) {
      viewport.current.scrollLeft =
        (focus.current.x / TILE) * S - viewport.current.clientWidth / 2;
      viewport.current.scrollTop =
        (focus.current.y / TILE) * S - viewport.current.clientHeight / 2;
    }
  }, [map, S]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    search.current?.focus();
    const timer = setInterval(
      () => setPosition({ x: PLAYER.x, y: PLAYER.y }),
      500,
    );
    return () => {
      clearInterval(timer);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="absolute inset-0 z-[100003] grid place-items-center bg-[#13203a]/80 p-2 sm:p-3"
      onClick={onClose}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Map of ${map.name}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const items = [
              ...dialog.current!.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,[tabindex="0"],summary',
              ),
            ];
            const first = items[0],
              last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
        className="map-open flex h-full max-h-[850px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-[#f7f1e6] text-[#13203a] md:flex-row"
      >
        <div className="relative min-h-[200px] flex-1 overflow-hidden">
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1 rounded-2xl border border-[#c7b9a3] bg-white/95 p-1 shadow">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom <= 0.75}
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              className="grid size-11 place-items-center rounded-xl disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center text-xs font-black">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom >= 3}
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="grid size-11 place-items-center rounded-xl disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Centre map on your location"
              onClick={() => centre(position.x, position.y)}
              className="grid size-11 place-items-center rounded-xl"
            >
              <LocateFixed className="size-4" />
            </button>
          </div>
          <div className="pointer-events-none absolute top-3 right-3 z-30 rounded-xl bg-[#13203a] px-3 py-2 text-xs font-black text-white">
            ↑ N
          </div>
          <div
            ref={viewport}
            tabIndex={0}
            aria-label="Location map. Scroll to explore, or select a destination from the list."
            className="h-full w-full overflow-auto overscroll-contain bg-[#7cc6ef]"
          >
            <div
              className="relative mx-auto cursor-crosshair"
              style={{ width: map.cols * S, height: map.rows * S }}
              onClick={(e) => {
                if (e.target !== e.currentTarget && !(e.target instanceof HTMLCanvasElement)) return;
                const r = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - r.left) / S, y = (e.clientY - r.top) / S;
                setSpot({ x, y, info: describeSpot(map, places, x, y) });
              }}
            >
              <canvas ref={canvas} className="absolute inset-0" aria-hidden />
              {searchArea && (
                <span
                  aria-label="Police search area"
                  className="pointer-events-none absolute z-10 rounded-full border-2 border-[#e04a3f] bg-[#e04a3f]/20"
                  style={{
                    left:
                      ((searchArea.origin.x - searchArea.radius) / TILE) * S,
                    top: ((searchArea.origin.y - searchArea.radius) / TILE) * S,
                    width: ((searchArea.radius * 2) / TILE) * S,
                    height: ((searchArea.radius * 2) / TILE) * S,
                  }}
                />
              )}
              {!!route.length && (
                <svg
                  className="pointer-events-none absolute inset-0 z-10"
                  width={map.cols * S}
                  height={map.rows * S}
                  aria-label="Walking route"
                >
                  <polyline
                    points={route
                      .map((p) => `${(p.x / TILE) * S},${(p.y / TILE) * S}`)
                      .join(" ")}
                    fill="none"
                    stroke="white"
                    strokeWidth={7}
                  />
                  <polyline
                    points={route
                      .map((p) => `${(p.x / TILE) * S},${(p.y / TILE) * S}`)
                      .join(" ")}
                    fill="none"
                    stroke="#1368c4"
                    strokeWidth={4}
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {pinGroups.filter(g=>g.places.length>1).map((group) => (
                <button key={`cluster-${group.places[0].id}`} type="button"
                  aria-label={`Zoom to ${group.places.length} nearby locations`}
                  title={group.places.map(p=>p.name).join(" · ")}
                  onClick={()=>{centre(group.x/S*TILE,group.y/S*TILE);setZoom(z=>Math.min(3,z+0.5));setArea(group.places.map(p=>p.id));}}
                  className="jelly absolute z-20 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-[#263e47] text-xs font-black text-white shadow-md ring-4 ring-[#263e47]/15"
                  style={{left:group.x,top:group.y}}>{group.places.length}</button>
              ))}
              {pinGroups.filter(g=>g.places.length===1).map(({places:[p]}) => {
                const Icon = KIND_ICON[p.kind];
                const on = waypoint?.id === p.id;
                return (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  aria-label={`Set walking route to ${p.name}`}
                  aria-pressed={on}
                  onClick={(e) => { e.stopPropagation(); pick(p); }}
                  className={cn("group absolute z-20 -translate-x-1/2 -translate-y-full focus-visible:z-40 focus-visible:outline-2 focus-visible:outline-[#13203a]", on && "z-30")}
                  style={{ left: (p.x / TILE) * S, top: (p.y / TILE) * S }}
                >
                  <span
                    className={cn("relative grid place-items-center rounded-[10px] border-2 border-white text-white shadow-[0_3px_8px_rgba(19,32,58,.35)] transition-transform group-hover:-translate-y-0.5", on ? "size-10 ring-4 ring-[#f2a03a]" : "size-8")}
                    style={{ background: KIND[p.kind].colour }}
                  >
                    <Icon className={on ? "size-5" : "size-4"} strokeWidth={2.4} aria-hidden />
                    <span aria-hidden className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] border-r-2 border-b-2 border-white" style={{ background: KIND[p.kind].colour }} />
                  </span>
                  <span
                    className={cn(
                      "pointer-events-none absolute top-full left-1/2 mt-2 max-w-40 -translate-x-1/2 rounded-md border border-[#d5c5ad] bg-white px-1.5 py-1 text-center text-[10px] leading-tight font-bold whitespace-nowrap text-[#13203a] shadow-sm",
                      on ? "block" : "hidden group-hover:block group-focus-visible:block",
                    )}
                  >
                    {p.name}
                  </span>
                </button>
              );})}
              {spot && (
                <>
                  <span aria-hidden className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full text-[#b4234f] drop-shadow" style={{ left: spot.x * S, top: spot.y * S }}>
                    <MapPin className="size-7 fill-white" strokeWidth={2.4} />
                  </span>
                  <div
                    role="dialog"
                    aria-label={`About this spot: ${spot.info.title}`}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-40 w-60 -translate-x-1/2 rounded-2xl border border-[#d5c5ad] bg-white p-3 text-[#13203a] shadow-xl"
                    style={{ left: spot.x * S, top: spot.y * S + 10 }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: spot.info.place ? KIND[spot.info.place.kind].colour : "#5f7a8a" }}>
                        <SpotIcon kind={spot.info.place?.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-tight font-black">{spot.info.title}</p>
                        <p className="text-[11px] text-[#13203a]/70">{spot.info.detail}{spot.info.area ? ` · ${spot.info.area}` : ""}</p>
                        <p className="text-[11px] text-[#13203a]/70">≈ {Math.round(Math.hypot(spot.x * TILE - position.x, spot.y * TILE - position.y) / TILE * 8)} m away</p>
                      </div>
                      <button type="button" aria-label="Close" onClick={() => setSpot(null)} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-black/5"><X className="size-3.5" /></button>
                    </div>
                    <button type="button" onClick={goToSpot} className="gloss-off mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1368c4] text-xs font-black text-white">
                      <Navigation className="size-3.5" aria-hidden /> {spot.info.place ? "Set route here" : "Walk here"}
                    </button>
                  </div>
                </>
              )}
              <span
                role="img"
                aria-label="Your current location"
                className="map-me pointer-events-none absolute z-30 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#f2a03a] shadow"
                style={{
                  left: (position.x / TILE) * S,
                  top: (position.y / TILE) * S,
                }}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-lg bg-white/95 px-3 py-2 text-[10px] font-bold shadow">
            Tap anywhere to see what&apos;s there · Orange: you · Blue: route
          </div>
        </div>
        <aside className="flex max-h-[48%] w-full shrink-0 flex-col border-t border-[#d5c5ad] p-3 sm:p-4 md:max-h-full md:w-80 md:border-t-0 md:border-l">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-black">{map.name}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the map"
              className="jelly grid size-11 shrink-0 place-items-center rounded-full bg-white"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-[#13203a]/70">
            {intro ?? "Choose a destination to see its walking route. Tap a dark cluster to explore nearby places."}
          </p>
          <label className="mt-3 flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#c7b9a3] bg-white px-3">
            <Search className="size-4 shrink-0" aria-hidden />
            <input
              ref={search}
              aria-label="Search locations"
              placeholder="Jobs, study, stations…"
              value={query}
              onChange={(e) => {setQuery(e.target.value);setArea(null);}}
              className="w-full min-w-0 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="mt-2 flex gap-1 rounded-xl bg-[#e8e1d3] p-1" aria-label="Map categories">
            {(["Explore","Transport","All"] as const).map(label=><button type="button" key={label}
              aria-pressed={category===label}
              onClick={()=>{setArea(null);setQuery("");setShow(new Set((Object.keys(KIND) as PlaceKind[]).filter(k=>label==="All"|| (label==="Transport"?["bike","bus","station"].includes(k):k!=="bike"&&k!=="bus"))));}}
              className={cn("min-h-9 flex-1 rounded-lg px-2 text-xs font-bold focus-visible:outline-2",category===label?"bg-[#263e47] text-white":"bg-white hover:bg-[#dce8dd]")}>{label}</button>)}
          </div>
          {area && <button type="button" onClick={()=>setArea(null)} className="mt-2 min-h-10 rounded-xl bg-[#e5eadd] px-3 text-left text-xs font-bold">Showing this area · Show all locations</button>}
          <div className="mt-2 overflow-y-auto overscroll-contain">
            <details className="rounded-xl bg-white p-2">
              <summary className="min-h-8 cursor-pointer text-xs font-black">
                Location types / legend
              </summary>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {kinds.map((k) => (
                  <label
                    key={k}
                    className="flex min-h-11 items-center gap-1.5 text-[11px] font-bold"
                  >
                    <input
                      type="checkbox"
                      checked={show.has(k)}
                      onChange={() =>
                        setShow((old) => {
                          const next = new Set(old);
                          if (next.has(k)) next.delete(k);
                          else next.add(k);
                          return next;
                        })
                      }
                    />
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: KIND[k].colour }}
                    />
                    {KIND[k].label}
                  </label>
                ))}
              </div>
            </details>
            {waypoint && (
              <div className="mt-2 rounded-xl bg-[#13203a] p-3 text-xs text-white">
                <p className="font-black">{waypoint.name}</p>
                <p className="mt-1">
                  {route.length
                    ? `Approx. ${(route.length - 1) * 8} game metres on foot`
                    : "No walking route here. Try a nearby entrance or public transport."}
                </p>
                <div className="mt-1 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-11 font-bold underline"
                  >
                    Follow route
                  </button>
                  <button
                    type="button"
                    onClick={() => onPick(null)}
                    className="min-h-11 underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            <p role="status" className="mt-3 text-[11px] font-bold">
              {filtered.length} location{filtered.length === 1 ? "" : "s"} · nearest first
            </p>
            <ul className="mt-1 space-y-1">
              {nearby.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pick(p)}
                    aria-pressed={waypoint?.id === p.id}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-2 rounded-xl border p-2 text-left",
                      waypoint?.id === p.id
                        ? "border-[#2b5fd9] bg-[#e8efff]"
                        : "border-transparent bg-white",
                    )}
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                      style={{ background: KIND[p.kind].colour }}
                    >
                      <SpotIcon kind={p.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold">
                        {p.name}
                      </span>
                      <span className="block text-[10px] text-[#13203a]/70">
                        {KIND[p.kind].label} · ≈
                        {Math.round(
                          (Math.hypot(p.x - position.x, p.y - position.y) /
                            TILE) *
                            8,
                        )}{" "}
                        m away
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!filtered.length && (
              <p className="py-4 text-sm">
                No locations match. Clear the search or enable more location
                types.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** The icon for a tapped spot: its place category, or a plain map pin. */
function SpotIcon({ kind }: { kind?: PlaceKind }) {
  const Icon = kind ? KIND_ICON[kind] : MapPin;
  return <Icon className="size-4" aria-hidden />;
}
