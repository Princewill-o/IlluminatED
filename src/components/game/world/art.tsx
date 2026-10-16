"use client";

import { memo, useEffect, useRef } from "react";

import { CompanyLogo } from "../company-logo";
import { TubeBadge } from "./tube-map";
import FURNITURE_ART from "../../../../public/world/furniture.json";
import HOME_ART from "../../../../public/world/home.json";
import LONDON_ART from "../../../../public/world/london.json";
import MOVERS from "../../../../public/world/movers.json";

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
                className="absolute rounded-sm bg-[#1b1622]/85 px-1.5 text-[9px] leading-4 font-black whitespace-nowrap text-white"
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
              className="pointer-events-none absolute rounded-full bg-[#c6f36b] px-2 text-[10px] leading-5 font-black whitespace-nowrap text-[#0b0910] shadow-[0_2px_0_0_rgba(0,0,0,0.4)]"
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
function LondonLife() {
  const L = buildLondon();
  const eye = L.things.find((t): t is Extract<typeof t, { kind: "landmark" }> => t.kind === "landmark" && t.name === "eye");
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const vehicles = useRef(
    [
      { kind: "bus", route: 0, at: 0.0, speed: 2.6 },
      { kind: "bus", route: 2, at: 0.5, speed: 2.4 },
      { kind: "cab", route: 0, at: 0.35, speed: 3.6 },
      { kind: "cab", route: 1, at: 0.1, speed: 3.4 },
      { kind: "cab", route: 2, at: 0.8, speed: 3.8 },
      { kind: "bus", route: 1, at: 0.6, speed: 2.5 },
      { kind: "boat", route: -1, at: 0.0, speed: 1.6 },
      { kind: "boat", route: -1, at: 0.55, speed: 1.3 },
    ] as { kind: "bus" | "cab" | "boat"; route: number; at: number; speed: number }[],
  );

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
      {vehicles.current.map((v, i) => (
        <div
          key={i}
          aria-hidden
          ref={(el) => {
            els.current[i] = el;
          }}
          className="pointer-events-none absolute top-0 left-0"
        />
      ))}
    </>
  );
}
