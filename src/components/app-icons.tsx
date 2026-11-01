"use client";

import { useId, type ReactNode } from "react";

/**
 * IlluminatED app icons in the iOS home-screen style: a lit gradient tile with
 * frosted-glass symbols (white fading to a tinted translucency, a bright rim
 * and a soft coloured shadow). Original artwork for IlluminatED's own apps.
 */
export type AppIconName =
  | "maps" | "bus" | "garage" | "unis" | "home" | "locker" | "study" | "awards" | "wallet"
  | "weekly" | "illumship" | "books" | "store" | "phone" | "facetime" | "messages";

type Id = (k: string) => string;
type Ctx = { id: Id; date: Date };
type Art = { tile: [string, string]; tint?: string; shadow?: string; body: (c: Ctx) => ReactNode; plain?: boolean };

/** Glass fill + rim + shadow for a symbol, using the icon's shared defs. */
const g = (id: Id) => ({ fill: `url(#${id("glass")})`, stroke: "rgba(255,255,255,.85)", strokeWidth: 0.9, filter: `url(#${id("sh")})` });
/** A second, deeper glass layer (sits behind the main symbol). */
const g2 = (id: Id) => ({ fill: `url(#${id("glass2")})`, stroke: "rgba(255,255,255,.6)", strokeWidth: 0.8, filter: `url(#${id("sh")})` });

const ART: Record<AppIconName, Art> = {
  facetime: {
    tile: ["#7ff07a", "#22b83d"], tint: "#c7f5cc", shadow: "#0b6b1f",
    body: ({ id }) => <>
      <rect x="17" y="31" width="46" height="38" rx="10" {...g(id)} />
      <path d="M67 45 L81 35.5 C83 34.2 85 35.4 85 37.6 L85 62.4 C85 64.6 83 65.8 81 64.5 L67 55 Z" {...g2(id)} />
    </>,
  },
  phone: {
    tile: ["#7ff07a", "#22b83d"], tint: "#c7f5cc", shadow: "#0b6b1f",
    body: ({ id }) => <path {...g(id)} d="M33 21 c3 -1 6 0 7.2 3 l4.2 10 c1 2.8 .2 5.2 -2 7 l-4.3 3.4 c3.2 7 9 12.8 16 16 l3.4 -4.3 c1.8 -2.2 4.2 -3 7 -2 l10 4.2 c3 1.2 4 4.2 3 7.2 l-2 6 c-1 3 -4 5 -8 5 C 41 77, 23 59, 23 34 c0 -4 2 -8 5 -9 z" />,
  },
  messages: {
    tile: ["#7ff07a", "#22b83d"], tint: "#c7f5cc", shadow: "#0b6b1f",
    body: ({ id }) => <path {...g(id)} d="M50 21 C 70 21, 84 33, 84 48 C 84 63, 70 74, 50 74 C 46 74, 42.5 73.4, 39 72.4 C 34 76.5, 27.5 78.6, 21 78.6 C 25 75, 27 71, 27.3 67.2 C 20.5 62, 16 55.4, 16 48 C 16 33, 30 21, 50 21 Z" />,
  },
  maps: {
    tile: ["#f6f3ee", "#e7e1d7"], plain: true,
    body: ({ id }) => <>
      <path d="M-2 -2 H46 C 40 22, 26 34, -2 40 Z" fill="#9be38c" />
      <circle cx="-2" cy="-2" r="34" fill="none" stroke="#c9f2bd" strokeWidth="5" />
      <path d="M100 58 C 80 60, 70 74, 72 102 H102 Z" fill="#ffa8c8" />
      <path d="M-2 100 C 20 74, 44 66, 102 66" stroke="#ffd34d" strokeWidth="13" fill="none" />
      <path d="M60 -2 C 58 30, 54 52, 50 60" stroke="#fff" strokeWidth="13" fill="none" />
      <path d="M60 -2 C 58 30, 54 52, 50 60" stroke="#3f8cff" strokeWidth="6" fill="none" strokeLinecap="round" />
      <g filter={`url(#${id("sh")})`}>
        <circle cx="50" cy="60" r="18" fill="#fff" />
        <circle cx="50" cy="60" r="14" fill={`url(#${id("pin")})`} />
        <path d="M50 49 L58.5 68 L50 63.6 L41.5 68 Z" fill="#fff" />
      </g>
    </>,
  },
  bus: {
    tile: ["#ff6a5e", "#d8172a"], tint: "#ffd4d0", shadow: "#7a0612",
    body: ({ id }) => <>
      <rect x="25" y="16" width="50" height="62" rx="11" {...g(id)} />
      <rect x="30" y="22" width="40" height="8" rx="3" fill="#d8172a" opacity=".85" />
      <rect x="30" y="34" width="40" height="15" rx="4" fill="#ff8a80" opacity=".55" />
      <rect x="30" y="53" width="40" height="12" rx="4" fill="#ff8a80" opacity=".55" />
      <circle cx="34" cy="71" r="3" fill="#ffd34d" /><circle cx="66" cy="71" r="3" fill="#ffd34d" />
      <rect x="29" y="78" width="9" height="7" rx="2.5" {...g2(id)} /><rect x="62" y="78" width="9" height="7" rx="2.5" {...g2(id)} />
    </>,
  },
  garage: {
    tile: ["#a7abb3", "#5b5f68"], tint: "#dfe3ea", shadow: "#1f2228",
    body: ({ id }) => <>
      <path {...g(id)} d="M14 62 C14 54 20 51 28 50 L36 37 C38 34.5 41 33.5 45 33.5 L62 33.5 C66 33.5 69 35.5 71 38.5 L78 50 C85 51 88 55 88 61 L88 65 C88 67.5 86 69 84 69 L18 69 C16 69 14 67.5 14 65 Z" />
      <path d="M39 39 C40 37.4 42 37 44 37 L51.5 37 L51.5 48 L33.5 48 Z M55 37 L61 37 C64 37 66 38 67 40 L71.5 48 L55 48 Z" fill="#5b5f68" opacity=".45" />
      <circle cx="30" cy="69" r="8.5" {...g2(id)} /><circle cx="72" cy="69" r="8.5" {...g2(id)} />
      <circle cx="30" cy="69" r="3.2" fill="#5b5f68" opacity=".5" /><circle cx="72" cy="69" r="3.2" fill="#5b5f68" opacity=".5" />
    </>,
  },
  unis: {
    tile: ["#6f8dff", "#3047d6"], tint: "#d3dcff", shadow: "#101c72",
    body: ({ id }) => <>
      <path {...g2(id)} d="M31 50 L31 64 C31 70 40 74 50 74 C60 74 69 70 69 64 L69 50 L50 58 Z" />
      <path {...g(id)} d="M50 24 L88 40 L50 56 L12 40 Z" />
      <path d="M50 40 L77 47 L77 64" stroke="#ffd34d" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="77" cy="67" r="4" fill="#ffd34d" />
    </>,
  },
  home: {
    tile: ["#ffc24d", "#ff8a00"], tint: "#ffe9c2", shadow: "#8a3d00",
    body: ({ id }) => <>
      <path {...g(id)} d="M50 18 C52 18 53.5 18.7 55 20 L83 45 C85.5 47.2 84 51 80.8 51 L76 51 L76 78 C76 80.5 74.5 82 72 82 L60 82 L60 64 C60 62 58.5 60.5 56.5 60.5 L43.5 60.5 C41.5 60.5 40 62 40 64 L40 82 L28 82 C25.5 82 24 80.5 24 78 L24 51 L19.2 51 C16 51 14.5 47.2 17 45 L45 20 C46.5 18.7 48 18 50 18 Z" />
    </>,
  },
  locker: {
    tile: ["#ff9ad6", "#d6339b"], tint: "#ffd9ef", shadow: "#7d0f55",
    body: ({ id }) => <>
      <path d="M50 14 a5 5 0 1 1 5 5 c-2 0 -5 1.5 -5 4 v3 M50 26 L82 39 M50 26 L18 39" stroke="rgba(255,255,255,.85)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path {...g(id)} d="M38 31 L20 39 L13 55 L26 59.5 L28.5 51 L28.5 84 L71.5 84 L71.5 51 L74 59.5 L87 55 L80 39 L62 31 C60 37 56 40 50 40 C44 40 40 37 38 31 Z" />
    </>,
  },
  study: {
    tile: ["#ffb340", "#ff6a00"], tint: "#ffe3c2", shadow: "#8a2f00",
    body: ({ id }) => <>
      <path {...g2(id)} d="M12 31 C26 27 40 28 50 34 C60 28 74 27 88 31 L88 77 C74 73 60 74 50 80 C40 74 26 73 12 77 Z" />
      <path {...g(id)} d="M16 27 C28 23 40 24 48.5 30 L48.5 74 C40 68 28 67 16 71 Z M84 27 C72 23 60 24 51.5 30 L51.5 74 C60 68 72 67 84 71 Z" />
      {[38, 46, 54].map((y) => <path key={y} d={`M22 ${y} C29 ${y - 2} 36 ${y - 1.5} 43 ${y + 1} M57 ${y + 1} C64 ${y - 1.5} 71 ${y - 2} 78 ${y}`} stroke="#ff8a1f" strokeOpacity=".45" strokeWidth="1.8" fill="none" strokeLinecap="round" />)}
    </>,
  },
  awards: {
    tile: ["#b26bff", "#6a2fd6"], tint: "#ead9ff", shadow: "#2e0b72",
    body: ({ id }) => <>
      <path d="M31 28 C19 28 17 44 31 46 M69 28 C81 28 83 44 69 46" stroke="rgba(255,255,255,.8)" strokeWidth="4.5" fill="none" />
      <path {...g(id)} d="M30 21 L70 21 L70 40 C70 52 61 60 50 60 C39 60 30 52 30 40 Z" />
      <rect x="45" y="58" width="10" height="12" {...g2(id)} />
      <rect x="33" y="70" width="34" height="11" rx="3.5" {...g(id)} />
      <path d="M50 29 l3 6.2 6.6 .9 -4.8 4.6 1.2 6.6 -6 -3.2 -6 3.2 1.2 -6.6 -4.8 -4.6 6.6 -.9z" fill="#ffd34d" />
    </>,
  },
  wallet: {
    tile: ["#2c2c2e", "#0a0a0b"], plain: true,
    body: ({ id }) => <>
      {([["#7fd3ff", 22], ["#ffd36b", 30], ["#ff9b8a", 38]] as const).map(([c, y]) => (
        <rect key={c} x="19" y={y} width="62" height="28" rx="5" fill={c} filter={`url(#${id("sh")})`} />
      ))}
      <path d="M15 52 L37 52 C41 52 43 57 50 57 C57 57 59 52 63 52 L85 52 L85 78 C85 82 82 85 78 85 L22 85 C18 85 15 82 15 78 Z" fill={`url(#${id("pocket")})`} stroke="rgba(255,255,255,.7)" strokeWidth=".8" filter={`url(#${id("sh")})`} />
      <circle cx="72" cy="72" r="7" fill="#ffd34d" stroke="#fff" strokeOpacity=".8" strokeWidth=".8" />
      <text x="72" y="75.4" textAnchor="middle" fontSize="9" fontWeight="800" fill="#a8690a" fontFamily="system-ui, sans-serif">C</text>
    </>,
  },
  weekly: {
    tile: ["#ffffff", "#f1f1f4"], plain: true,
    body: ({ date }) => <>
      <text x="50" y="33" textAnchor="middle" fontSize="16" fontWeight="600" fill="#ff3b30" fontFamily="-apple-system, system-ui, sans-serif">{date.toLocaleDateString("en-GB", { weekday: "short" })}</text>
      <text x="50" y="80" textAnchor="middle" fontSize="50" fontWeight="300" fill="#1c1c1e" fontFamily="-apple-system, system-ui, sans-serif" letterSpacing="-2">{date.getDate()}</text>
    </>,
  },
  illumship: {
    tile: ["#6b3dff", "#1d0a6e"], tint: "#f3e6ff", shadow: "#0c0336",
    body: ({ id }) => <>
      {[[20, 22, 1.2], [80, 18, 1], [76, 80, 1.4], [22, 76, 1], [86, 52, 0.8]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#fff" opacity=".8" />)}
      <circle cx="50" cy="50" r="28" fill={`url(#${id("halo")})`} />
      <path {...g(id)} d="M50 20 C53 39 61 47 80 50 C61 53 53 61 50 80 C47 61 39 53 20 50 C39 47 47 39 50 20 Z" />
      <path {...g2(id)} d="M73 24 C74 29.5 76 31.5 81 32.5 C76 33.5 74 35.5 73 41 C72 35.5 70 33.5 65 32.5 C70 31.5 72 29.5 73 24 Z" />
    </>,
  },
  books: {
    tile: ["#ff9f40", "#f05a00"], tint: "#ffe3c9", shadow: "#7a2600",
    body: ({ id }) => <>
      <rect x="17" y="64" width="66" height="15" rx="4" {...g(id)} />
      <rect x="22" y="48" width="58" height="15" rx="4" {...g2(id)} />
      <rect x="27" y="32" width="48" height="15" rx="4" {...g(id)} />
      <rect x="21" y="69" width="44" height="2.4" rx="1.2" fill="#f05a00" opacity=".35" />
      <rect x="31" y="37" width="30" height="2.4" rx="1.2" fill="#f05a00" opacity=".35" />
    </>,
  },
  store: {
    tile: ["#4fb2ff", "#0a5cff"], tint: "#d2e6ff", shadow: "#002a85",
    body: ({ id }) => <>
      <path d="M38 37 C38 23 62 23 62 37" stroke="rgba(255,255,255,.9)" strokeWidth="4.2" fill="none" strokeLinecap="round" />
      <path {...g(id)} d="M23 36 L77 36 L73 81 C72.6 84.5 71 86 67.5 86 L32.5 86 C29 86 27.4 84.5 27 81 Z" />
      <path d="M50 49 l3.6 7.2 7.9 1.1 -5.7 5.6 1.3 7.9 -7.1 -3.8 -7.1 3.8 1.3 -7.9 -5.7 -5.6 7.9 -1.1z" fill="#0a5cff" opacity=".75" />
    </>,
  },
};

/** One app icon, filling its (rounded) container. */
export function AppIconArt({ name, className, date }: { name: AppIconName; className?: string; date?: Date }) {
  const uid = useId().replace(/:/g, "");
  const id: Id = (k) => `ai-${uid}-${k}`;
  const art = ART[name];
  const tint = art.tint ?? "#ffffff";
  return (
    <svg data-bleed="" viewBox="0 0 100 100" className={className} width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id={id("tile")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={art.tile[0]} /><stop offset="1" stopColor={art.tile[1]} />
        </linearGradient>
        <radialGradient id={id("light")} cx=".3" cy="0" r=".9">
          <stop offset="0" stopColor="#fff" stopOpacity={art.plain ? 0 : 0.35} /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("glass")} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" /><stop offset=".55" stopColor="#fff" stopOpacity=".92" /><stop offset="1" stopColor={tint} stopOpacity=".78" />
        </linearGradient>
        <linearGradient id={id("glass2")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".78" /><stop offset="1" stopColor={tint} stopOpacity=".5" />
        </linearGradient>
        <linearGradient id={id("pin")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5aaeff" /><stop offset="1" stopColor="#0a6cff" /></linearGradient>
        <linearGradient id={id("pocket")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6e7dc" /><stop offset="1" stopColor="#d9bfae" /></linearGradient>
        <radialGradient id={id("halo")}><stop offset="0" stopColor="#ffd6ff" stopOpacity=".9" /><stop offset="1" stopColor="#ff6fd8" stopOpacity="0" /></radialGradient>
        <filter id={id("sh")} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="2.4" floodColor={art.shadow ?? "#000"} floodOpacity=".35" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={`url(#${id("tile")})`} />
      <rect width="100" height="100" fill={`url(#${id("light")})`} />
      {art.body({ id, date: date ?? new Date() })}
      {/* Hairline inner rim, like light catching the edge of the glass. */}
      <rect x=".6" y=".6" width="98.8" height="98.8" rx="22.5" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="1.2" />
    </svg>
  );
}
