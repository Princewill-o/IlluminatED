"use client";

import { memo, useEffect, useRef } from "react";

import { CompanyLogo } from "../company-logo";
import { TubeBadge } from "./tube-map";
import FURNITURE_ART from "../../../../public/world/furniture.json";
import HOME_ART from "../../../../public/world/home.json";
import LONDON_ART from "../../../../public/world/london.json";
import MOVERS from "../../../../public/world/movers.json";
import { WorldFigure, poseWorldFigure } from "../character";

import { look } from "@/game/core/cosmetics";
import { CATALOGUE_LAYOUT, STARTER_LAYOUT } from "@/game/core/homes";
import { logoFor } from "@/game/core/logos";
import { buildLondon } from "@/game/core/london";
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

/** Camera tilt used for the renders: a point z tiles up appears z*COT tiles higher. */
const COT = 1 / Math.tan((42 * Math.PI) / 180);

function artFor(map: WorldMap): Art | null {
  if (map.art === "london")
    return {
      base: "/world/london-base.webp",
      atlas: (i) => `/world/london-props-${i}.webp`,
      offset: LONDON_ART.offset,
      width: LONDON_ART.width,
      height: LONDON_ART.height,
      props: LONDON_ART.props as Prop[],
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

export const ArtScenery = memo(function ArtScenery({ map }: { map: WorldMap }) {
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
      {map.art === "london" && <LondonSigns props={art.props} />}
      {map.art === "london" && <LondonLife />}
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

/** Company logos on the HQs, station name boards and the plaque on your house. */
function LondonSigns({ props }: { props: Prop[] }) {
  const L = buildLondon();
  const byId = new Map(props.map((p) => [p.id, p]));
  return (
    <>
      {L.things.map((t) => {
        if (t.kind === "building" && t.companyId) {
          const p = byId.get(t.id);
          if (!p) return null;
          const front = (t.y + t.h) * TILE;
          const logo = logoFor(t.companyId);
          return (
            <div key={t.id} aria-hidden className="pointer-events-none absolute" style={{ left: 0, top: 0, zIndex: p.z + 1 }}>
              {logo && (
                <span className="absolute" style={{ left: (t.x + t.w / 2) * TILE - 18, top: p.y + 6 }}>
                  <CompanyLogo id={t.companyId} size={36} className="drop-shadow-[0_2px_0_rgba(27,22,34,0.6)]" />
                </span>
              )}
              <span
                className="absolute rounded-sm bg-[#13203a]/85 px-1.5 text-[9px] leading-4 font-black whitespace-nowrap text-white"
                style={{ left: (t.x + t.w / 2) * TILE, top: front - 1.55 * COT * TILE, transform: "translateX(-50%)" }}
              >
                {t.label}
              </span>
            </div>
          );
        }
        if (t.kind === "station") {
          const p = byId.get(t.id);
          if (!p) return null;
          const front = (t.y + t.h) * TILE;
          return (
            <div key={t.id} aria-hidden className="pointer-events-none absolute" style={{ left: 0, top: 0, zIndex: p.z + 1 }}>
              <span
                className="absolute flex items-center gap-1 text-[9px] leading-4 font-black tracking-wide whitespace-nowrap text-white uppercase"
                style={{ left: (t.x + t.w / 2) * TILE, top: front - 2.3 * COT * TILE, transform: "translateX(-50%)" }}
              >
                {t.name}
              </span>
              <span className="absolute" style={{ left: (t.x + t.w + 0.35) * TILE - 12, top: front + 0.3 * TILE - 2.7 * COT * TILE - 12 }}>
                <TubeBadge size={24} />
              </span>
            </div>
          );
        }
        if (t.kind === "building" && t.id === "my-house") {
          const p = byId.get(t.id);
          return (
            <span
              key={t.id}
              aria-hidden
              className="pointer-events-none absolute rounded-full bg-[#f2d9a6] px-2 text-[10px] leading-5 font-black whitespace-nowrap text-[#0d1726] shadow-[0_2px_0_0_rgba(0,0,0,0.4)]"
              style={{ left: (t.x + t.w / 2) * TILE, top: (p?.y ?? t.y * TILE) - 6, transform: "translateX(-50%)", zIndex: (p?.z ?? 0) + 1 }}
            >
              Your house
            </span>
          );
        }
        return null;
      })}
    </>
  );
}

type Mover = keyof typeof MOVERS;
const M = MOVERS as Record<string, { frames: number; w: number; h: number; ax: number; ay: number }>;

/** The London Eye turning, buses and cabs doing their rounds, boats on the Thames. */
type VehicleKind = "bus" | "cab" | "boat" | "sedan" | "van" | "suv" | "police" | "ambulance" | "delivery" | "hatchback-sports";

// Everyone on a route keeps the same speed so nobody drives through anybody.
/** Blinds on the buses: the Superloop and the BL1. */
export const BUS_ROUTE_CODES = ["SL6", "BL1", "SL8"];
const ROUTE_SPEED = [2.6, 2.8, 2.5];
const TRAFFIC: { kind: VehicleKind; route: number; at: number }[] = [
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

function LondonLife() {
  const L = buildLondon();
  const eye = L.things.find((t): t is Extract<typeof t, { kind: "landmark" }> => t.kind === "landmark" && t.name === "eye");
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const people = useRef<(HTMLDivElement | null)[]>([]);
  const vehicles = useRef(TRAFFIC.map((v) => ({ ...v, speed: v.route < 0 ? 1.4 + v.at : ROUTE_SPEED[v.route] })));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paths = [...L.routes, L.river];
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
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const secs = (now - start) / 1000;
      vehicles.current.forEach((v, i) => {
        const el = els.current[i];
        if (!el) return;
        const pi = v.route < 0 ? paths.length - 1 : v.route;
        const back = v.kind === "boat" && i % 2 === 1;
        const p = pointAt(pi, v.at * lengths[pi] + (reduce ? 0 : secs * v.speed), back);
        const dir = v.kind === "boat" ? (p.dx >= 0 ? "E" : "W") : Math.abs(p.dx) > Math.abs(p.dy) ? (p.dx > 0 ? "E" : "W") : p.dy > 0 ? "S" : "N";
        const sprite = `${v.kind}-${dir}` as Mover;
        const m = M[sprite];
        if (!m) return;
        // Drive on the left, like London.
        const side = v.kind === "boat" ? 0 : 0.5;
        const ox = dir === "N" ? -side : dir === "S" ? side : 0;
        const oy = dir === "E" ? side : dir === "W" ? -side : 0;
        const x = (p.x + ox) * TILE;
        const y = (p.y + oy) * TILE;
        if (el.dataset.sprite !== sprite) {
          el.dataset.sprite = sprite;
          el.style.backgroundImage = `url(/world/movers/${sprite}.webp)`;
          el.style.width = `${m.w}px`;
          el.style.height = `${m.h}px`;
        }
        el.style.transform = `translate3d(${Math.round(x - m.ax)}px, ${Math.round(y - m.ay)}px, 0)`;
        el.style.zIndex = String(Math.round(y));
      });
      NPCS.forEach((n, i) => {
        const el = people.current[i];
        if (!el) return;
        const p = pointAt(n.route, n.at * lengths[n.route] + (reduce ? 0 : secs * n.speed), n.back);
        const len = Math.hypot(p.dx, p.dy) || 1;
        // Step off the road onto the pavement (left of travel for some, right for others).
        const x = (p.x + (-p.dy / len) * n.side) * TILE;
        const y = (p.y + (p.dx / len) * n.side) * TILE;
        el.style.transform = `translate3d(${Math.round(x - 20)}px, ${Math.round(y - 46)}px, 0)`;
        el.style.zIndex = String(Math.round(y));
        const ang = Math.atan2(p.dx, -p.dy);
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
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [L]);

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
      {vehicles.current.map((v, i) => (
        <div
          key={i}
          aria-hidden
          ref={(el) => {
            els.current[i] = el;
          }}
          className="pointer-events-none absolute top-0 left-0"
        >
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
