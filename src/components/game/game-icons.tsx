/**
 * Chunky low-poly game icons: bold shapes, a thick dark outline, a bright
 * fill with a darker underside and a glossy highlight (in the style of
 * hand-drawn game icon packs). Pure SVG, so they stay crisp at any size.
 */
import { useId, type CSSProperties } from "react";

export type GameIconName =
  | "planet" | "book" | "scroll" | "friends" | "stats" | "gear" | "shirt" | "house" | "trophy" | "star" | "coin"
  | "flame" | "car" | "cap" | "briefcase" | "target" | "chat" | "chest" | "door" | "pin" | "calendar" | "crown"
  | "medal" | "gift" | "bolt" | "play" | "check" | "lock" | "brain" | "rocket";

const INK = "#1b1835";
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** A highlight blob and an underside shade, drawn over a shape clipped to itself. */
function Gloss({ id, d, shade = 0.22 }: { id: string; d: string; shade?: number }) {
  return (
    <>
      <clipPath id={id}><path d={d} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="30" width="48" height="20" fill="#000" opacity={shade} />
        <ellipse cx="17" cy="13" rx="11" ry="6" fill="#fff" opacity=".35" transform="rotate(-25 17 13)" />
      </g>
      <path d={d} fill="none" {...S} />
    </>
  );
}

const SHAPES: Record<GameIconName, (id: string) => React.ReactNode> = {
  planet: (id) => {
    const d = "M24 5a19 19 0 1 0 0.01 0Z";
    return <><path d={d} fill="#3fa9f5" /><path d="M10 15c5 1 6 6 11 5s3 7 8 8 3 8-2 10M30 8c-2 3 1 5 4 5s5 3 6 6" fill="#5fd36b" stroke="#2b8f3c" strokeWidth="1.5" /><path d="M12 30c3-2 6 0 7 3" fill="none" stroke="#fff" strokeWidth="3" opacity=".9" /><Gloss id={id} d={d} /></>;
  },
  book: (id) => {
    const d = "M8 9 26 5l14 6v28l-18 5-14-6Z";
    return <><path d={d} fill="#2f7cf6" /><path d="M22 44V14L40 11" fill="none" stroke="#1d4fb8" strokeWidth="2" /><path d="M10 12l12-3M10 18l10-2" stroke="#9cc8ff" strokeWidth="2" strokeLinecap="round" /><Gloss id={id} d={d} /></>;
  },
  scroll: (id) => {
    const d = "M10 12h26a5 5 0 0 1 0 10h-2v16a5 5 0 0 1-5 5H12a5 5 0 0 1 0-10h2V17a5 5 0 0 1-4-5Z";
    return <><path d={d} fill="#f4d9a3" /><path d="M18 22h12M18 28h12M18 34h8" stroke="#b98c4c" strokeWidth="2.5" strokeLinecap="round" /><rect x="20" y="9" width="6" height="34" fill="#e2456a" opacity=".9" /><Gloss id={id} d={d} shade={0.12} /></>;
  },
  friends: (id) => {
    const d = "M16 22a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm16 2a6 6 0 1 1 0-12 6 6 0 0 1 0 12ZM4 41c0-9 5-15 12-15s12 6 12 15Zm22 0c0-7 2-13 7-13s9 5 9 13Z";
    return <><path d={d} fill="#ffb648" /><Gloss id={id} d={d} /></>;
  },
  stats: (id) => {
    const d = "M6 42V26h10v16Zm13 0V14h10v28Zm13 0V6h10v36Z";
    return <><path d="M6 42V26h10v16Z" fill="#33c46b" /><path d="M19 42V14h10v28Z" fill="#2f7cf6" /><path d="M32 42V6h10v36Z" fill="#ffc531" /><Gloss id={id} d={d} /></>;
  },
  gear: (id) => {
    const d = "M21 4h6l1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2Z";
    return <><path d={d} fill="#b7c6da" /><circle cx="24" cy="24" r="7" fill="#5a6b84" {...S} /><Gloss id={id} d={d} /></>;
  },
  shirt: (id) => {
    const d = "M16 6c2 3 5 4 8 4s6-1 8-4l11 6-4 10-5-2v22H14V20l-5 2-4-10Z";
    return <><path d={d} fill="#3fb0f5" /><path d="M14 30h20" stroke="#2187c9" strokeWidth="2" /><Gloss id={id} d={d} /></>;
  },
  house: (id) => {
    const d = "M24 5 44 22h-5v20H9V22H4Z";
    return <><path d={d} fill="#2f7cf6" /><path d="M24 5 44 22H4Z" fill="#1d58c9" /><rect x="19" y="28" width="10" height="14" fill="#ffd166" {...S} /><Gloss id={id} d={d} /></>;
  },
  trophy: (id) => {
    const d = "M13 6h22v8c0 8-5 13-11 13S13 22 13 14ZM20 27h8v6h5v8H15v-8h5Z";
    return <><path d="M13 9H6c0 7 3 11 8 11M35 9h7c0 7-3 11-8 11" fill="none" {...S} stroke="#e8a515" strokeWidth="4" /><path d="M13 9H6c0 7 3 11 8 11M35 9h7c0 7-3 11-8 11" fill="none" {...S} /><path d={d} fill="#ffcc33" /><Gloss id={id} d={d} /></>;
  },
  star: (id) => {
    const d = "M24 4l6 13 14 2-10 10 3 14-13-7-13 7 3-14L4 19l14-2Z";
    return <><path d={d} fill="#ffcc33" /><Gloss id={id} d={d} /></>;
  },
  coin: (id) => {
    const d = "M24 4a20 20 0 1 0 .01 0Z";
    return <><path d={d} fill="#ffc531" /><circle cx="24" cy="24" r="13" fill="#ffd95c" stroke="#d99a0c" strokeWidth="2.5" /><path d="M27 18c-1-2-6-2-6 1s7 2 7 6-6 4-7 1M24 15v3m0 13v3" fill="none" stroke="#b6780a" strokeWidth="2.5" strokeLinecap="round" /><Gloss id={id} d={d} /></>;
  },
  flame: (id) => {
    const d = "M24 4c4 8 14 12 14 24a14 14 0 0 1-28 0c0-7 4-10 6-14 1 4 3 6 5 6-1-7 0-11 3-16Z";
    return <><path d={d} fill="#ff6a3d" /><path d="M24 24c3 4 7 6 7 11a7 7 0 0 1-14 0c0-4 3-6 4-9 1 2 2 3 3 3Z" fill="#ffcc33" /><Gloss id={id} d={d} shade={0.15} /></>;
  },
  car: (id) => {
    const d = "M6 30l3-10c1-3 3-4 6-4h18c3 0 5 1 6 4l3 10v8H6Z";
    return <><path d={d} fill="#ff4d6d" /><path d="M14 18h20l3 9H11Z" fill="#a8e1ff" {...S} /><circle cx="14" cy="38" r="5" fill="#33304d" {...S} /><circle cx="34" cy="38" r="5" fill="#33304d" {...S} /><Gloss id={id} d={d} /></>;
  },
  cap: (id) => {
    const d = "M24 8 46 18 24 28 2 18Z";
    return <><path d="M12 23v9c0 3 5 6 12 6s12-3 12-6v-9l-12 5Z" fill="#3b3f6b" {...S} /><path d={d} fill="#4a4f86" /><path d="M40 20v12" stroke={INK} strokeWidth="3" /><circle cx="40" cy="34" r="3" fill="#ffcc33" {...S} /><Gloss id={id} d={d} /></>;
  },
  briefcase: (id) => {
    const d = "M5 15h38v26H5Z";
    return <><path d="M17 15v-5h14v5" fill="none" {...S} strokeWidth="4" /><path d={d} fill="#c9783c" /><path d="M5 24h38" stroke={INK} strokeWidth="3" /><rect x="20" y="21" width="8" height="7" fill="#ffcc33" {...S} /><Gloss id={id} d={d} /></>;
  },
  target: (id) => {
    const d = "M24 4a20 20 0 1 0 .01 0Z";
    return <><path d={d} fill="#ff4d6d" /><circle cx="24" cy="24" r="13" fill="#fff" stroke={INK} strokeWidth="2.5" /><circle cx="24" cy="24" r="7" fill="#ff4d6d" stroke={INK} strokeWidth="2.5" /><Gloss id={id} d={d} shade={0.12} /></>;
  },
  chat: (id) => {
    const d = "M8 8h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H22l-10 8v-8H8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z";
    return <><path d={d} fill="#7a5ce6" /><circle cx="16" cy="21" r="2.5" fill="#fff" /><circle cx="24" cy="21" r="2.5" fill="#fff" /><circle cx="32" cy="21" r="2.5" fill="#fff" /><Gloss id={id} d={d} /></>;
  },
  chest: (id) => {
    const d = "M6 20h36v20H6Z";
    return <><path d="M6 20c0-8 6-12 18-12s18 4 18 12Z" fill="#c9783c" {...S} /><path d={d} fill="#a85d2a" /><path d="M6 20h36M18 8v32M30 8v32" stroke="#ffcc33" strokeWidth="3" /><rect x="20" y="17" width="8" height="9" fill="#ffcc33" {...S} /><Gloss id={id} d={d} /></>;
  },
  door: (id) => {
    const d = "M10 4h22v40H10Z";
    return <><path d={d} fill="#c9783c" /><path d="M32 8l8 3v30l-8 3" fill="#8d4e22" {...S} /><circle cx="27" cy="25" r="2.5" fill="#ffcc33" /><Gloss id={id} d={d} /></>;
  },
  pin: (id) => {
    const d = "M24 44S9 29 9 18a15 15 0 0 1 30 0c0 11-15 26-15 26Z";
    return <><path d={d} fill="#ff4d6d" /><circle cx="24" cy="18" r="6" fill="#fff" stroke={INK} strokeWidth="2.5" /><Gloss id={id} d={d} /></>;
  },
  calendar: (id) => {
    const d = "M6 10h36v32H6Z";
    return <><path d={d} fill="#fff" /><path d="M6 10h36v9H6Z" fill="#ff4d6d" /><path d="M14 6v8M34 6v8" stroke={INK} strokeWidth="4" strokeLinecap="round" /><text x="24" y="37" textAnchor="middle" fontSize="15" fontWeight="900" fill={INK} fontFamily="system-ui,sans-serif">31</text><Gloss id={id} d={d} shade={0.1} /></>;
  },
  crown: (id) => {
    const d = "M5 14l10 9 9-15 9 15 10-9-4 26H9Z";
    return <><path d={d} fill="#ffcc33" /><circle cx="24" cy="31" r="4" fill="#ff4d6d" {...S} /><Gloss id={id} d={d} /></>;
  },
  medal: (id) => {
    const d = "M24 16a14 14 0 1 0 .01 0Z";
    return <><path d="M14 4h8l4 12h-8ZM26 4h8l-4 12h-8Z" fill="#2f7cf6" {...S} /><path d={d} fill="#ffcc33" /><path d="M24 22l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8Z" fill="#ffe08a" stroke="#d99a0c" strokeWidth="1.5" /><Gloss id={id} d={d} /></>;
  },
  gift: (id) => {
    const d = "M6 18h36v24H6Z";
    return <><path d={d} fill="#7a5ce6" /><path d="M4 12h40v8H4Z" fill="#9a7cf6" {...S} /><path d="M24 12v30" stroke="#ffcc33" strokeWidth="6" /><path d="M24 12c-4-7-12-7-12-2s8 2 12 2c4 0 12 3 12-2s-8-5-12 2Z" fill="#ffcc33" {...S} /><Gloss id={id} d={d} /></>;
  },
  bolt: (id) => {
    const d = "M28 3 8 27h13l-4 18 23-26H26Z";
    return <><path d={d} fill="#ffcc33" /><Gloss id={id} d={d} /></>;
  },
  play: (id) => {
    const d = "M14 6l28 18-28 18Z";
    return <><path d={d} fill="#33c46b" /><Gloss id={id} d={d} /></>;
  },
  check: (id) => {
    const d = "M24 4a20 20 0 1 0 .01 0Z";
    return <><path d={d} fill="#33c46b" /><path d="M14 24l7 7 13-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><Gloss id={id} d={d} shade={0.15} /></>;
  },
  lock: (id) => {
    const d = "M8 20h32v24H8Z";
    return <><path d="M15 20v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#b7c6da" strokeWidth="6" /><path d="M15 20v-6a9 9 0 0 1 18 0v6" fill="none" {...S} /><path d={d} fill="#ffc531" /><circle cx="24" cy="30" r="3.5" fill={INK} /><path d="M24 32v5" stroke={INK} strokeWidth="3" /><Gloss id={id} d={d} /></>;
  },
  brain: (id) => {
    const d = "M17 8c-6 0-9 5-8 9-4 2-5 9-1 12-1 5 3 10 9 9 2 4 6 5 7 2V9c-2-3-5-2-7-1Zm14 0c6 0 9 5 8 9 4 2 5 9 1 12 1 5-3 10-9 9-2 4-6 5-7 2V9c2-3 5-2 7-1Z";
    return <><path d={d} fill="#ff8fd1" /><path d="M14 18c3 0 4 2 4 4M34 18c-3 0-4 2-4 4M15 30c3-1 5 1 5 3M33 30c-3-1-5 1-5 3" fill="none" stroke="#c94f98" strokeWidth="2" strokeLinecap="round" /><Gloss id={id} d={d} /></>;
  },
  rocket: (id) => {
    const d = "M24 3c9 6 12 16 9 28H15C12 19 15 9 24 3Z";
    return <><path d="M15 26l-7 9 8 1M33 26l7 9-8 1" fill="#ff4d6d" {...S} /><path d="M19 31h10l-2 8h-6Z" fill="#ffcc33" {...S} /><path d={d} fill="#f0f3fa" /><circle cx="24" cy="17" r="4.5" fill="#3fa9f5" stroke={INK} strokeWidth="2.5" /><Gloss id={id} d={d} shade={0.12} /></>;
  },
};

/** A game icon. `label` makes it announced to screen readers; otherwise it's decorative. */
export function GameIcon({ name, size = 28, label, className, style }: { name: GameIconName; size?: number; label?: string; className?: string; style?: CSSProperties }) {
  const id = `gi-${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} style={{ overflow: "visible", filter: "drop-shadow(0 2px 0 rgba(27,24,53,.35))", ...style }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {SHAPES[name](id)}
    </svg>
  );
}

export const GAME_ICON_NAMES = Object.keys(SHAPES) as GameIconName[];
