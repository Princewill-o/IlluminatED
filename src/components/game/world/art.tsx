"use client";

import { memo, useEffect, useRef } from "react";

import { drawMap } from "./tiles";
import FURNITURE_ART from "../../../../public/world/furniture.json";
import HIGHLANDS_ART from "../../../../public/world/highlands.json";
import HOME_ART from "../../../../public/world/home.json";
import MOVERS from "../../../../public/world/movers.json";
import { WorldFigure, poseWorldFigure } from "../character";

import { COACHES, COACH_LENGTH, COACH_WIDTH, coachById, type CoachId } from "@/game/core/coaches";
import { look } from "@/game/core/cosmetics";
import { cityFallbackPlan } from "@/game/core/fallback-city";
import { CATALOGUE_LAYOUT, STARTER_LAYOUT } from "@/game/core/homes";
import { buildLondon } from "@/game/core/london";
import { residentPaths, residentPose } from "@/game/core/residents";
import { crossingPedestrianPoses, signalAt, stopLine, trafficLayout, trafficMoveDistance, type TrafficVehicle } from "@/game/core/traffic-rules";
import { BUS_LENGTH, BUS_WIDTH, CAR_LENGTH, CAR_WIDTH, ROAD_LANE_OFFSET } from "@/game/core/vehicles";
import { TILE, type WorldMap } from "@/game/core/world";

/**
 * Pre-rendered 3D worlds (Blender, see scripts/world). The base picture is
 * drawn under everyone; every tall thing (buildings, trees, lamps, landmarks)
 * is its own cut-out with a z-index at its front edge, so players walk behind
 * buildings and in front of them correctly. Signs, logos and the moving bits
 * (the London Eye, buses, cabs, boats) are layered on top in the browser.
 */

interface Prop {
  id: string;
  a: number;
  sx: number;
  sy: number;
  w: number;
  h: number;
  x: number;
  y: number;
  z: number;
  /** Which atlas set (default: the map's own). */
  set?: "furniture";
}
interface Art {
  base: string;
  atlas: (i: number) => string;
  offset: number;
  width: number;
  height: number;
  props: Prop[];
  furnitureAtlas?: string;
}

/** Sprite templates per furniture item, with the tile each was rendered at. */
function templates(homeProps: Prop[]) {
  const t = new Map<string, { prop: Prop; x: number; y: number }>();
  for (const p of STARTER_LAYOUT) {
    const prop = homeProps.find((k) => k.id === p.key);
    if (prop && !t.has(p.item)) t.set(p.item, { prop, x: p.x, y: p.y });
  }
  for (const p of CATALOGUE_LAYOUT) {
    const prop = (FURNITURE_ART.props as Prop[]).find((k) => k.id === p.item);
    if (prop) t.set(p.item, { prop: { ...prop, set: "furniture" }, x: p.x, y: p.y });
  }
  return t;
}

/** The room's own props (walls) plus each placed item, moved from where it was rendered. */
export function homeProps(all: Prop[], layout: { key: string; item: string; x: number; y: number }[]): Prop[] {
  const t = templates(all);
  const starterKeys = new Set(STARTER_LAYOUT.map((p) => p.key));
  const shell = all.filter((p) => !starterKeys.has(p.id));
  const placed = layout.flatMap((p) => {
    const tp = t.get(p.item);
    if (!tp) return [];
    const dx = (p.x - tp.x) * TILE;
    const dy = (p.y - tp.y) * TILE;
    return [{ ...tp.prop, id: p.key, x: tp.prop.x + dx, y: tp.prop.y + dy, z: tp.prop.z === 1 ? 1 : tp.prop.z + dy }];
  });
  return [...shell, ...placed];
}

function artFor(map: WorldMap): Art | null {
  if (map.art === "highlands")
    return {
      base: "/world/highlands-base.webp",
      atlas: (i) => `/world/highlands-props-${i}.webp`,
      offset: HIGHLANDS_ART.offset,
      width: HIGHLANDS_ART.width,
      height: HIGHLANDS_ART.height,
      props: HIGHLANDS_ART.props as Prop[],
    };
  if (map.art?.startsWith("home-")) {
    const style = Number(map.art.slice(5));
    const h = HOME_ART as unknown as { offset: number; width: number; height: number; props: Prop[] };
    return {
      base: `/world/home-${style}-base.webp`,
      atlas: (i) => `/world/home-${style}-props-${i}.webp`,
      furnitureAtlas: `/world/furniture-${style}-props-0.webp`,
      offset: h.offset,
      width: h.width,
      height: h.height,
      props: homeProps(h.props, map.layout ?? STARTER_LAYOUT),
    };
  }
  return null;
}

export const ArtScenery = memo(function ArtScenery({ map, night = false }: { map: WorldMap; night?: boolean }) {
  if (map.art === "london") return <><CurrentCityScenery map={map} night={night} /><CityTrafficSignals /><LondonLife map={map} /></>;
  const art = artFor(map);
  if (!art) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={art.base}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute left-0 max-w-none select-none"
        style={{ top: -art.offset, width: art.width, height: art.height, zIndex: 0 }}
      />
      {art.props.map((p) => (
        <div
          key={p.id}
          aria-hidden
          data-prop={`${p.x},${p.y},${p.w},${p.h},${p.z}`}
          className="pointer-events-none absolute transition-opacity duration-200"
          style={{
            left: p.x,
            top: p.y,
            width: p.w,
            height: p.h,
            backgroundImage: `url(${p.set === "furniture" && art.furnitureAtlas ? art.furnitureAtlas : art.atlas(p.a)})`,
            backgroundPosition: `-${p.sx}px -${p.sy}px`,
            zIndex: p.z,
          }}
        />
      ))}
    </>
  );
});

/**
 * When you walk behind a building, it turns see-through so you never lose
 * yourself. Called by the world loop with your feet position.
 */
export function fadeArtProps(layer: HTMLElement, x: number, y: number) {
  const els = layer.querySelectorAll<HTMLElement>("[data-prop]");
  for (const el of els) {
    const [px, py, pw, ph, pz] = el.dataset.prop!.split(",").map(Number);
    const behind = y < pz && x > px + 4 && x < px + pw - 4 && y - 40 < py + ph && y > py;
    const want = behind ? "0.4" : "";
    if (el.style.opacity !== want) el.style.opacity = want;
  }
}

type RoadPaint = { x: number; y: number; w: number; h: number; colour: string };
type TrafficJunction = ReturnType<typeof trafficLayout>["junctions"][number];
export type SignalPost = { id: string; junction: TrafficJunction; axis: "horizontal" | "vertical"; approach: "east" | "west" | "north" | "south"; x: number; y: number };

/** Paint geometry is shared by the live 3D world and the canvas fallback. */
export function cityRoadPaint(map: WorldMap): RoadPaint[] {
  const paint: RoadPaint[] = [];
  const { junctions, crossings } = trafficLayout();
  const road = (x: number, y: number) => "=:".includes(map.tiles[y]?.[x] ?? " ");
  const stripe = (x: number, y: number, w: number, h: number, colour = "#fff6dc") => paint.push({ x, y, w, h, colour });
  for (let y = 2; y < map.rows - 2; y++) for (let x = 2; x < map.cols - 2; x++) {
    // Mark only exact four-tile road sections, keeping junction centres clear.
    const horizontal = [-2, -1, 0, 1].every(dy => road(x, y + dy)) && !road(x, y - 3) && !road(x, y + 2);
    const vertical = [-2, -1, 0, 1].every(dx => road(x + dx, y)) && !road(x - 3, y) && !road(x + 2, y);
    if (horizontal && !junctions.some(j => Math.abs(j.y - y) < .1 && Math.abs(j.x - x - .5) < 5)) {
      if (x % 3 !== 2) stripe(x + .05, y - .045, .9, .09);
      stripe(x, y - 1.94, 1, .055, "#d9dfdc");
      stripe(x, y + 1.885, 1, .055, "#d9dfdc");
    }
    if (vertical && !junctions.some(j => Math.abs(j.x - x) < .1 && Math.abs(j.y - y - .5) < 5)) {
      if (y % 3 !== 2) stripe(x - .045, y + .05, .09, .9);
      stripe(x - 1.94, y, .055, 1, "#d9dfdc");
      stripe(x + 1.885, y, .055, 1, "#d9dfdc");
    }
  }
  for (const crossing of crossings) {
    // Eight broad white stripes span both lanes; the crossing band and signal
    // stop line use the exact same positions as the traffic controller.
    for (let n = 0; n < 8; n++) {
      if (crossing.axis === "horizontal") stripe(crossing.x - crossing.w / 2, crossing.y - crossing.h / 2 + n * .5 + .08, crossing.w, .32);
      else stripe(crossing.x - crossing.w / 2 + n * .5 + .08, crossing.y - crossing.h / 2, .32, crossing.h);
    }
  }
  for (const junction of junctions) for (const approach of ["east", "west", "north", "south"] as const) {
    const line = stopLine(junction, approach);
    if (line.axis === "horizontal") stripe(line.x - .075, line.y - .92, .15, 1.84);
    else stripe(line.x - .92, line.y - .075, 1.84, .15);
  }
  return paint;
}

/** The post sits on the approaching driver's left pavement, outside the lane. */
export function citySignalPosts(): SignalPost[] {
  return trafficLayout().junctions.flatMap(junction => (["east", "west", "north", "south"] as const).map(approach => {
    const line = stopLine(junction, approach);
    const outward = line.axis === "horizontal" ? Math.sign(line.y - junction.y) : Math.sign(line.x - junction.x);
    const base = { x: line.axis === "vertical" ? junction.x + outward * 2.4 : line.x, y: line.axis === "horizontal" ? junction.y + outward * 2.4 : line.y };
    // A post may sit slightly beside its line to avoid an existing shelter or
    // lamp. Keep the entire housing on the pavement, outside vehicle lanes.
    const tiles = buildLondon().tiles;
    const position = [0, -.8, .8, -1.4, 1.4].map(offset => ({ x: base.x + (line.axis === "horizontal" ? offset : 0), y: base.y + (line.axis === "vertical" ? offset : 0) })).find(p => [-.34, .34].every(dx => [-.34, .34].every(dy => ["-", "_", "g", "f"].includes(tiles[Math.floor(p.y + dy)]?.[Math.floor(p.x + dx)] ?? "")))) ?? base;
    return { id: `${junction.id}-${approach}`, junction, axis: line.axis, approach, ...position };
  }));
}

const SIGNAL_COLOURS = { red: "#ff4b52", amber: "#ffd04a", green: "#46f09c" };

/** Traffic and pedestrian lights remain available if WebGL is unavailable. */
function CityTrafficSignals() {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const lights = Array.from(layer.current?.querySelectorAll<HTMLElement>("[data-traffic-signal]") ?? []);
    const posts = citySignalPosts();
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      for (let i = 0; i < lights.length; i++) {
        const post = posts[i], state = signalAt(post.junction, now), colour = state[post.axis];
        if (lights[i].dataset.phase === `${colour}-${state.pedestrian}`) continue;
        lights[i].dataset.phase = `${colour}-${state.pedestrian}`;
        for (const bulb of lights[i].querySelectorAll<HTMLElement>("[data-bulb]")) {
          const active = bulb.dataset.bulb === colour;
          bulb.style.background = active ? SIGNAL_COLOURS[colour] : "#303b40";
          bulb.style.boxShadow = active ? `0 0 8px ${SIGNAL_COLOURS[colour]}` : "none";
        }
        const walker = lights[i].querySelector<HTMLElement>("[data-pedestrian]");
        if (walker) { walker.textContent = state.pedestrian === "walk" ? "↟" : "■"; walker.style.color = state.pedestrian === "walk" ? SIGNAL_COLOURS.green : SIGNAL_COLOURS.red; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div ref={layer} className="pointer-events-none absolute inset-0" aria-hidden>
    {citySignalPosts().map(post => <div key={post.id} data-traffic-signal className="absolute" style={{ left: post.x * TILE, top: post.y * TILE, zIndex: Math.round(post.y * TILE) }}>
      <span className="absolute -top-[68px] -left-[2px] h-[68px] w-[4px] rounded bg-[#24313b]" />
      <span className="absolute -top-[88px] -left-[11px] flex h-[47px] w-[22px] flex-col items-center justify-evenly rounded-md border-2 border-[#56616a] bg-[#18232c] shadow">
        {(["red", "amber", "green"] as const).map(colour => <span key={colour} data-bulb={colour} className="size-[10px] rounded-full bg-[#303b40]" />)}
      </span>
      <span data-signal-direction className="absolute -top-[41px] -left-[12px] flex h-[12px] w-[24px] items-center justify-center rounded bg-[#17232b] text-[9px] font-black leading-none text-[#fff6dc]">{({ north: "↑ N", south: "↓ S", east: "→ E", west: "← W" })[post.approach]}</span>
      <span data-pedestrian className="absolute -top-[27px] -left-[8px] flex h-[16px] w-[16px] items-center justify-center rounded bg-[#18232c] text-[15px] font-black leading-none text-[#ff4b52]">■</span>
    </div>)}
  </div>;
}

/** A grid-derived city survives WebGL loss without stale streets or invisible houses. */
const CurrentCityScenery = memo(function CurrentCityScenery({ map, night }: { map: WorldMap; night: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    drawMap(ctx, map, night);
    // Replace legacy per-tile dashed lines with the current four-tile road plan.
    ctx.fillStyle = "#586171";
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if ("=:".includes(map.tiles[y][x])) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    for (const stripe of cityRoadPaint(map)) { ctx.fillStyle = stripe.colour; ctx.fillRect(stripe.x * TILE, stripe.y * TILE, stripe.w * TILE, stripe.h * TILE); }
    const plan = cityFallbackPlan(map);
    for (const b of plan.buildings) {
      if (!b.solid.length) continue;
      ctx.save();
      // Clip every roof/facade to the actual solid tiles, including carved entrances.
      ctx.beginPath();
      for (const r of b.solid) ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 4);
      ctx.strokeStyle = "rgba(16,27,42,0.25)";
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      for (let x = b.x + TILE; x < b.x + b.w - 12; x += TILE * 1.5) {
        ctx.fillStyle = "rgba(16,27,42,0.18)";
        ctx.fillRect(x, b.y + 7, 2, Math.max(8, b.h - 42));
        ctx.fillStyle = "#b9d4dc";
        ctx.fillRect(x - 8, b.y + 14, 14, 10);
      }
      const front = b.y + b.h;
      ctx.fillStyle = b.colour;
      ctx.fillRect(b.x + 3, front - 29, b.w - 6, 28);
      for (let x = b.x + 12; x < b.x + b.w - 12; x += 24) {
        ctx.fillStyle = night ? "#ffe39a" : "#a8d2df";
        ctx.fillRect(x, front - 23, 12, 14);
        ctx.fillStyle = "#314052";
        ctx.fillRect(x + 5, front - 23, 2, 14);
      }
      if (b.label) {
        ctx.fillStyle = b.accent;
        ctx.fillRect(b.x + 4, front - 50, b.w - 8, 21);
        ctx.fillStyle = b.ink;
        ctx.font = "800 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.label, b.x + b.w / 2, front - 39, b.w - 14);
      }
      for (const door of b.doors) {
        ctx.fillStyle = "#f6ecd4";
        ctx.fillRect(door.x - door.w / 2 - 2, door.y - 25, door.w + 4, 25);
        ctx.fillStyle = "#263c4b";
        ctx.fillRect(door.x - door.w / 2, door.y - 22, door.w, 22);
        ctx.fillStyle = "#d9b66f";
        ctx.fillRect(door.x + door.w / 2 - 5, door.y - 12, 2, 3);
      }
      ctx.restore();
    }
    // Phone boxes, postboxes and bus shelters also occupy solid map cells.
    for (const fixture of plan.fixtures) {
      const { x, y } = fixture;
      ctx.fillStyle = "#a32c2c";
      ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 5);
      ctx.fillStyle = fixture.kind === "busstop" ? "#b4d8e1" : fixture.kind === "phonebox" ? "#e6d8b9" : "#70312c";
      ctx.fillRect(x + 7, y + 9, TILE - 14, TILE - 15);
      ctx.fillStyle = "#f9f2e2";
      ctx.font = "800 6px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(fixture.kind === "busstop" ? "BUS" : fixture.kind === "phonebox" ? "TEL" : "POST", x + TILE / 2, y + 7, TILE - 6);
    }
  }, [map, night]);
  return <canvas ref={canvas} width={map.width} height={map.height} className="pointer-events-none absolute top-0 left-0 [image-rendering:pixelated]" aria-hidden />;
});

type Mover = keyof typeof MOVERS;
const M = MOVERS as Record<string, { frames: number; w: number; h: number; ax: number; ay: number }>;

/** The London Eye turning, buses and cabs doing their rounds, boats on the Thames. */
type VehicleKind = CoachId | "bus" | "cab" | "boat" | "sedan" | "van" | "suv" | "police" | "ambulance" | "delivery" | "hatchback-sports";

// Everyone on a route keeps the same speed so nobody drives through anybody.
/** Where the traffic is right now (world px, centre and half-size) and where you are: shared with the game loop. */
export const TRAFFIC_BOXES: ({ x: number; y: number; hw: number; hh: number; dx: number; dy: number; speed?: number } | undefined)[] = [];
export const PLAYER = { x: -9999, y: -9999 };
export const PLAYER_VEHICLE = { active: false, x: 0, y: 0, heading: 0, speed: 0 };
/** Current local pedestrians, shared by both renderers and the game loop. */
export const NPC_SPOTS: { x: number; y: number }[] = [];

/** Blinds on the buses: the Superloop and the BL1. */
export const BUS_ROUTE_CODES = ["SL6", "BL1", "SL8"];
const ROUTE_SPEED = [2.6, 2.8, 2.5];
const TRAFFIC: { kind: VehicleKind; route: number; at: number }[] = [
  ...COACHES.map(coach=>({kind:coach.id,route:coach.route,at:coach.at})),
  { kind: "bus", route: 0, at: 0.0 },
  { kind: "sedan", route: 0, at: 0.12 },
  { kind: "cab", route: 0, at: 0.24 },
  { kind: "van", route: 0, at: 0.38 },
  { kind: "bus", route: 0, at: 0.5 },
  { kind: "suv", route: 0, at: 0.63 },
  { kind: "delivery", route: 0, at: 0.76 },
  { kind: "cab", route: 0, at: 0.88 },
  { kind: "bus", route: 1, at: 0.0 },
  { kind: "police", route: 1, at: 0.25 },
  { kind: "cab", route: 1, at: 0.5 },
  { kind: "hatchback-sports", route: 1, at: 0.75 },
  { kind: "bus", route: 2, at: 0.05 },
  { kind: "cab", route: 2, at: 0.17 },
  { kind: "ambulance", route: 2, at: 0.3 },
  { kind: "sedan", route: 2, at: 0.43 },
  { kind: "bus", route: 2, at: 0.55 },
  { kind: "suv", route: 2, at: 0.68 },
  { kind: "van", route: 2, at: 0.8 },
  { kind: "cab", route: 2, at: 0.92 },
  { kind: "boat", route: -1, at: 0.0 },
  { kind: "boat", route: -1, at: 0.55 },
];

// Londoners on the pavements: a few looks, walking the block loops.
const pick = <T,>(xs: readonly T[], i: number) => xs[i % xs.length];
const SKINS = ["skin-1", "skin-2", "skin-3", "skin-4", "skin-5", "skin-6", "skin-7", "skin-8"];
const HAIRS = ["hair-short", "hair-bob", "hair-afro", "hair-ponytail", "hair-curly", "hair-buzz", "hair-long", "hair-braids", "hair-buns", "hair-quiff"];
const HAIRCOLS = ["haircol-black", "haircol-brown", "haircol-blonde", "haircol-auburn", "haircol-ginger", "haircol-silver"];
const TOPS = ["top-hoodie", "top-suit", "top-tee", "top-denim", "top-knit", "top-hivis", "top-polo", "top-stripes", "top-tracksuit"];
const BOTTOMS = ["bottom-jeans", "bottom-smart", "bottom-joggers", "bottom-skirt", "bottom-cargo"];
export const NPC_LINES = [
  "Morning! Mind the gap.",
  "Is this the stop for the SL6?",
  "Lovely day for a revision walk.",
  "The Lyme bikes are by the stations.",
  "I've got a test on Thursday...",
  "Have you tried the Games Hall?",
  "Trains are every two minutes.",
  "Fancy a cuppa after this?",
];
const NPCS = Array.from({ length: 14 }, (_, i) => ({
  avatar: look({
    skin: pick(SKINS, i * 3 + 1),
    hair: pick(HAIRS, i * 7),
    hairColor: pick(HAIRCOLS, i * 5),
    top: pick(TOPS, i * 2 + 1),
    bottom: pick(BOTTOMS, i),
  }),
  route: i % 3,
  at: (i * 0.137) % 1,
  side: i % 2 ? 1.3 : -1.3,
  back: i % 4 >= 2,
  speed: 1.2 + (i % 3) * 0.2,
}));

function LondonLife({ map }: { map: WorldMap }) {
  const L = buildLondon();
  const eye = L.things.find((t): t is Extract<typeof t, { kind: "landmark" }> => t.kind === "landmark" && t.name === "eye");
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const people = useRef<(HTMLDivElement | null)[]>([]);
  const crossingPeople = useRef<(HTMLDivElement | null)[]>([]);
  const vehicles = useRef(TRAFFIC.map((v) => ({ ...v, speed: v.route < 0 ? 1.4 + v.at : ROUTE_SPEED[v.route], distance: 0 })));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pedestrianPaths = residentPaths(map, NPCS.length);
    const paths = [...L.routes.map(route => { const first = route[0], last = route[route.length - 1]; return first[0] === last[0] && first[1] === last[1] ? route : [...route, first]; }), L.river];
    const lengths = paths.map((pts) => {
      let s = 0;
      for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return s;
    });
    const pointAt = (pi: number, d: number, back: boolean) => {
      const pts = paths[pi];
      const len = lengths[pi];
      let t = ((d % len) + len) % len;
      if (back) t = len - t;
      for (let i = 1; i < pts.length; i++) {
        const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (t <= seg) {
          const k = seg ? t / seg : 0;
          const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k;
          const y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k;
          const dx = (pts[i][0] - pts[i - 1][0]) * (back ? -1 : 1);
          const dy = (pts[i][1] - pts[i - 1][1]) * (back ? -1 : 1);
          return { x, y, dx, dy };
        }
        t -= seg;
      }
      return { x: pts[0][0], y: pts[0][1], dx: 1, dy: 0 };
    };
    const poseAt = (v: typeof vehicles.current[number], index: number, distance = v.distance) => {
      const pi = v.route < 0 ? paths.length - 1 : v.route;
      const p = pointAt(pi, distance, v.kind === "boat" && index % 2 === 1);
      const len = Math.hypot(p.dx, p.dy) || 1, side = v.kind === "boat" ? 0 : ROAD_LANE_OFFSET;
      return { ...p, x: p.x + p.dy / len * side, y: p.y - p.dx / len * side };
    };
    for (const v of vehicles.current) v.distance = v.at * lengths[v.route < 0 ? paths.length - 1 : v.route];
    // Start with clear gaps even where several ambient routes share a street.
    const placed: TrafficVehicle[] = [];
    vehicles.current.forEach((v, i) => {
      if (v.kind === "boat") return;
      for (let attempt = 0; attempt < 100; attempt++) {
        const p = poseAt(v, i), length = coachById(v.kind) ? COACH_LENGTH : v.kind === "bus" ? BUS_LENGTH : CAR_LENGTH;
        if (!placed.some(other => Math.hypot(other.x - p.x, other.y - p.y) < (length + (other.length ?? CAR_LENGTH)) / 2 + .8)) {
          placed.push({ id: `ambient-${i}`, x: p.x, y: p.y, heading: Math.atan2(p.dy, p.dx), length }); break;
        }
        v.distance += .9;
      }
    });
    let raf = 0;
    const start = performance.now();
    let previous = start;
    const tick = (now: number) => {
      const secs = (now - start) / 1000, dt = Math.min(.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      const time = Date.now();
      const crossingWalkers = crossingPedestrianPoses(time);
      const currentTraffic: TrafficVehicle[] = vehicles.current.flatMap((v, i) => {
        if (v.kind === "boat") return [];
        const p = poseAt(v, i);
        return [{ id: `ambient-${i}`, x: p.x, y: p.y, heading: Math.atan2(p.dy, p.dx), length: coachById(v.kind) ? COACH_LENGTH : v.kind === "bus" ? BUS_LENGTH : CAR_LENGTH, width: coachById(v.kind) ? COACH_WIDTH : v.kind === "bus" ? BUS_WIDTH : CAR_WIDTH }];
      });
      if (PLAYER_VEHICLE.active) currentTraffic.push({ id: "player", x: PLAYER_VEHICLE.x / TILE, y: PLAYER_VEHICLE.y / TILE, heading: PLAYER_VEHICLE.heading, speed: PLAYER_VEHICLE.speed / TILE });
      const pedestrians = [...NPC_SPOTS.map(p => ({ x: p.x / TILE, y: p.y / TILE })), ...crossingWalkers.map(p => ({ x: p.x, y: p.y }))];
      if (!PLAYER_VEHICLE.active) pedestrians.push({ x: PLAYER.x / TILE, y: PLAYER.y / TILE });
      vehicles.current.forEach((v, i) => {
        const el = els.current[i];
        if (!el) return;
        const before = poseAt(v, i);
        const own = currentTraffic.find(other => other.id === `ambient-${i}`);
        const moved = reduce ? 0 : v.kind === "boat" || !own ? dt * v.speed : trafficMoveDistance(own, dt * v.speed, time, currentTraffic.filter(other => other.id !== own.id), pedestrians);
        v.distance += moved;
        const p = poseAt(v, i);
        const dir = v.kind === "boat" ? (p.dx >= 0 ? "E" : "W") : Math.abs(p.dx) > Math.abs(p.dy) ? (p.dx > 0 ? "E" : "W") : p.dy > 0 ? "S" : "N";
        const sprite = `${v.kind}-${dir}` as Mover;
        const m = M[sprite];
        const coach=coachById(v.kind);
        if (!m && !coach) return;
        const x = p.x * TILE, y = p.y * TILE;
        if (own) { own.x = p.x; own.y = p.y; own.heading = Math.atan2(p.dy, p.dx); }
        if(coach) {
          el.style.width=`${COACH_LENGTH*TILE}px`;el.style.height=`${COACH_WIDTH*TILE}px`;
          el.style.transformOrigin="center";el.style.transform=`translate3d(${x-COACH_LENGTH*TILE/2}px,${y-COACH_WIDTH*TILE/2}px,0) rotate(${Math.atan2(p.dy,p.dx)}rad)`;
        } else if(m) {
        if (el.dataset.sprite !== sprite) {
          el.dataset.sprite = sprite;
          el.style.backgroundImage = `url(/world/movers/${sprite}.webp)`;
          el.style.width = `${m.w}px`;
          el.style.height = `${m.h}px`;
        }
        const scale = v.kind === "boat" ? 1 : v.kind === "bus" ? BUS_LENGTH / 2.8 : CAR_LENGTH / 1.8;
        el.style.transformOrigin = "0 0";
        el.style.transform = `translate3d(${Math.round(x - m.ax * scale)}px, ${Math.round(y - m.ay * scale)}px, 0) scale(${scale})`;
        }
        el.style.zIndex = String(Math.round(y));
        // Footprint on the road (for bumping into people), and see-through when you're beside it.
        if (v.kind !== "boat") {
          const long = (coachById(v.kind) ? COACH_LENGTH : v.kind === "bus" ? BUS_LENGTH : CAR_LENGTH) * TILE;
          const wide = (coachById(v.kind) ? COACH_WIDTH : v.kind === "bus" ? BUS_WIDTH : CAR_WIDTH) * TILE;
          const horiz = dir === "E" || dir === "W";
          TRAFFIC_BOXES[i] = { x, y, hw: (horiz ? long : wide) / 2, hh: (horiz ? wide : long) / 2, dx: Math.sign(p.dx), dy: Math.sign(p.dy), speed: dt ? Math.hypot(p.x - before.x, p.y - before.y) * TILE / dt : 0 };
          const near = Math.abs(PLAYER.x - x) < (horiz ? long : wide) / 2 + 30 && PLAYER.y < y + 20 && PLAYER.y > y - 110;
          el.style.opacity = near ? "0.45" : "1";
        }
      });
      NPC_SPOTS.length = 0;
      NPCS.forEach((n, i) => {
        const el = people.current[i];
        if (!el) return;
        const path = pedestrianPaths[i];
        el.style.display = path ? "" : "none";
        if (!path) return;
        const pose = residentPose(path, reduce ? 0 : secs, i * 3.71);
        const x = pose.x * TILE;
        const y = pose.z * TILE;
        NPC_SPOTS.push({ x, y });
        el.style.transform = `translate3d(${Math.round(x - 20)}px, ${Math.round(y - 46)}px, 0)`;
        el.style.zIndex = String(Math.round(y));
        const ang = pose.angle;
        const root = el.querySelector(".td-root");
        if (root && !reduce) poseWorldFigure(root, ang, secs * n.speed * 5, 1, now);
        const bubble = el.querySelector<HTMLElement>(".npc-say");
        if (bubble) {
          const slot = Math.floor(secs / 6 + i * 0.7);
          const talking = (slot + i) % 5 === 0;
          bubble.style.display = talking ? "block" : "none";
          if (talking) bubble.textContent = NPC_LINES[(slot + i) % NPC_LINES.length];
        }
      });
      crossingWalkers.forEach((pose, i) => {
        const el = crossingPeople.current[i];
        if (!el) return;
        const x = pose.x * TILE, y = pose.y * TILE;
        NPC_SPOTS.push({ x, y });
        el.style.transform = `translate3d(${Math.round(x - 20)}px, ${Math.round(y - 46)}px, 0)`;
        el.style.zIndex = String(Math.round(y));
        const root = el.querySelector(".td-root");
        if (root) poseWorldFigure(root, Math.PI / 2 - pose.heading, secs * 7, pose.walking && !reduce ? 1 : 0, now);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      TRAFFIC_BOXES.length = 0;
      NPC_SPOTS.length = 0;
    };
  }, [L, map]);

  const wheel = M.eye;
  return (
    <>
      {eye && wheel && (
        <div
          aria-hidden
          className="eye-wheel pointer-events-none absolute"
          style={{
            left: (eye.x + eye.w / 2) * TILE - wheel.ax,
            top: (eye.y + 0.5) * TILE - wheel.ay,
            width: wheel.w,
            height: wheel.h,
            backgroundImage: "url(/world/movers/eye.webp)",
            zIndex: (eye.y + eye.h) * TILE - 2,
            ["--eye-w" as string]: `${wheel.w * wheel.frames}px`,
          }}
        />
      )}
      {NPCS.map((n, i) => (
        <div
          key={`npc-${i}`}
          aria-hidden
          ref={(el) => {
            people.current[i] = el;
          }}
          className="pointer-events-none absolute top-0 left-0 h-[46px] w-10"
        >
          <span className="npc-say absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-xl bg-white px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#0d1726] shadow" />
          <div className="td-root absolute inset-x-0 bottom-1 h-0">
            <span className="absolute -bottom-1 left-1/2 h-2 w-7 -translate-x-1/2 rounded-[50%] bg-black/25" />
            <WorldFigure avatar={n.avatar} badge={null} />
          </div>
        </div>
      ))}
      {NPCS.slice(0, 8).map((n, i) => (
        <div key={`crossing-npc-${i}`} aria-hidden ref={el => { crossingPeople.current[i] = el; }} className="pointer-events-none absolute top-0 left-0 h-[46px] w-10">
          <div className="td-root absolute inset-x-0 bottom-1 h-0">
            <span className="absolute -bottom-1 left-1/2 h-2 w-7 -translate-x-1/2 rounded-[50%] bg-black/25" />
            <WorldFigure avatar={n.avatar} badge={null} />
          </div>
        </div>
      ))}
      {vehicles.current.map((v, i) => (
        <div
          key={i}
          aria-hidden
          ref={(el) => {
            els.current[i] = el;
          }}
          className="pointer-events-none absolute top-0 left-0 transition-opacity duration-200"
        >
          {coachById(v.kind) && <span className="absolute inset-0 rounded-xl border-2 border-[#253441] shadow-lg" style={{background:coachById(v.kind)!.body}}>
            <span className="absolute inset-x-3 top-2 h-2 rounded bg-[#17303f]"/><span className="absolute inset-x-3 bottom-2 h-2 rounded bg-[#17303f]"/>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[16px] font-black whitespace-nowrap" style={{color:coachById(v.kind)!.ink}}>{coachById(v.kind)!.name}</span>
            <span className="absolute top-2 right-2 bottom-2 w-4 rounded bg-[#17303f]"/>
          </span>}
          {v.kind !== "boat" && !coachById(v.kind) && (
            // Drivers and passengers, seen through the glass when the vehicle goes see-through.
            <span className="absolute inset-x-[30%] top-[38%] flex justify-center gap-1">
              {Array.from({ length: v.kind === "bus" ? 4 : 1 }, (_, k) => (
                <span key={k} className="size-2 rounded-full border border-[#15151c]" style={{ background: ["#f1c7a2", "#8d5a3b", "#c58c62", "#5a3a28"][(i + k) % 4] }} />
              ))}
            </span>
          )}
          {v.kind === "bus" && (
            <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-[#15151c] px-1 font-mono text-[9px] leading-tight font-black text-[#ffb020]">
              {BUS_ROUTE_CODES[v.route]}
            </span>
          )}
        </div>
      ))}
    </>
  );
}
