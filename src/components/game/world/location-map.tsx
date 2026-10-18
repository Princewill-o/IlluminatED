"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { LocateFixed, Minus, Plus, Search, X } from "lucide-react";

import { PLAYER } from "./art";

import { buildLondon } from "@/game/core/london";
import { LONDON_DISTRICTS } from "@/game/core/london-districts";
import {
  KIND,
  placesFor,
  walkingRoute,
  mapPinGroups,
  type Place,
  type PlaceKind,
} from "@/game/core/map-guide";
import { TILE, type WorldMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

const COLOURS: Record<string, string> = {
  w: "#69b7d4",
  g: "#b8d599",
  f: "#b8d599",
  T: "#79ad74",
  "=": "#53636b",
  ":": "#53636b",
  "-": "#f5e9d4",
  _: "#f2e0b2",
  X: "#b6a38d",
  "#": "#776f68",
  W: "#aacbd0",
  "|": "#c8c1b2",
};

export function LocationMap({
  map,
  waypoint,
  onPick,
  onClose,
  searchArea,
}: {
  map: WorldMap;
  waypoint: Place | null;
  onPick: (place: Place | null) => void;
  onClose: () => void;
  searchArea?: { origin: { x: number; y: number }; radius: number } | null;
}) {
  const [zoom, setZoom] = useState(1);
  const S = (map.cols > 100 ? 7 : 9) * zoom;
  const [query, setQuery] = useState("");
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
    centre(place.x, place.y);
  };
  useEffect(() => {
    const c = canvas.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    c.width = Math.ceil(map.cols * S);
    c.height = Math.ceil(map.rows * S);
    ctx.fillStyle = "#d9cfbd";
    ctx.fillRect(0, 0, c.width, c.height);
    map.tiles.forEach((row, y) =>
      [...row].forEach((tile, x) => {
        ctx.fillStyle = COLOURS[tile] ?? "#c7b9a3";
        ctx.fillRect(x * S, y * S, Math.ceil(S), Math.ceil(S));
        if (tile === "#") {
          ctx.strokeStyle = "#a2927e";
          ctx.lineWidth = 0.4;
          ctx.strokeRect(x * S, y * S, S, S);
        }
      }),
    );
    // Quiet grid lines keep streets and destinations visually dominant.
    ctx.strokeStyle = "rgba(19,32,58,.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x < map.cols; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x * S, 0);
      ctx.lineTo(x * S, c.height);
      ctx.stroke();
    }
    for (let y = 0; y < map.rows; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y * S);
      ctx.lineTo(c.width, y * S);
      ctx.stroke();
    }
    if (map.id === "city") {
      // Draw complete building footprints instead of a checker of solid tiles.
      for (const building of buildLondon().things) {
        if (building.kind !== "building") continue;
        ctx.fillStyle = building.id.startsWith("hotel-") ? "#879d90" : "#b5a795";
        ctx.fillRect((building.x+.12)*S,(building.y+.12)*S,(building.w-.24)*S,(building.h-.24)*S);
        ctx.strokeStyle = "#968c7f"; ctx.lineWidth = 1;
        ctx.strokeRect((building.x+.12)*S,(building.y+.12)*S,(building.w-.24)*S,(building.h-.24)*S);
      }
      ctx.font = `bold ${Math.max(12, S * 1.6)}px sans-serif`;
      ctx.fillStyle = "#295a79";
      const river = buildLondon().river,
        point = river[Math.floor(river.length / 2)];
      ctx.save();
      ctx.translate(point[0] * S, point[1] * S);
      ctx.rotate(0.1);
      ctx.fillText("RIVER THAMES", 0, 0);
      ctx.restore();
      for (const district of LONDON_DISTRICTS) {
        const x=(district.x+district.w/2)*S,y=(district.y+district.h-2)*S;
        ctx.save();
        ctx.font=`600 ${Math.max(10,S*1.25)}px sans-serif`;
        ctx.textAlign="center";
        const width=ctx.measureText(district.name).width+12;
        ctx.fillStyle="rgba(255,250,235,0.92)";
        ctx.fillRect(x-width/2,y-12,width,18);
        ctx.fillStyle="#385448";
        ctx.fillText(district.name,x,y);
        ctx.restore();
      }
    }
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
            className="h-full w-full overflow-auto overscroll-contain bg-[#d9cfbd]"
          >
            <div
              className="relative mx-auto"
              style={{ width: map.cols * S, height: map.rows * S }}
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
                  className="absolute z-20 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-[#263e47] text-xs font-black text-white shadow-md ring-4 ring-[#263e47]/15"
                  style={{left:group.x,top:group.y}}>{group.places.length}</button>
              ))}
              {pinGroups.filter(g=>g.places.length===1).map(({places:[p]}) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  aria-label={`Set walking route to ${p.name}`}
                  aria-pressed={waypoint?.id === p.id}
                  onClick={() => pick(p)}
                  className={cn(
                    "group absolute z-20 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[10px] font-black text-white shadow-md focus-visible:z-40 focus-visible:outline-2 focus-visible:outline-[#13203a]",
                    waypoint?.id === p.id && "z-30 ring-4 ring-[#f2a03a]",
                  )}
                  style={{
                    left: (p.x / TILE) * S,
                    top: (p.y / TILE) * S,
                    background: KIND[p.kind].colour,
                  }}
                >
                  {places.indexOf(p) + 1}
                  <span
                    className={cn(
                      "pointer-events-none absolute top-full left-1/2 mt-1 max-w-36 -translate-x-1/2 rounded-md border border-[#d5c5ad] bg-white px-1.5 py-1 text-center text-[10px] leading-tight font-bold whitespace-nowrap text-[#13203a] shadow-sm",
                      waypoint?.id === p.id
                        ? "block"
                        : "hidden group-hover:block group-focus-visible:block",
                    )}
                  >
                    {p.name}
                  </span>
                </button>
              ))}
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
            Orange: you · Blue: route · Dark circles: nearby locations
            <br />
            Grid: 10 tiles ≈ 80 game metres
          </div>
        </div>
        <aside className="flex max-h-[48%] w-full shrink-0 flex-col border-t border-[#d5c5ad] p-3 sm:p-4 md:max-h-full md:w-80 md:border-t-0 md:border-l">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-black">{map.name}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the map"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-white"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-[#13203a]/70">
            Choose a destination to see its walking route. Tap a dark cluster to explore nearby places.
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
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-black text-white"
                      style={{ background: KIND[p.kind].colour }}
                    >
                      {places.indexOf(p) + 1}
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
