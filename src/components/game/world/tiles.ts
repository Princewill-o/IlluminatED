"use client";

import { logoFor } from "@/game/core/logos";
import { SOLID, type Structure, TILE, type WorldMap, hash, tileAt } from "@/game/core/world";

/**
 * IlluminatED's own clean pixel tile set, painted with flat rectangles (no
 * image files, no gradients). Soft lavender floors, white desks, glass meeting
 * rooms, purple accents and crisp greens outside: a modern take on the
 * virtual-office look. Drawn once per map into a canvas under the players.
 */
type Ctx = CanvasRenderingContext2D;

const C = {
  floor: "#ebe7f4",
  floorLine: "#dfd9ec",
  floorHi: "#f3f0fa",
  carpet: "#d3c9f3",
  carpetDot: "#c7bbef",
  rug: "#c9b8ff",
  rugEdge: "#a98bff",
  rugLine: "#ddd2ff",
  kitchenA: "#f6f3ee",
  kitchenB: "#ece6dc",
  wallTop: "#4a4361",
  wallFace: "#f6f4fb",
  wallBase: "#d6cfe6",
  glass: "#bfe4fb",
  glassHi: "#e6f6ff",
  frame: "#9db7cf",
  white: "#ffffff",
  deskEdge: "#d9d3e6",
  shadow: "#d4cde3",
  ink: "#2b2740",
  screen: "#6bc6ff",
  screenHi: "#a7dcff",
  seat: "#3f3955",
  seatBack: "#2f2a42",
  oak: "#ead7b8",
  oakEdge: "#cdb48a",
  oakFront: "#d8c19c",
  purple: "#2b5fd9",
  purpleDark: "#5b33d6",
  purpleLight: "#8fb4ff",
  lime: "#f2d9a6",
  grass: "#a3d98a",
  grassDark: "#93cc7a",
  grassLight: "#b4e39c",
  path: "#efe7d8",
  pathLine: "#e3d8c4",
  pave: "#dcd9e5",
  paveLine: "#cdc9d9",
  curb: "#b9b4c8",
  road: "#5d5873",
  roadDot: "#575269",
  leaf: "#4caf6a",
  leafDark: "#3d9a5b",
  leafHi: "#74cf8c",
  trunk: "#8a5a3c",
  water: "#6bc6ff",
  waterHi: "#9fdcff",
};

const BOOKS = ["#ff7a6b", "#ffd166", "#6bc6ff", "#5fd3a5", "#8fb4ff", "#ff8fd1", "#f3f6fb"];

const WALLISH = new Set(["#", "W", "G"]);
const RUGGY = new Set(["l", "s", "v", "o"]);

/** The floor that sits under a furniture tile (so furniture blends into its room). */
function under(map: WorldMap, tx: number, ty: number): string {
  const ch = tileAt(map, tx, ty);
  if (!SOLID.has(ch) && ch !== "c") return ch;
  const counts: Record<string, number> = {};
  for (let r = 1; r <= 3; r++)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = tileAt(map, tx + dx * r, ty + dy * r);
      if (!SOLID.has(n) && n !== "c" && n !== "e") counts[n] = (counts[n] ?? 0) + 4 - r;
    }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (map.kind === "office") return best === "m" || best === "l" || best === "," ? best : ".";
  return best ?? "g";
}

function painter(ctx: Ctx, X: number, Y: number) {
  return (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(X + x, Y + y, w, h);
  };
}

function ground(ctx: Ctx, map: WorldMap, ch: string, tx: number, ty: number) {
  const X = tx * TILE;
  const Y = ty * TILE;
  const R = painter(ctx, X, Y);
  const same = (dx: number, dy: number, set: (c: string) => boolean) => set(tileAt(map, tx + dx, ty + dy));
  switch (ch) {
    case ".":
    case "c":
      R(0, 0, 32, 32, C.floor);
      R(0, 0, 32, 1, C.floorHi);
      R(31, 0, 1, 32, C.floorLine);
      R(0, 31, 32, 1, C.floorLine);
      break;
    case "m":
      R(0, 0, 32, 32, C.carpet);
      for (let i = 0; i < 4; i++) R(Math.floor(hash(tx, ty, i) * 28) + 2, Math.floor(hash(ty, tx, i) * 28) + 2, 2, 2, C.carpetDot);
      break;
    case "l": {
      const rug = (c: string) => RUGGY.has(c) && under(map, tx, ty) === "l";
      R(0, 0, 32, 32, C.rug);
      if (!same(0, -1, (c) => c === "l" || rug(c))) { R(0, 0, 32, 3, C.rugEdge); R(0, 5, 32, 1, C.rugLine); }
      if (!same(0, 1, (c) => c === "l" || rug(c))) { R(0, 29, 32, 3, C.rugEdge); R(0, 26, 32, 1, C.rugLine); }
      if (!same(-1, 0, (c) => c === "l" || rug(c))) { R(0, 0, 3, 32, C.rugEdge); R(5, 0, 1, 32, C.rugLine); }
      if (!same(1, 0, (c) => c === "l" || rug(c))) { R(29, 0, 3, 32, C.rugEdge); R(26, 0, 1, 32, C.rugLine); }
      break;
    }
    case ",":
      R(0, 0, 32, 32, C.kitchenA);
      R(0, 0, 16, 16, C.kitchenB);
      R(16, 16, 16, 16, C.kitchenB);
      break;
    case "e":
      R(0, 0, 32, 32, C.wallTop);
      for (let i = 2; i < 32; i += 5) R(i, 3, 2, 26, "#5d5577");
      break;
    case "g":
    case "f":
      R(0, 0, 32, 32, C.grass);
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(hash(tx, ty, i) * 30);
        const y = Math.floor(hash(ty, tx, i + 9) * 30);
        R(x, y, 2, 2, i % 2 ? C.grassDark : C.grassLight);
      }
      if (ch === "f")
        for (let i = 0; i < 3; i++) {
          const x = 4 + Math.floor(hash(tx, ty, i + 20) * 22);
          const y = 4 + Math.floor(hash(ty, tx, i + 30) * 22);
          const col = ["#ff8fd1", "#ffd166", "#ffffff"][i];
          R(x - 2, y, 6, 2, col);
          R(x, y - 2, 2, 6, col);
          R(x, y, 2, 2, "#ff7a6b");
        }
      break;
    case "_": {
      R(0, 0, 32, 32, C.path);
      const off = ty % 2 ? 8 : 0;
      R(0, 15, 32, 1, C.pathLine);
      R(0, 31, 32, 1, C.pathLine);
      R((off + 0) % 32, 0, 1, 15, C.pathLine);
      R((off + 16) % 32, 0, 1, 15, C.pathLine);
      R((off + 8) % 32, 16, 1, 15, C.pathLine);
      R((off + 24) % 32, 16, 1, 15, C.pathLine);
      break;
    }
    case "-":
      R(0, 0, 32, 32, C.pave);
      R(15, 0, 1, 32, C.paveLine);
      R(31, 0, 1, 32, C.paveLine);
      R(0, 15, 32, 1, C.paveLine);
      R(0, 31, 32, 1, C.paveLine);
      if (tileAt(map, tx, ty + 1) === "=" || tileAt(map, tx, ty + 1) === ":") R(0, 28, 32, 4, C.curb);
      if (tileAt(map, tx, ty - 1) === "=" || tileAt(map, tx, ty - 1) === ":") R(0, 0, 32, 4, C.curb);
      break;
    case "=":
    case ":":
      R(0, 0, 32, 32, C.road);
      for (let i = 0; i < 5; i++) R(Math.floor(hash(tx, ty, i) * 30), Math.floor(hash(ty, tx, i) * 30), 2, 2, C.roadDot);
      if (ch === ":" && tx % 2 === 0) R(4, 30, 24, 4, "#f3f6fb");
      break;
    default:
      R(0, 0, 32, 32, map.kind === "office" ? C.floor : C.grass);
  }
}

function object(ctx: Ctx, map: WorldMap, ch: string, tx: number, ty: number) {
  const X = tx * TILE;
  const Y = ty * TILE;
  const R = painter(ctx, X, Y);
  const at = (dx: number, dy: number) => tileAt(map, tx + dx, ty + dy);
  const L = at(-1, 0) === ch;
  const Rt = at(1, 0) === ch;
  const Up = at(0, -1) === ch;
  const Dn = at(0, 1) === ch;
  switch (ch) {
    case "#":
    case "W": {
      const below = at(0, 1);
      if (WALLISH.has(below) || ty === map.rows - 1) {
        R(0, 0, 32, 32, C.wallTop);
        if (!WALLISH.has(at(1, 0))) R(30, 0, 2, 32, "#5d5577");
        if (!WALLISH.has(at(-1, 0))) R(0, 0, 2, 32, "#5d5577");
        break;
      }
      R(0, 0, 32, 10, C.wallTop);
      R(0, 10, 32, 19, C.wallFace);
      R(0, 29, 32, 3, C.wallBase);
      if (ch === "W") {
        R(4, 12, 24, 15, C.white);
        R(6, 14, 20, 11, C.glass);
        R(15, 14, 2, 11, C.white);
        R(8, 16, 2, 2, C.glassHi);
        R(10, 18, 2, 2, C.glassHi);
        R(20, 16, 2, 2, C.glassHi);
      }
      break;
    }
    case "G": {
      const vertical = WALLISH.has(at(0, -1)) || WALLISH.has(at(0, 1));
      const horizontal = WALLISH.has(at(-1, 0)) || WALLISH.has(at(1, 0));
      if (vertical && !horizontal) {
        R(12, 0, 8, 32, C.glass);
        R(12, 0, 2, 32, C.frame);
        R(18, 0, 2, 32, C.frame);
        R(14, 6, 2, 6, C.glassHi);
      } else {
        R(0, 10, 32, 12, C.glass);
        R(0, 8, 32, 2, C.frame);
        R(0, 22, 32, 2, C.frame);
        R(4, 12, 6, 2, C.glassHi);
        if (vertical) { R(12, 0, 8, 32, C.glass); R(12, 0, 2, 32, C.frame); R(18, 0, 2, 32, C.frame); }
      }
      break;
    }
    case "d": {
      R(L ? 0 : 1, 6, 32 - (L ? 0 : 1) - (Rt ? 0 : 1), 19, C.white);
      R(L ? 0 : 1, 25, 32 - (L ? 0 : 1) - (Rt ? 0 : 1), 3, C.deskEdge);
      R(L ? 0 : 2, 28, 32 - (L ? 0 : 2) - (Rt ? 0 : 2), 2, C.shadow);
      R(9, 3, 14, 10, C.ink);
      const screen = hash(tx, ty, 7) > 0.5 ? C.screen : "#8f7cff";
      R(10, 4, 12, 7, screen);
      R(11, 5, 6, 1, C.screenHi);
      R(11, 7, 8, 1, C.screenHi);
      R(15, 13, 2, 3, C.ink);
      R(10, 17, 12, 4, "#d4cee0");
      R(24, 17, 3, 4, "#d4cee0");
      if (hash(tx, ty, 3) > 0.6) R(3, 9, 4, 5, hash(tx, ty, 4) > 0.5 ? "#ff7a6b" : "#ffd166");
      break;
    }
    case "c": {
      const deskBelow = "dt".includes(at(0, 1));
      R(9, 10, 14, 13, C.seat);
      R(10, 9, 12, 15, C.seat);
      if (deskBelow) R(9, 5, 14, 5, C.seatBack);
      else R(9, 23, 14, 5, C.seatBack);
      R(15, 24, 2, 3, C.seatBack);
      break;
    }
    case "t":
    case "o": {
      R(L ? 0 : 2, Up ? 0 : 3, 32 - (L ? 0 : 2) - (Rt ? 0 : 2), 32 - (Up ? 0 : 3) - (Dn ? 0 : 7), C.oak);
      if (!Up) R(L ? 0 : 2, 3, 32 - (L ? 0 : 2) - (Rt ? 0 : 2), 2, C.oakEdge);
      if (!L) R(2, Up ? 0 : 3, 2, 32, C.oakEdge);
      if (!Rt) R(28, Up ? 0 : 3, 2, 32, C.oakEdge);
      if (!Dn) R(L ? 0 : 2, 25, 32 - (L ? 0 : 2) - (Rt ? 0 : 2), 4, C.oakFront);
      if (!Dn) R(L ? 0 : 3, 29, 32 - (L ? 0 : 3) - (Rt ? 0 : 3), 2, C.shadow);
      if (hash(tx, ty, 11) > 0.7) R(10, 10, 9, 7, C.white);
      if (ch === "o" && hash(tx, ty, 12) > 0.5) { R(18, 10, 5, 6, C.white); R(19, 11, 3, 3, "#8a5a3c"); }
      break;
    }
    case "s": {
      const vertical = Up || Dn;
      if (vertical) {
        R(4, 0, 24, 32, C.purple);
        R(4, 0, 7, 32, C.rugEdge);
        R(12, Up ? 0 : 3, 14, 32 - (Up ? 0 : 3) - (Dn ? 0 : 3), "#8d63ff");
        if (!Up) R(4, 0, 24, 4, C.rugEdge);
        if (!Dn) R(4, 28, 24, 4, C.rugEdge);
        R(12, 31, 14, 1, C.purple);
      } else {
        R(0, 6, 32, 22, C.purple);
        R(0, 6, 32, 7, C.rugEdge);
        R(L ? 0 : 5, 14, 32 - (L ? 0 : 5) - (Rt ? 0 : 5), 12, "#8d63ff");
        R(31, 14, 1, 12, C.purple);
        if (!L) R(0, 6, 5, 22, C.rugEdge);
        if (!Rt) R(27, 6, 5, 22, C.rugEdge);
      }
      break;
    }
    case "v":
      R(L ? 0 : 2, 2, 32 - (L ? 0 : 2) - (Rt ? 0 : 2), 18, "#1f1b2e");
      R(L ? 0 : 4, 4, 32 - (L ? 0 : 4) - (Rt ? 0 : 4), 14, "#3d3560");
      R(L ? 0 : 6, 6, 8, 2, "#5a5185");
      if (!L || !Rt) R(13, 20, 6, 4, "#1f1b2e");
      break;
    case "k":
      if (Up || Dn) {
        R(4, 0, 22, 32, C.white);
        R(26, 0, 4, 32, C.deskEdge);
        R(4, 15, 22, 1, C.deskEdge);
        if (hash(tx, ty, 5) > 0.7) { R(8, 8, 14, 16, "#c9d6e3"); R(10, 4, 3, 3, "#9aa3b5"); }
        else if (hash(tx, ty, 5) > 0.45) { R(8, 6, 8, 8, C.ink); R(8, 18, 8, 8, C.ink); }
        break;
      }
      R(0, 2, 32, 20, C.white);
      R(0, 22, 32, 8, C.deskEdge);
      R(0, 30, 32, 2, C.shadow);
      R(15, 23, 2, 6, C.white);
      if (hash(tx, ty, 5) > 0.75) { R(8, 6, 16, 11, "#c9d6e3"); R(15, 4, 2, 4, "#9aa3b5"); }
      else if (hash(tx, ty, 5) > 0.5) { R(6, 6, 8, 8, C.ink); R(18, 6, 8, 8, C.ink); }
      else if (hash(tx, ty, 5) > 0.3) { R(10, 7, 10, 10, "#ff7a6b"); R(12, 5, 6, 3, C.white); }
      break;
    case "F":
      R(3, 0, 26, 30, "#eeeaf6");
      R(3, 12, 26, 1, "#cfc8de");
      R(24, 4, 2, 6, "#b9b2cc");
      R(24, 16, 2, 10, "#b9b2cc");
      R(3, 30, 26, 2, C.shadow);
      break;
    case "A":
    case "r": {
      const top = ch === "A" ? C.purple : C.white;
      const front = ch === "A" ? C.purpleDark : map.accent;
      R(L ? 0 : 1, 4, 32 - (L ? 0 : 1) - (Rt ? 0 : 1), 18, top);
      R(L ? 0 : 1, 22, 32 - (L ? 0 : 1) - (Rt ? 0 : 1), 8, front);
      R(L ? 0 : 1, 20, 32 - (L ? 0 : 1) - (Rt ? 0 : 1), 2, ch === "A" ? C.lime : map.accent);
      R(L ? 0 : 2, 30, 32 - (L ? 0 : 2) - (Rt ? 0 : 2), 2, C.shadow);
      if (ch === "A" && hash(tx, ty, 2) > 0.5) { R(10, 7, 12, 8, C.ink); R(11, 8, 10, 5, C.screen); }
      if (ch === "r" && hash(tx, ty, 2) > 0.6) { R(12, 8, 8, 6, C.ink); R(13, 9, 6, 3, C.screen); }
      break;
    }
    case "b":
      R(1, 0, 30, 31, "#5a4a7a");
      for (const sy of [3, 12, 21]) {
        R(3, sy + 7, 26, 2, "#463962");
        let x = 4;
        for (let i = 0; x < 27; i++) {
          const w = 2 + Math.floor(hash(tx, ty + sy, i) * 3);
          R(x, sy + 1 + Math.floor(hash(tx, sy, i) * 2), w, 6 - Math.floor(hash(tx, sy, i) * 2), BOOKS[Math.floor(hash(ty, tx + sy, i) * BOOKS.length)]);
          x += w + 1;
        }
      }
      break;
    case "p":
      R(9, 28, 14, 3, C.shadow);
      R(10, 20, 12, 9, C.white);
      R(9, 19, 14, 3, C.deskEdge);
      R(8, 6, 16, 14, C.leaf);
      R(11, 2, 10, 8, "#5fc27d");
      R(4, 11, 8, 8, C.leafDark);
      R(20, 11, 8, 8, C.leafDark);
      R(12, 4, 3, 3, C.leafHi);
      R(18, 9, 2, 2, C.leafHi);
      break;
    case "T":
      R(13, 18, 6, 12, C.trunk);
      R(13, 18, 2, 12, "#73492f");
      break;
    case "B":
      R(2, 6, 28, 4, "#b07f52");
      R(2, 11, 28, 4, "#c99a6b");
      R(2, 16, 28, 4, "#c99a6b");
      R(4, 20, 3, 6, "#6b4b34");
      R(25, 20, 3, 6, "#6b4b34");
      break;
    case "L":
      R(13, 28, 8, 3, C.curb);
      R(15, 6, 3, 23, C.wallTop);
      R(10, 2, 13, 6, C.wallTop);
      R(12, 4, 9, 3, "#ffd166");
      break;
    case "w": {
      R(0, 0, 32, 32, C.water);
      if (!Up) { R(0, 0, 32, 5, C.pave); R(0, 5, 32, 2, C.curb); }
      if (!Dn) { R(0, 27, 32, 5, C.pave); R(0, 25, 32, 2, C.curb); }
      if (!L) { R(0, 0, 5, 32, C.pave); R(5, 0, 2, 32, C.curb); }
      if (!Rt) { R(27, 0, 5, 32, C.pave); R(25, 0, 2, 32, C.curb); }
      R(10 + Math.floor(hash(tx, ty, 1) * 8), 12, 6, 2, C.waterHi);
      if (!L && !Up) { R(26, 26, 10, 10, C.white); R(28, 22, 6, 6, C.waterHi); }
      break;
    }
  }
}

/** Trees get their canopies in a second pass so they overlap neighbouring tiles nicely. */
function canopy(ctx: Ctx, tx: number, ty: number) {
  const cx = tx * TILE + 16;
  const cy = ty * TILE + 10;
  const big = hash(tx, ty, 13) > 0.5 ? 2 : 0;
  ctx.fillStyle = "rgba(40, 70, 40, 0.18)";
  ctx.beginPath();
  ctx.ellipse(cx + 3, ty * TILE + 29, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const blob = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(cx, cy + 3, 17 + big, C.leafDark);
  blob(cx - 1, cy, 15 + big, C.leaf);
  blob(cx - 5, cy - 5, 6, C.leafHi);
  if (hash(tx, ty, 14) > 0.7) {
    blob(cx + 6, cy + 2, 2, "#ff7a6b");
    blob(cx - 6, cy + 6, 2, "#ff7a6b");
  }
}

function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

/** Draws a parody logo badge (or a letter badge for employers without one). */
export function drawBadge(ctx: Ctx, s: Pick<Structure, "companyId" | "label" | "accent">, x: number, y: number, size: number) {
  const logo = s.companyId ? logoFor(s.companyId) : null;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.fillStyle = logo?.bg ?? s.accent;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, 64, 64, 16);
  else ctx.rect(0, 0, 64, 64);
  ctx.fill();
  if (logo) {
    for (const shape of logo.shapes) {
      if (shape.fill === "none") continue;
      ctx.fillStyle = shape.fill;
      ctx.fill(new Path2D(shape.d));
    }
  } else {
    ctx.fillStyle = "#0d1726";
    ctx.font = "900 38px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label.slice(0, 1).toUpperCase(), 32, 35);
  }
  ctx.restore();
}

/**
 * A modern two-storey building seen in three-quarter view: a flat roof with
 * parapet, solar panels, plants and a big painted logo; a facade with glass
 * floors (lit at night), a branded entrance canopy, planters and a soft shadow.
 */
function drawStructure(ctx: Ctx, s: Structure, night: boolean) {
  const X = s.x * TILE;
  const Y = s.y * TILE;
  const W = s.w * TILE;
  const H = s.h * TILE;
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(X + x, Y + y, w, h);
  };
  const FH = 96;
  const down = s.door === "bottom";
  const facadeY = down ? H - FH : 0;
  const roofY = down ? 0 : FH;
  const RH = H - FH;

  // Soft shadow to the south-east.
  ctx.fillStyle = "rgba(43, 39, 64, 0.22)";
  ctx.beginPath();
  ctx.moveTo(X + 10, Y + H);
  ctx.lineTo(X + W, Y + H);
  ctx.lineTo(X + W + 10, Y + H + 10);
  ctx.lineTo(X + 20, Y + H + 10);
  ctx.closePath();
  ctx.fill();
  R(W, 10, 10, H, "rgba(43, 39, 64, 0.14)");

  // Roof: light membrane with an accent parapet and the painted logo.
  R(0, roofY, W, RH, "#ebe8f2");
  R(0, roofY, W, 6, s.accent);
  R(0, roofY, 6, RH, s.accent);
  R(W - 6, roofY, 6, RH, s.accent);
  R(0, roofY + RH - 6, W, 6, darken(s.accent, 0.15));
  R(6, roofY + 6, W - 12, 3, "#d9d4e6");
  const badge = Math.min(60, RH - 22);
  drawBadge(ctx, s, X + 16, Y + roofY + Math.max(10, RH / 2 - badge / 2), badge);
  const panelX = W - 112;
  if (panelX > 90)
    for (let i = 0; i < 3; i++) {
      R(panelX + i * 32, roofY + 16, 28, RH - 40, "#34466e");
      for (let j = 0; j < RH - 40; j += 10) R(panelX + i * 32, roofY + 16 + j, 28, 1, "#5a6f9e");
      R(panelX + i * 32 + 13, roofY + 16, 1, RH - 40, "#5a6f9e");
    }
  const ux = 88;
  if (ux + 30 < panelX) {
    R(ux, roofY + 16, 28, 20, "#f7f5fb");
    R(ux, roofY + 36, 28, 4, "#c9c2d8");
    R(ux + 6, roofY + 22, 16, 8, "#cfc8de");
    R(ux, roofY + RH - 28, 40, 10, "#6b4b34");
    for (let i = 0; i < 4; i++) R(ux + 2 + i * 10, roofY + RH - 34, 8, 8, i % 2 ? C.leafDark : C.leaf);
  }

  // Facade.
  R(0, facadeY, W, FH, "#f4f2f9");
  R(0, facadeY, W, 5, "#d9d4e6");
  R(0, facadeY, 7, FH, s.accent);
  R(W - 7, facadeY, 7, FH, s.accent);
  const lit = (i: number) => night && hash(s.x + i, s.y, 21) > 0.35;
  for (let x = 12, i = 0; x + 24 <= W - 12; x += 28, i++) {
    R(x, facadeY + 10, 24, 26, lit(i) ? "#ffe39a" : C.glass);
    R(x, facadeY + 10, 24, 2, "#ffffff");
    if (!lit(i)) R(x + 3, facadeY + 14, 4, 6, C.glassHi);
  }
  R(7, facadeY + 38, W - 14, 12, "#e5e0ef");
  ctx.font = "800 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = darken(s.accent, 0.45);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const name = s.label.length > 26 ? `${s.label.slice(0, 25)}…` : s.label;
  ctx.fillText(name.toUpperCase(), X + W / 2, Y + facadeY + 44.5, W - 24);
  const doorW = 48;
  const doorX = Math.floor(W / 2 - doorW / 2);
  for (let x = 12, i = 10; x + 24 <= W - 12; x += 28, i++) {
    if (x + 24 > doorX - 14 && x < doorX + doorW + 14) continue;
    R(x, facadeY + 56, 24, 30, lit(i) ? "#ffe39a" : C.glass);
    R(x, facadeY + 56, 24, 2, "#ffffff");
  }
  R(doorX, facadeY + 60, doorW, FH - 60, night ? "#ffe39a" : "#9fd2ef");
  R(doorX + doorW / 2 - 1, facadeY + 60, 2, FH - 60, C.wallTop);
  R(doorX - 6, facadeY + 52, doorW + 12, 9, s.accent);
  R(doorX - 6, facadeY + 61, doorW + 12, 2, darken(s.accent, 0.3));
  for (const px of [doorX - 22, doorX + doorW + 8]) {
    R(px, facadeY + FH - 14, 14, 12, "#ffffff");
    R(px - 1, facadeY + FH - 22, 16, 9, C.leaf);
    R(px + 2, facadeY + FH - 25, 6, 5, C.leafHi);
  }
  R(0, facadeY + FH - 3, W, 3, "#cfc8de");
}

export function drawMap(ctx: Ctx, map: WorldMap, night = false) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, map.width, map.height);
  for (let ty = 0; ty < map.rows; ty++)
    for (let tx = 0; tx < map.cols; tx++) {
      const ch = map.tiles[ty][tx];
      ground(ctx, map, SOLID.has(ch) || ch === "c" ? under(map, tx, ty) : ch, tx, ty);
    }
  // Ambient occlusion: a soft shadow along the foot of every wall.
  if (map.kind === "office")
    for (let ty = 1; ty < map.rows; ty++)
      for (let tx = 0; tx < map.cols; tx++)
        if ((map.tiles[ty - 1][tx] === "#" || map.tiles[ty - 1][tx] === "W") && !SOLID.has(map.tiles[ty][tx])) {
          ctx.fillStyle = "rgba(74, 67, 97, 0.12)";
          ctx.fillRect(tx * TILE, ty * TILE, TILE, 6);
        }
  for (let ty = 0; ty < map.rows; ty++)
    for (let tx = 0; tx < map.cols; tx++) {
      const ch = map.tiles[ty][tx];
      if (ch !== "X") object(ctx, map, ch, tx, ty);
    }
  for (const s of map.structures) drawStructure(ctx, s, night);
  if (map.sign) {
    ctx.font = "900 40px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = map.kind === "office" ? "rgba(124, 77, 255, 0.16)" : "rgba(255, 255, 255, 0.55)";
    ctx.fillText(map.sign.text, (map.sign.x + 0.5) * TILE, (map.sign.y + 0.5) * TILE, map.width - 64);
  }
  for (let ty = 0; ty < map.rows; ty++)
    for (let tx = 0; tx < map.cols; tx++) if (map.tiles[ty][tx] === "T") canopy(ctx, tx, ty);
}

/** Light sources for the night overlay (pixels): street lamps and building entrances. */
export function lightsFor(map: WorldMap) {
  const out: { x: number; y: number; r: number }[] = [];
  for (let ty = 0; ty < map.rows; ty++)
    for (let tx = 0; tx < map.cols; tx++) if (map.tiles[ty][tx] === "L") out.push({ x: tx * TILE + 16, y: ty * TILE + 12, r: 78 });
  for (const s of map.structures) {
    const doorY = s.door === "bottom" ? (s.y + s.h) * TILE - 16 : s.y * TILE + 72;
    out.push({ x: (s.x + s.w / 2) * TILE, y: doorY, r: 58 });
  }
  return out;
}

const find = (map: WorldMap, ch: string) => {
  const out: { x: number; y: number }[] = [];
  for (let ty = 0; ty < map.rows; ty++) for (let tx = 0; tx < map.cols; tx++) if (map.tiles[ty][tx] === ch) out.push({ x: tx, y: ty });
  return out;
};
export const waterTiles = (map: WorldMap) => find(map, "w");
export const treeTiles = (map: WorldMap) => find(map, "T");
