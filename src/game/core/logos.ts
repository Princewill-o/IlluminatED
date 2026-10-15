/**
 * Original parody logos for the IlluminatED City companies. Each one is drawn
 * from scratch as a simple flat badge in a 64×64 box (SVG path data), so it can
 * render as SVG in the UI and as Path2D on the world canvas. None of these copy
 * a real brand's mark, colours or shapes: they're jokes about the company
 * names (a paw for a bank run by dogs, a spotty basket for a cow supermarket).
 */
export interface LogoShape {
  d: string;
  fill: string;
}

export interface Logo {
  bg: string;
  shapes: LogoShape[];
}

const INK = "#1b1622";
const W = "#ffffff";

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
const rect = (x: number, y: number, w: number, h: number, r = 0) =>
  r
    ? `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
    : `M${x} ${y}h${w}v${h}h${-w}Z`;

export const LOGOS: Record<string, Logo> = {
  // Goggle: a pair of goggles with a strap.
  goggle: {
    bg: "#6bc6ff",
    shapes: [
      { d: rect(8, 29, 48, 6, 3), fill: INK },
      { d: circle(23, 32, 12), fill: INK },
      { d: circle(41, 32, 12), fill: INK },
      { d: circle(23, 32, 8), fill: W },
      { d: circle(41, 32, 8), fill: W },
      { d: circle(26, 29, 3), fill: "#6bc6ff" },
      { d: circle(44, 29, 3), fill: "#6bc6ff" },
    ],
  },
  // Macrosoft: the universal "turn it off and on again" power symbol.
  macrosoft: {
    bg: "#5fd3a5",
    shapes: [
      { d: "M22 20a16 16 0 1 0 20 0l-4 5a10 10 0 1 1-12 0Z", fill: W },
      { d: rect(29, 11, 6, 22, 3), fill: W },
    ],
  },
  // Barklays: a paw print.
  barklays: {
    bg: "#ffd166",
    shapes: [
      { d: "M32 31c-9 0-15 8-15 14c0 5 4 7 8 6c3-1 5-2 7-2s4 1 7 2c4 1 8-1 8-6c0-6-6-14-15-14Z", fill: INK },
      { d: circle(18, 28, 5), fill: INK },
      { d: circle(26, 19, 5), fill: INK },
      { d: circle(38, 19, 5), fill: INK },
      { d: circle(46, 28, 5), fill: INK },
    ],
  },
  // Tescow: a shopping basket with cow spots.
  tescow: {
    bg: "#ff8fd1",
    shapes: [
      { d: "M20 26a12 12 0 0 1 24 0", fill: "none" },
      { d: rect(18, 15, 4, 14, 2), fill: INK },
      { d: rect(42, 15, 4, 14, 2), fill: INK },
      { d: rect(18, 13, 28, 4, 2), fill: INK },
      { d: "M11 27h42l-5 22h-32Z", fill: W },
      { d: circle(24, 36, 4), fill: INK },
      { d: circle(38, 41, 5), fill: INK },
      { d: circle(31, 33, 2), fill: INK },
    ],
  },
  // St Plaster's: a plaster.
  "st-plasters": {
    bg: "#ff7a6b",
    shapes: [
      { d: "M14 40L40 14a8 8 0 0 1 11 11L25 51a8 8 0 0 1-11-11Z", fill: W },
      { d: rect(26, 26, 12, 12, 2), fill: "#ffd9cf" },
      { d: circle(30, 30, 1.4), fill: "#ff7a6b" },
      { d: circle(34, 34, 1.4), fill: "#ff7a6b" },
      { d: circle(34, 30, 1.4), fill: "#ff7a6b" },
      { d: circle(30, 34, 1.4), fill: "#ff7a6b" },
    ],
  },
  // Tesler Motors: a lightning bolt.
  tesler: {
    bg: "#c6f36b",
    shapes: [{ d: "M36 8L16 36h13l-4 20l21-29h-13Z", fill: INK }],
  },
  // Gregz: a croissant.
  gregz: {
    bg: "#ffb26b",
    shapes: [
      { d: "M10 40c4-14 16-22 22-22s18 8 22 22c-5 0-8-2-10-4c-1 4-4 6-6 6c0-3-3-5-6-5s-6 2-6 5c-2 0-5-2-6-6c-2 2-5 4-10 4Z", fill: W },
      { d: "M26 24l3 14M38 24l-3 14", fill: "none" },
      { d: rect(29, 20, 6, 20, 3), fill: "#ffd9a3" },
    ],
  },
  // Lawz & Order: balanced scales.
  lawz: {
    bg: "#a67fff",
    shapes: [
      { d: rect(30, 12, 4, 38, 2), fill: W },
      { d: rect(14, 18, 36, 4, 2), fill: W },
      { d: rect(22, 50, 20, 4, 2), fill: W },
      { d: "M10 36h16l-8-14Z", fill: W },
      { d: "M38 36h16l-8-14Z", fill: W },
    ],
  },
  // Netflics: a striped popcorn bucket.
  netflics: {
    bg: "#ff7a6b",
    shapes: [
      { d: circle(22, 20, 6), fill: "#ffe8b0" },
      { d: circle(32, 16, 7), fill: "#ffe8b0" },
      { d: circle(42, 20, 6), fill: "#ffe8b0" },
      { d: "M16 24h32l-4 30h-24Z", fill: W },
      { d: "M23 24h5l1 30h-5Z", fill: INK },
      { d: "M36 24h5l-2 30h-5Z", fill: INK },
    ],
  },
  // Bodge & Sons: a hard hat.
  bodge: {
    bg: "#ffd166",
    shapes: [
      { d: "M14 40a18 18 0 0 1 36 0Z", fill: INK },
      { d: rect(10, 40, 44, 6, 3), fill: INK },
      { d: rect(29, 20, 6, 20, 2), fill: "#ffd166" },
    ],
  },
  // Psyke Sports: a stopwatch.
  psyke: {
    bg: "#c6f36b",
    shapes: [
      { d: circle(32, 36, 17), fill: INK },
      { d: circle(32, 36, 12), fill: W },
      { d: rect(28, 12, 8, 6, 2), fill: INK },
      { d: rect(31, 26, 3, 11, 1), fill: INK },
      { d: rect(31, 35, 9, 3, 1), fill: INK },
    ],
  },
  // Tiny Humans Nursery: a stack of letter blocks.
  "tiny-humans": {
    bg: "#ff8fd1",
    shapes: [
      { d: rect(12, 34, 18, 18, 3), fill: "#ffd166" },
      { d: rect(34, 34, 18, 18, 3), fill: "#6bc6ff" },
      { d: rect(23, 14, 18, 18, 3), fill: W },
      { d: "M17 48l4-10l4 10M19 45h4", fill: "none" },
      { d: rect(29, 19, 6, 8, 1), fill: "#ff7a6b" },
      { d: rect(40, 39, 6, 8, 1), fill: INK },
      { d: rect(18, 39, 6, 8, 1), fill: INK },
    ],
  },
  // Atlas & Co.: a compass rose.
  atlas: {
    bg: "#6bc6ff",
    shapes: [
      { d: circle(32, 32, 20), fill: W },
      { d: "M32 12l6 20h-12Z", fill: "#ff7a6b" },
      { d: "M32 52l-6-20h12Z", fill: INK },
      { d: "M12 32l20-5v10Z", fill: "#cfc8de" },
      { d: "M52 32l-20 5v-10Z", fill: "#cfc8de" },
      { d: circle(32, 32, 3), fill: INK },
    ],
  },
};

export const logoFor = (companyId: string): Logo | null => LOGOS[companyId] ?? null;
