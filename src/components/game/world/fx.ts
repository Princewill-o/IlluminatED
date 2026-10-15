"use client";

import { treeTiles, waterTiles, lightsFor } from "./tiles";

import { TILE, type WorldMap, hash } from "@/game/core/world";

/**
 * The "alive" layer drawn every frame over the world: drifting cloud shadows,
 * fountain sparkle, falling leaves, footstep puffs, and UK-time day/dusk/night
 * lighting with pixel-stepped light pools (flat rings, no gradients).
 */
export type Phase = "day" | "dusk" | "night";

/** Day, dusk or night right now in the UK. */
export function ukPhase(date = new Date()): Phase {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(date));
  if (hour >= 20 || hour < 6) return "night";
  if (hour >= 18 || hour < 7) return "dusk";
  return "day";
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  spin: number;
}
interface Puff {
  x: number;
  y: number;
  life: number;
}

export interface Fx {
  map: WorldMap;
  outdoor: boolean;
  lights: { x: number; y: number; r: number }[];
  water: { x: number; y: number }[];
  trees: { x: number; y: number }[];
  clouds: { x: number; y: number; rx: number; ry: number; v: number }[];
  leaves: Leaf[];
  puffs: Puff[];
  lastPuff: number;
  lastLeaf: number;
}

export function createFx(map: WorldMap): Fx {
  const outdoor = map.kind !== "office";
  return {
    map,
    outdoor,
    lights: lightsFor(map),
    water: waterTiles(map),
    trees: treeTiles(map),
    clouds: outdoor
      ? Array.from({ length: Math.ceil(map.width / 700) + 2 }, (_, i) => ({
          x: hash(i, 1, 40) * map.width,
          y: hash(i, 2, 41) * map.height,
          rx: 140 + hash(i, 3, 42) * 120,
          ry: 60 + hash(i, 4, 43) * 40,
          v: 8 + hash(i, 5, 44) * 10,
        }))
      : [],
    leaves: [],
    puffs: [],
    lastPuff: 0,
    lastLeaf: 0,
  };
}

const inView = (x: number, y: number, cam: { x: number; y: number }, vw: number, vh: number, pad = 60) =>
  x > cam.x - pad && x < cam.x + vw + pad && y > cam.y - pad && y < cam.y + vh + pad;

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFx(
  ctx: CanvasRenderingContext2D,
  fx: Fx,
  cam: { x: number; y: number },
  vw: number,
  vh: number,
  now: number,
  dt: number,
  me: { x: number; y: number; walking: boolean },
  phase: Phase,
  reducedMotion: boolean,
) {
  ctx.clearRect(0, 0, vw, vh);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  if (!reducedMotion) {
    // Cloud shadows drifting east.
    ctx.fillStyle = "rgba(30, 25, 60, 0.07)";
    for (const c of fx.clouds) {
      c.x += c.v * dt;
      if (c.x - c.rx > fx.map.width) c.x = -c.rx;
      if (!inView(c.x, c.y, cam, vw, vh, c.rx)) continue;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + c.rx * 0.5, c.y - c.ry * 0.4, c.rx * 0.6, c.ry * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fountain sparkle.
    const tick = Math.floor(now / 160);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    for (const w of fx.water) {
      const x = w.x * TILE;
      const y = w.y * TILE;
      if (!inView(x, y, cam, vw, vh)) continue;
      for (let i = 0; i < 2; i++) {
        const sx = 8 + Math.floor(hash(w.x, w.y, tick * 3 + i) * 16);
        const sy = 8 + Math.floor(hash(w.y, w.x, tick * 5 + i) * 16);
        ctx.fillRect(x + sx, y + sy, 2, 2);
      }
    }

    // Falling leaves near trees on screen.
    if (fx.outdoor && now - fx.lastLeaf > 900 && fx.leaves.length < 24) {
      const visible = fx.trees.filter((t) => inView(t.x * TILE, t.y * TILE, cam, vw, vh, 0));
      if (visible.length) {
        const t = visible[Math.floor(Math.random() * visible.length)];
        fx.leaves.push({
          x: t.x * TILE + 8 + Math.random() * 16,
          y: t.y * TILE + 4,
          vx: 6 + Math.random() * 10,
          vy: 14 + Math.random() * 10,
          life: 3 + Math.random() * 2,
          color: Math.random() > 0.6 ? "#ffb26b" : "#74cf8c",
          spin: Math.random() * 6,
        });
      }
      fx.lastLeaf = now;
    }
    for (const l of fx.leaves) {
      l.life -= dt;
      l.spin += dt * 3;
      l.x += (l.vx + Math.sin(l.spin) * 12) * dt;
      l.y += l.vy * dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, l.life));
      ctx.fillStyle = l.color;
      ctx.fillRect(Math.round(l.x), Math.round(l.y), 3, 2);
    }
    ctx.globalAlpha = 1;
    fx.leaves = fx.leaves.filter((l) => l.life > 0);

    // Footstep puffs.
    if (me.walking && now - fx.lastPuff > 170) {
      fx.puffs.push({ x: me.x + (Math.random() * 6 - 3), y: me.y + 6, life: 0.45 });
      fx.lastPuff = now;
    }
    for (const p of fx.puffs) {
      p.life -= dt;
      const k = Math.max(0, p.life / 0.45);
      ctx.fillStyle = fx.outdoor ? `rgba(255, 255, 255, ${0.55 * k})` : `rgba(120, 110, 150, ${0.25 * k})`;
      ring(ctx, p.x, p.y, 3 + (1 - k) * 5);
    }
    fx.puffs = fx.puffs.filter((p) => p.life > 0);
  }
  ctx.restore();

  // Time of day (outdoors). Light pools are cut out of the darkness in flat steps.
  if (fx.outdoor && phase !== "day") {
    ctx.save();
    ctx.fillStyle = phase === "night" ? "rgba(14, 12, 48, 0.56)" : "rgba(60, 20, 70, 0.18)";
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = "destination-out";
    const pools = [...fx.lights, { x: me.x, y: me.y - 10, r: 56 }];
    for (const l of pools) {
      const x = l.x - cam.x;
      const y = l.y - cam.y;
      if (x < -l.r || y < -l.r || x > vw + l.r || y > vh + l.r) continue;
      for (const [f, a] of [
        [1, 0.16],
        [0.68, 0.24],
        [0.38, 0.32],
      ] as const) {
        ctx.fillStyle = `rgba(0, 0, 0, ${a})`;
        ring(ctx, x, y, l.r * f);
      }
    }
    // Warm sodium glow on top, in the same flat steps.
    ctx.globalCompositeOperation = "source-over";
    for (const l of fx.lights) {
      const x = l.x - cam.x;
      const y = l.y - cam.y;
      if (x < -l.r || y < -l.r || x > vw + l.r || y > vh + l.r) continue;
      for (const [f, a] of [
        [1, phase === "night" ? 0.08 : 0.03],
        [0.68, phase === "night" ? 0.1 : 0.035],
        [0.38, phase === "night" ? 0.13 : 0.045],
      ] as const) {
        ctx.fillStyle = `rgba(255, 186, 92, ${a})`;
        ring(ctx, x, y, l.r * f);
      }
    }
    if (phase === "dusk") {
      ctx.fillStyle = "rgba(255, 140, 80, 0.10)";
      ctx.fillRect(0, 0, vw, vh);
    }
    ctx.restore();
  }
}
