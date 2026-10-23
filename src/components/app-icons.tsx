"use client";

import { useId, type ReactNode } from "react";

/**
 * IlluminatED app icons: full-bleed illustrated tiles in the style of a modern
 * phone home screen (layered shapes, soft gradients, specular highlights and
 * gentle depth). Original artwork; each icon draws its own background and is
 * clipped to a rounded square by its container.
 */
export type AppIconName =
  | "maps" | "bus" | "garage" | "unis" | "home" | "locker" | "study" | "awards" | "wallet"
  | "weekly" | "illumship" | "books" | "store" | "phone" | "facetime" | "messages";

type Defs = (id: (k: string) => string) => ReactNode;
type Art = { defs: Defs; body: (id: (k: string) => string) => ReactNode };

/* Shared pieces --------------------------------------------------------------- */
const lg = (id: string, stops: [string, string][], x1 = 0, y1 = 0, x2 = 0, y2 = 1) => (
  <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
    {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
  </linearGradient>
);
const rg = (id: string, stops: [string, string, number?][], cx = 0.5, cy = 0.4, r = 0.7) => (
  <radialGradient id={id} cx={cx} cy={cy} r={r}>
    {stops.map(([o, c, a]) => <stop key={o} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
  </radialGradient>
);
const drop = (id: string, dy = 2.5, blur = 2.2, opacity = 0.35) => (
  <filter id={id} x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy={dy} stdDeviation={blur} floodColor="#000" floodOpacity={opacity} />
  </filter>
);
const bg = (id: string) => <rect width="100" height="100" fill={`url(#${id})`} />;

/* The icons ----------------------------------------------------------------- */
const ART: Record<AppIconName, Art> = {
  maps: {
    defs: (id) => <>
      {lg(id("land"), [["0", "#f7f3ea"], ["1", "#e8e1d2"]])}
      {lg(id("water"), [["0", "#7cc8ff"], ["1", "#3d9be9"]])}
      {lg(id("park"), [["0", "#a6e39a"], ["1", "#6cc46a"]])}
      {lg(id("pin"), [["0", "#4aa8ff"], ["1", "#0a6cff"]])}
      {drop(id("sh"), 2, 2, 0.35)}
    </>,
    body: (id) => <>
      {bg(id("land"))}
      <path d="M0 62 C 22 54, 38 74, 62 64 S 92 48, 100 54 V 76 C 84 72, 70 86, 48 84 S 12 76, 0 82 Z" fill={`url(#${id("water")})`} />
      <path d="M8 6 h30 a6 6 0 0 1 6 6 v14 a6 6 0 0 1 -6 6 h-30 a6 6 0 0 1 -6 -6 v-14 a6 6 0 0 1 6 -6z" fill={`url(#${id("park")})`} />
      <path d="M-4 40 L104 26" stroke="#fff" strokeWidth="7" />
      <path d="M58 -4 L70 104" stroke="#fff" strokeWidth="6" />
      <path d="M-4 92 C 30 70, 52 52, 104 8" stroke="#ffd34d" strokeWidth="7" strokeLinecap="round" />
      <path d="M-4 92 C 30 70, 52 52, 104 8" stroke="#f3b500" strokeWidth="1.2" strokeDasharray="4 4" />
      <g filter={`url(#${id("sh")})`}>
        <circle cx="50" cy="52" r="17" fill="#fff" />
        <circle cx="50" cy="52" r="13.5" fill={`url(#${id("pin")})`} />
        <path d="M43 59 L50 42 L57 59 L50 55 Z" fill="#fff" />
      </g>
    </>,
  },
  bus: {
    defs: (id) => <>
      {lg(id("sky"), [["0", "#bfe6ff"], ["1", "#6fb8f2"]])}
      {lg(id("body"), [["0", "#ff5c50"], ["0.55", "#e0202c"], ["1", "#a90f1c"]])}
      {lg(id("glass"), [["0", "#3b4a63"], ["1", "#141c2b"]])}
      {drop(id("sh"), 3, 2.6, 0.4)}
    </>,
    body: (id) => <>
      {bg(id("sky"))}
      <ellipse cx="50" cy="88" rx="32" ry="4" fill="#1d4f7a" opacity=".35" />
      <g filter={`url(#${id("sh")})`}>
        <rect x="22" y="14" width="56" height="70" rx="11" fill={`url(#${id("body")})`} />
        <rect x="27" y="20" width="46" height="9" rx="3" fill="#1b2230" />
        <text x="50" y="27.4" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="#ffd34d" fontFamily="system-ui, sans-serif">24</text>
        <rect x="27" y="33" width="46" height="17" rx="4" fill={`url(#${id("glass")})`} />
        <rect x="27" y="55" width="46" height="15" rx="4" fill={`url(#${id("glass")})`} />
        <path d="M30 35 L44 35 L36 48 L30 48 Z" fill="#fff" opacity=".18" />
        <path d="M30 57 L42 57 L35 68 L30 68 Z" fill="#fff" opacity=".18" />
        <rect x="22" y="51" width="56" height="2.2" fill="#ffd34d" />
        <circle cx="31" cy="76" r="3.4" fill="#fff6d6" />
        <circle cx="69" cy="76" r="3.4" fill="#fff6d6" />
        <rect x="41" y="74.5" width="18" height="3.4" rx="1.7" fill="#7a0a14" />
        <rect x="26" y="15.5" width="48" height="3" rx="1.5" fill="#fff" opacity=".35" />
      </g>
    </>,
  },
  garage: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#3a3f4b"], ["1", "#14161c"]])}
      {lg(id("car"), [["0", "#5fe3d1"], ["0.5", "#13b8a6"], ["1", "#0a7f73"]])}
      {lg(id("win"), [["0", "#c9f2ff"], ["1", "#5f8fa6"]])}
      {rg(id("spot"), [["0", "#ffffff", 0.22], ["1", "#ffffff", 0]], 0.5, 0.75, 0.55)}
      {drop(id("sh"), 3, 2.4, 0.5)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <rect width="100" height="100" fill={`url(#${id("spot")})`} />
      <ellipse cx="50" cy="74" rx="36" ry="5" fill="#000" opacity=".45" />
      <g filter={`url(#${id("sh")})`}>
        <path d="M14 62 C 14 54, 20 51, 28 50 L 36 38 C 38 35, 41 34, 45 34 L 62 34 C 66 34, 69 36, 71 39 L 78 50 C 85 51, 88 55, 88 61 L 88 66 C 88 68, 86 70, 84 70 L 18 70 C 16 70, 14 68, 14 66 Z" fill={`url(#${id("car")})`} />
        <path d="M39 39 C 40 37, 42 37, 44 37 L 52 37 L 52 49 L 33 49 Z" fill={`url(#${id("win")})`} />
        <path d="M55 37 L 61 37 C 64 37, 66 38, 67 40 L 72 49 L 55 49 Z" fill={`url(#${id("win")})`} />
        <path d="M18 56 C 30 53, 70 53, 86 56" stroke="#fff" strokeWidth="1.6" opacity=".55" fill="none" />
        <circle cx="30" cy="70" r="8" fill="#1a1c22" /><circle cx="30" cy="70" r="3.6" fill="#c9ccd2" />
        <circle cx="72" cy="70" r="8" fill="#1a1c22" /><circle cx="72" cy="70" r="3.6" fill="#c9ccd2" />
        <rect x="83" y="58" width="5" height="3" rx="1.5" fill="#fff4c2" />
      </g>
    </>,
  },
  unis: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#5b8cff"], ["1", "#2a3fc9"]])}
      {lg(id("cap"), [["0", "#3b3f52"], ["1", "#12131a"]])}
      {lg(id("gold"), [["0", "#ffe58a"], ["1", "#e0a400"]])}
      {drop(id("sh"), 3, 2.4, 0.4)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <g filter={`url(#${id("sh")})`}>
        <path d="M30 50 L30 64 C 30 70, 40 74, 50 74 C 60 74, 70 70, 70 64 L70 50 Z" fill="#1d1f29" />
        <path d="M50 24 L88 40 L50 56 L12 40 Z" fill={`url(#${id("cap")})`} />
        <path d="M50 24 L88 40 L50 33 L12 40 Z" fill="#fff" opacity=".12" />
        <path d="M50 40 L76 46 L76 66" stroke={`url(#${id("gold")})`} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <rect x="72.5" y="64" width="7" height="12" rx="2" fill={`url(#${id("gold")})`} />
        <circle cx="50" cy="40" r="3" fill={`url(#${id("gold")})`} />
      </g>
    </>,
  },
  home: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#ffd884"], ["1", "#ff9f0a"]])}
      {lg(id("roof"), [["0", "#ff7a59"], ["1", "#d9442b"]])}
      {lg(id("wall"), [["0", "#ffffff"], ["1", "#f0e6d8"]])}
      {lg(id("lit"), [["0", "#fff3b0"], ["1", "#ffc93c"]])}
      {drop(id("sh"), 3, 2.4, 0.3)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <g filter={`url(#${id("sh")})`}>
        <path d="M24 48 L50 26 L76 48 L76 78 C 76 80, 75 81, 73 81 L27 81 C 25 81, 24 80, 24 78 Z" fill={`url(#${id("wall")})`} />
        <path d="M16 50 L50 20 L84 50 C 85 51, 84 54, 82 53 L50 27 L18 53 C 16 54, 15 51, 16 50 Z" fill={`url(#${id("roof")})`} />
        <rect x="64" y="26" width="7" height="14" rx="1.5" fill={`url(#${id("roof")})`} />
        <rect x="44" y="58" width="13" height="23" rx="3" fill="#8a5a3b" />
        <circle cx="54" cy="70" r="1.2" fill="#ffd34d" />
        <rect x="30" y="54" width="10" height="10" rx="2" fill={`url(#${id("lit")})`} />
        <rect x="61" y="54" width="10" height="10" rx="2" fill={`url(#${id("lit")})`} />
      </g>
    </>,
  },
  locker: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#ffb3e0"], ["1", "#e0409f"]])}
      {lg(id("tee"), [["0", "#ffffff"], ["1", "#e9e3ff"]])}
      {lg(id("hook"), [["0", "#e2e4ea"], ["1", "#9aa0ad"]])}
      {drop(id("sh"), 3, 2.4, 0.3)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <g filter={`url(#${id("sh")})`}>
        <path d="M50 14 a5 5 0 1 1 5 5 c-2 0 -5 1.5 -5 4 v3" stroke={`url(#${id("hook")})`} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M50 26 L80 38" stroke={`url(#${id("hook")})`} strokeWidth="2.6" strokeLinecap="round" /><path d="M50 26 L20 38" stroke={`url(#${id("hook")})`} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M38 30 L20 38 L14 54 L26 58 L28 50 L28 84 L72 84 L72 50 L74 58 L86 54 L80 38 L62 30 C 60 36, 56 39, 50 39 C 44 39, 40 36, 38 30 Z" fill={`url(#${id("tee")})`} />
        <path d="M40 52 a10 6 0 0 0 20 0" fill="none" stroke="#7a5ce6" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="50" cy="61" r="4" fill="#ff6fa8" />
        <path d="M28 50 L28 84 L36 84 L34 52 Z" fill="#000" opacity=".05" />
      </g>
    </>,
  },
  study: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#ffcf6b"], ["1", "#ff7a00"]])}
      {lg(id("pageL"), [["0", "#ffffff"], ["1", "#ece6dc"]], 1, 0, 0, 0)}
      {lg(id("pageR"), [["0", "#ffffff"], ["1", "#ece6dc"]], 0, 0, 1, 0)}
      {lg(id("cover"), [["0", "#2b5fd9"], ["1", "#173a8c"]])}
      {drop(id("sh"), 3, 2.4, 0.3)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <g filter={`url(#${id("sh")})`}>
        <path d="M12 30 C 26 26, 40 27, 50 33 C 60 27, 74 26, 88 30 L88 76 C 74 72, 60 73, 50 79 C 40 73, 26 72, 12 76 Z" fill={`url(#${id("cover")})`} />
        <path d="M15 27 C 28 23, 40 24, 49 30 L49 74 C 40 68, 28 67, 15 71 Z" fill={`url(#${id("pageL")})`} />
        <path d="M85 27 C 72 23, 60 24, 51 30 L51 74 C 60 68, 72 67, 85 71 Z" fill={`url(#${id("pageR")})`} />
        {[36, 43, 50, 57].map((y) => <path key={y} d={`M21 ${y} C 29 ${y - 2}, 37 ${y - 1.5}, 44 ${y + 1}`} stroke="#c9c2b6" strokeWidth="1.8" fill="none" strokeLinecap="round" />)}
        {[36, 43, 50].map((y) => <path key={y} d={`M56 ${y + 1} C 63 ${y - 1.5}, 71 ${y - 2}, 79 ${y}`} stroke="#c9c2b6" strokeWidth="1.8" fill="none" strokeLinecap="round" />)}
        <path d="M70 24 L70 46 L74.5 42 L79 46 L79 24 Z" fill="#ff3b30" />
      </g>
    </>,
  },
  awards: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#8e6bff"], ["1", "#4a2fc9"]])}
      {lg(id("gold"), [["0", "#fff1a8"], ["0.45", "#ffcc33"], ["1", "#c98a00"]], 0, 0, 1, 1)}
      {rg(id("shine"), [["0", "#ffffff", 0.7], ["1", "#ffffff", 0]], 0.35, 0.3, 0.4)}
      {drop(id("sh"), 3, 2.4, 0.4)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <g filter={`url(#${id("sh")})`}>
        <path d="M30 22 L70 22 L70 40 C 70 52, 61 60, 50 60 C 39 60, 30 52, 30 40 Z" fill={`url(#${id("gold")})`} />
        <path d="M30 28 C 18 28, 16 44, 30 46 M70 28 C 82 28, 84 44, 70 46" stroke={`url(#${id("gold")})`} strokeWidth="4.5" fill="none" />
        <rect x="45" y="58" width="10" height="12" fill={`url(#${id("gold")})`} />
        <rect x="34" y="70" width="32" height="10" rx="3" fill={`url(#${id("gold")})`} />
        <path d="M50 30 l3 6 6.5 .8 -4.8 4.5 1.3 6.4 -6 -3.3 -6 3.3 1.3 -6.4 -4.8 -4.5 6.5 -.8z" fill="#fff" opacity=".9" />
        <ellipse cx="40" cy="32" rx="7" ry="10" fill={`url(#${id("shine")})`} />
      </g>
    </>,
  },
  wallet: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#2c2c2e"], ["1", "#000000"]])}
      {lg(id("c1"), [["0", "#5ac8fa"], ["1", "#0a84ff"]])}
      {lg(id("c2"), [["0", "#7ee08f"], ["1", "#30b14f"]])}
      {lg(id("c3"), [["0", "#ffd36b"], ["1", "#ff9f0a"]])}
      {lg(id("c4"), [["0", "#ff7a70"], ["1", "#e0262f"]])}
      {lg(id("pocket"), [["0", "#3a3a3c"], ["1", "#1c1c1e"]])}
      {drop(id("sh"), -1.5, 1.6, 0.45)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      {["c1", "c2", "c3", "c4"].map((c, i) => <rect key={c} x="16" y={20 + i * 9} width="68" height="30" rx="6" fill={`url(#${id(c)})`} filter={`url(#${id("sh")})`} />)}
      <path d="M12 54 L36 54 C 40 54, 42 58, 50 58 C 58 58, 60 54, 64 54 L88 54 L88 82 C 88 86, 85 88, 82 88 L18 88 C 15 88, 12 86, 12 82 Z" fill={`url(#${id("pocket")})`} filter={`url(#${id("sh")})`} />
      <text x="50" y="78" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffd34d" fontFamily="system-ui, sans-serif">CLOUT</text>
    </>,
  },
  weekly: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#ffffff"], ["1", "#eceef3"]])}
      {drop(id("sh"), 1.5, 1.2, 0.15)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <text x="50" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ff3b30" fontFamily="system-ui, sans-serif" letterSpacing="1">WEEK</text>
      <text x="50" y="74" textAnchor="middle" fontSize="44" fontWeight="300" fill="#1c1c1e" fontFamily="system-ui, sans-serif" filter={`url(#${id("sh")})`}>7</text>
      <rect x="30" y="81" width="40" height="4" rx="2" fill="#ff3b30" opacity=".85" />
    </>,
  },
  illumship: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#7a4bff"], ["0.6", "#3b1f9e"], ["1", "#190d4d"]])}
      {rg(id("glow"), [["0", "#fff6c2", 1], ["0.35", "#ffd34d", 0.9], ["1", "#ff6fd8", 0]], 0.5, 0.5, 0.5)}
      {lg(id("star"), [["0", "#ffffff"], ["1", "#ffe58a"]])}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      {[[20, 22, 1.2], [80, 18, 1], [74, 78, 1.4], [24, 74, 1], [86, 52, 0.8], [14, 48, 0.8]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#fff" opacity=".85" />)}
      <circle cx="50" cy="50" r="30" fill={`url(#${id("glow")})`} />
      <path d="M50 22 C 53 40, 60 47, 78 50 C 60 53, 53 60, 50 78 C 47 60, 40 53, 22 50 C 40 47, 47 40, 50 22 Z" fill={`url(#${id("star")})`} />
      <path d="M72 26 C 73 31, 75 33, 80 34 C 75 35, 73 37, 72 42 C 71 37, 69 35, 64 34 C 69 33, 71 31, 72 26 Z" fill="#fff" opacity=".9" />
    </>,
  },
  books: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#ffb347"], ["1", "#ff6a00"]])}
      {lg(id("b1"), [["0", "#ff6b6b"], ["1", "#c92a2a"]], 0, 0, 1, 0)}
      {lg(id("b2"), [["0", "#4dabf7"], ["1", "#1864ab"]], 0, 0, 1, 0)}
      {lg(id("b3"), [["0", "#69db7c"], ["1", "#2b8a3e"]], 0, 0, 1, 0)}
      {drop(id("sh"), 2.5, 2, 0.3)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <g filter={`url(#${id("sh")})`}>
        <rect x="18" y="64" width="64" height="14" rx="3" fill={`url(#${id("b1")})`} /><rect x="18" y="66" width="64" height="2.4" fill="#fff" opacity=".35" />
        <rect x="22" y="50" width="58" height="14" rx="3" fill={`url(#${id("b2")})`} /><rect x="22" y="52" width="58" height="2.4" fill="#fff" opacity=".35" />
        <rect x="26" y="36" width="50" height="14" rx="3" fill={`url(#${id("b3")})`} /><rect x="26" y="38" width="50" height="2.4" fill="#fff" opacity=".35" />
        <path d="M58 18 L72 34 L36 34 Z" fill="#fff" opacity=".0" />
        <rect x="70" y="18" width="8" height="18" rx="2" fill="#ffd34d" transform="rotate(14 74 27)" />
      </g>
    </>,
  },
  store: {
    defs: (id) => <>
      {lg(id("bg"), [["0", "#6ad0ff"], ["1", "#0a6cff"]])}
      {lg(id("bag"), [["0", "#ffffff"], ["1", "#dfe9ff"]])}
      {drop(id("sh"), 3, 2.4, 0.3)}
    </>,
    body: (id) => <>
      {bg(id("bg"))}
      <g filter={`url(#${id("sh")})`}>
        <path d="M38 36 C 38 24, 62 24, 62 36" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M24 36 L76 36 L72 82 C 71.6 85, 70 86, 67 86 L33 86 C 30 86, 28.4 85, 28 82 Z" fill={`url(#${id("bag")})`} />
        <path d="M50 50 l3.4 7 7.6 1 -5.5 5.3 1.4 7.6 -6.9 -3.7 -6.9 3.7 1.4 -7.6 -5.5 -5.3 7.6 -1z" fill="#0a6cff" />
      </g>
    </>,
  },
  phone: {
    defs: (id) => <>{lg(id("bg"), [["0", "#6bea72"], ["1", "#1fb33b"]])}{drop(id("sh"), 2, 1.8, 0.25)}</>,
    body: (id) => <>
      {bg(id("bg"))}
      <path filter={`url(#${id("sh")})`} fill="#fff" d="M33 22 c3 -1 6 0 7 3 l4 10 c1 3 0 5 -2 7 l-4 3 c3 7 9 13 16 16 l3 -4 c2 -2 4 -3 7 -2 l10 4 c3 1 4 4 3 7 l-2 6 c-1 3 -4 5 -8 5 C 41 76, 24 59, 24 33 c0 -4 2 -7 5 -8 z" />
    </>,
  },
  facetime: {
    defs: (id) => <>{lg(id("bg"), [["0", "#6bea72"], ["1", "#1fb33b"]])}{drop(id("sh"), 2, 1.8, 0.25)}</>,
    body: (id) => <>
      {bg(id("bg"))}
      <g filter={`url(#${id("sh")})`} fill="#fff">
        <rect x="18" y="32" width="44" height="36" rx="9" />
        <path d="M66 44 L82 33 C 84 32, 86 33, 86 35 L86 65 C 86 67, 84 68, 82 67 L66 56 Z" />
      </g>
    </>,
  },
  messages: {
    defs: (id) => <>{lg(id("bg"), [["0", "#6bea72"], ["1", "#1fb33b"]])}{drop(id("sh"), 2, 1.8, 0.25)}</>,
    body: (id) => <>
      {bg(id("bg"))}
      <path filter={`url(#${id("sh")})`} fill="#fff" d="M50 20 C 70 20, 84 32, 84 47 C 84 62, 70 74, 50 74 C 46 74, 42 73.5, 39 72.5 C 34 77, 27 79, 21 79 C 25 75, 27 71, 27 67 C 20 62, 16 55, 16 47 C 16 32, 30 20, 50 20 Z" />
    </>,
  },
};

/** One illustrated app icon, filling its (rounded) container. */
export function AppIconArt({ name, className }: { name: AppIconName; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const id = (k: string) => `ai-${uid}-${k}`;
  const art = ART[name];
  return (
    <svg data-bleed="" viewBox="0 0 100 100" className={className} width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        {art.defs(id)}
        {lg(id("gloss"), [["0", "rgba(255,255,255,0.45)"], ["0.42", "rgba(255,255,255,0.08)"], ["1", "rgba(255,255,255,0)"]])}
      </defs>
      {art.body(id)}
      {/* Glass: a soft top sheen and a hairline inner rim. */}
      <rect width="100" height="56" fill={`url(#${id("gloss")})`} />
      <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
    </svg>
  );
}
