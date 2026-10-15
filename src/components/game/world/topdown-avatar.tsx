import { memo } from "react";

import { type Avatar, cosmeticById } from "@/game/core/cosmetics";
import { logoFor } from "@/game/core/logos";

/**
 * Top-down characters for Worlds, in the style of .io games: a round head seen
 * from above, shoulders in the outfit colour, two fists that swing as you walk,
 * and the parody logo of your best company on your back. Drawn facing "north";
 * the world loop rotates `.td-turn`, swings `.td-hand-l/.td-hand-r` and bobs
 * `.td-body` every frame, so nothing here re-renders while walking.
 */

const INK = "#1b1622";
const O = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round" as const };
const col = (id: string | undefined, fallback: string) => (id && cosmeticById(id)?.color) || fallback;

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Shoulders: a rounded capsule behind the head, wider than it is deep. */
function Shoulders({ top }: { top: string }) {
  const c = col(top, "#2d1b69");
  const dark = shade(c, -0.25);
  const special: Record<string, React.ReactNode> = {
    "top-stripes": (
      <g clipPath="url(#td-sh)">
        {[-12, -4, 4, 12].map((x) => (
          <rect key={x} x={32 + x - 2} y="22" width="4" height="26" fill="#7c4dff" />
        ))}
      </g>
    ),
    "top-suit": <path d="M27 24 L32 34 L37 24 Z" fill="#f4f0ff" />,
    "top-tux": <path d="M27 24 L32 34 L37 24 Z" fill="#f4f0ff" />,
    "top-hivis": (
      <g clipPath="url(#td-sh)">
        <rect x="12" y="34" width="40" height="4" fill="#d9dde3" />
      </g>
    ),
    "top-jersey": (
      <text x="32" y="45" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">
        10
      </text>
    ),
    "top-labcoat": <path d="M32 24 V46" stroke="#cfd6de" strokeWidth="1.6" />,
    "top-astronaut": <rect x="23" y="40" width="18" height="8" rx="3" fill="#cfd6de" {...O} strokeWidth={1.6} />,
  };
  return (
    <g>
      {top === "top-cape" && <path d="M14 34 Q32 62 50 34 Z" fill="#c8372a" {...O} />}
      <defs>
        <clipPath id="td-sh">
          <rect x="9" y="24" width="46" height="28" rx="14" />
        </clipPath>
      </defs>
      <rect x="9" y="24" width="46" height="28" rx="14" fill={c} {...O} />
      <path d="M14 44 Q32 53 50 44" fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      {special[top]}
    </g>
  );
}

/** The parody logo as a patch on the back of the shoulders. */
function BackPatch({ badge }: { badge: string | null }) {
  const logo = badge ? logoFor(badge) : null;
  if (!logo) {
    return (
      <g transform="translate(25 42)">
        <rect width="12" height="9" rx="2.5" fill="#f4f0ff" stroke={INK} strokeWidth="1.2" />
        <text x="6" y="7.4" textAnchor="middle" fontSize="7" fontWeight="900" fill="#7c4dff">
          i
        </text>
      </g>
    );
  }
  return (
    <g transform="translate(25.5 41) scale(0.203)">
      <rect width="64" height="64" rx="16" fill={logo.bg} stroke={INK} strokeWidth="6" />
      {logo.shapes
        .filter((s) => s.fill !== "none")
        .map((s, i) => (
          <path key={i} d={s.d} fill={s.fill} />
        ))}
    </g>
  );
}

function Hand({ cls, x, skin, held }: { cls: string; x: number; skin: string; held?: string }) {
  return (
    <g className={cls} style={{ transformBox: "view-box", transformOrigin: "32px 32px" }}>
      <g transform={`translate(${x} 24)`}>
        {held && <Held id={held} />}
        <circle r="5.6" fill={skin} {...O} />
      </g>
    </g>
  );
}

/** Things held in the right hand, seen from above, sticking out in front. */
function Held({ id }: { id: string }) {
  switch (id) {
    case "held-coffee":
      return (
        <g transform="translate(0 -6)">
          <circle r="4.6" fill="#f4efe6" {...O} strokeWidth={1.6} />
          <circle r="2.6" fill="#7a4a2b" />
        </g>
      );
    case "held-phone":
      return <rect x="-3" y="-11" width="6" height="9" rx="1.5" fill="#2b2633" {...O} strokeWidth={1.4} />;
    case "held-croissant":
      return <path d="M-6 -6 Q0 -14 6 -6 Q0 -9 -6 -6 Z" fill="#e9a54b" {...O} strokeWidth={1.4} />;
    case "held-briefcase":
      return <rect x="-6" y="-12" width="12" height="7" rx="1.5" fill="#6b4226" {...O} strokeWidth={1.4} />;
    case "held-mic":
      return (
        <g>
          <rect x="-1" y="-10" width="2" height="6" fill="#2b2633" />
          <circle cy="-11" r="2.6" fill="#9aa3ad" {...O} strokeWidth={1.2} />
        </g>
      );
    case "held-laptop":
      return <rect x="-7" y="-13" width="14" height="9" rx="1.5" fill="#cfd6de" {...O} strokeWidth={1.4} />;
    case "held-trophy":
      return <circle cy="-8" r="4" fill="#ffd166" {...O} strokeWidth={1.4} />;
    case "held-compass":
      return (
        <g transform="translate(0 -8)">
          <circle r="4" fill="#ffd166" {...O} strokeWidth={1.4} />
          <path d="M0 -3 L1 0 L0 3 L-1 0 Z" fill="#c8372a" />
        </g>
      );
    default:
      return null;
  }
}

/** Head seen from above: skin circle, hair (or fur), then hat, with the face edge at the front (north). */
function Head({ avatar }: { avatar: Avatar }) {
  const skin = col(avatar.skin, "#e3ac7c");
  const hair = col(avatar.hairColor, "#2b2018");
  const head = avatar.head ?? "head-human";
  const hat = avatar.hat ?? "hat-none";
  const style = avatar.hair ?? "hair-short";

  if (head === "head-robot")
    return (
      <g>
        <rect x="20" y="20" width="24" height="24" rx="6" fill="#cfd6de" {...O} />
        <rect x="24" y="21" width="16" height="4" rx="2" fill="#6bc6ff" />
        <circle cx="32" cy="18" r="2.4" fill="#ff7a6b" {...O} strokeWidth={1.2} />
      </g>
    );
  const animal: Record<string, React.ReactNode> = {
    "head-lion": <circle cx="32" cy="32" r="16" fill="#c8761e" {...O} />,
    "head-dog": (
      <g fill="#8b5a2b" {...O}>
        <ellipse cx="18.5" cy="34" rx="4" ry="7" />
        <ellipse cx="45.5" cy="34" rx="4" ry="7" />
      </g>
    ),
    "head-cow": (
      <g {...O}>
        <path d="M21 24 L15 18 L23 21 Z" fill="#f4efe6" />
        <path d="M43 24 L49 18 L41 21 Z" fill="#f4efe6" />
      </g>
    ),
  };
  const headFill =
    head === "head-alien" ? "#8ee07a" : head === "head-dog" ? "#c48a4f" : head === "head-cow" ? "#f4f0ff" : head === "head-lion" ? "#e9a54b" : skin;
  const furry = head !== "head-human" && head !== "head-alien";

  return (
    <g>
      {animal[head]}
      <circle cx="32" cy="32" r="12.5" fill={headFill} {...O} />
      {head === "head-cow" && <circle cx="36" cy="36" r="3.6" fill={INK} />}
      {/* Nose/face edge at the front so you can tell which way they're facing. */}
      <path d="M27 21.6 Q32 19.2 37 21.6" fill="none" stroke={shade(headFill, -0.3)} strokeWidth="2" strokeLinecap="round" />
      {!furry && head !== "head-alien" && hat === "hat-none" && <Hair style={style} color={hair} />}
      {head === "head-alien" && (
        <g fill="#8ee07a" {...O} strokeWidth={1.6}>
          <circle cx="25" cy="22" r="2.6" />
          <circle cx="39" cy="22" r="2.6" />
        </g>
      )}
      {!furry && hat !== "hat-none" && <Hair style={style} color={hair} under />}
      <Face id={avatar.face ?? "face-none"} />
      <Hat id={hat} />
    </g>
  );
}

function Hair({ style, color, under = false }: { style: string; color: string; under?: boolean }) {
  const p = { fill: color, ...O };
  if (under) {
    // Only what pokes out from under a hat.
    if (style === "hair-long" || style === "hair-braids") return <path d="M22 38 Q32 50 42 38 Q32 44 22 38 Z" {...p} />;
    if (style === "hair-ponytail") return <ellipse cx="32" cy="47" rx="4" ry="6" {...p} />;
    return null;
  }
  switch (style) {
    case "hair-bald":
      return <ellipse cx="35" cy="28" rx="3" ry="2" fill="#fff" opacity="0.35" />;
    case "hair-buzz":
      return <path d="M20.5 33 A11.5 11.5 0 0 1 43.5 33 Q32 26 20.5 33 Z" {...p} opacity="0.9" strokeWidth={1.4} />;
    case "hair-afro":
      return <circle cx="32" cy="34" r="15" {...p} />;
    case "hair-buns":
      return (
        <g>
          <path d="M19.5 33 A12.5 12.5 0 0 1 44.5 33 Q32 25 19.5 33 Z" {...p} />
          <circle cx="21" cy="40" r="5" {...p} />
          <circle cx="43" cy="40" r="5" {...p} />
        </g>
      );
    case "hair-ponytail":
      return (
        <g>
          <ellipse cx="32" cy="47" rx="4" ry="7" {...p} />
          <path d="M19.5 33 A12.5 12.5 0 0 1 44.5 33 Q32 25 19.5 33 Z" {...p} />
        </g>
      );
    case "hair-long":
    case "hair-braids":
      return <path d="M19 30 Q19 50 32 50 Q45 50 45 30 Q32 23 19 30 Z" {...p} />;
    case "hair-mohawk":
      return <rect x="29" y="18" width="6" height="28" rx="3" {...p} />;
    case "hair-spiky":
      return <path d="M19 33 L22 22 L26 27 L30 18 L33 26 L37 19 L39 27 L44 23 L45 33 Q32 26 19 33 Z" {...p} />;
    case "hair-curly":
      return (
        <g {...p}>
          {[
            [22, 30],
            [27, 25],
            [33, 24],
            [39, 26],
            [43, 31],
            [25, 37],
            [39, 37],
            [32, 40],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />
          ))}
        </g>
      );
    case "hair-bob":
      return <path d="M19 34 Q19 21 32 21 Q45 21 45 34 Q45 44 32 44 Q19 44 19 34 Z M24 25 Q32 30 40 25" {...p} />;
    case "hair-quiff":
      return <path d="M20 34 A12 12 0 0 1 44 34 Q32 28 20 34 Z M26 24 Q32 14 38 24 Z" {...p} />;
    default:
      return <path d="M19.5 33 A12.5 12.5 0 0 1 44.5 33 Q32 26 19.5 33 Z" {...p} />;
  }
}

function Face({ id }: { id: string }) {
  switch (id) {
    case "face-round":
    case "face-star":
    case "face-monocle":
      return (
        <g fill="none" stroke={id === "face-star" ? "#ffd166" : INK} strokeWidth="1.6">
          <circle cx="27.5" cy="22.6" r="2.4" />
          {id !== "face-monocle" && <circle cx="36.5" cy="22.6" r="2.4" />}
        </g>
      );
    case "face-shades":
      return <rect x="24" y="20.4" width="16" height="3.8" rx="1.9" fill={INK} />;
    case "face-vr":
      return <rect x="23" y="19.6" width="18" height="5" rx="2.5" fill="#6bc6ff" {...O} strokeWidth={1.4} />;
    default:
      return null;
  }
}

function Hat({ id }: { id: string }) {
  const c = col(id, "#a67fff");
  switch (id) {
    case "hat-none":
      return null;
    case "hat-cap":
      return (
        <g {...O}>
          <path d="M23 24 Q32 12 41 24 Z" fill={shade(c, -0.15)} />
          <circle cx="32" cy="33" r="12" fill={c} />
          <circle cx="32" cy="33" r="1.6" fill={INK} />
        </g>
      );
    case "hat-beanie":
      return (
        <g {...O}>
          <circle cx="32" cy="33" r="12.5" fill={c} />
          <circle cx="32" cy="33" r="3.4" fill={shade(c, 0.4)} />
        </g>
      );
    case "hat-party":
      return (
        <g {...O}>
          <circle cx="32" cy="32" r="9" fill={c} />
          <circle cx="32" cy="32" r="5" fill="#ff7a6b" />
          <circle cx="32" cy="32" r="2" fill="#fff" />
        </g>
      );
    case "hat-headphones":
      return (
        <g {...O}>
          <path d="M19 33 Q32 18 45 33" fill="none" stroke={INK} strokeWidth="3.4" />
          <rect x="16" y="28" width="6" height="10" rx="3" fill={c} />
          <rect x="42" y="28" width="6" height="10" rx="3" fill={c} />
        </g>
      );
    case "hat-tophat":
      return (
        <g {...O}>
          <circle cx="32" cy="32" r="13.5" fill="#2b2633" />
          <circle cx="32" cy="32" r="8.5" fill="#3a3445" />
        </g>
      );
    case "hat-crown":
      return (
        <g {...O}>
          <path d="M22 32 L24 24 L28 29 L32 22 L36 29 L40 24 L42 32 L40 40 L24 40 Z" fill="#ffd166" />
          <circle cx="32" cy="31" r="2" fill="#ff7a6b" />
        </g>
      );
    case "hat-hardhat":
      return (
        <g {...O}>
          <circle cx="32" cy="32" r="15" fill={shade("#ffd166", -0.1)} />
          <circle cx="32" cy="32" r="11" fill="#ffd166" />
          <rect x="30.5" y="21" width="3" height="22" rx="1.5" fill="#f2b632" stroke="none" />
        </g>
      );
    case "hat-chef":
      return (
        <g fill="#fff" {...O}>
          <circle cx="27" cy="29" r="7" />
          <circle cx="37" cy="29" r="7" />
          <circle cx="32" cy="37" r="7" />
        </g>
      );
    case "hat-explorer":
      return (
        <g {...O}>
          <circle cx="32" cy="32" r="17" fill="#c9a46b" />
          <circle cx="32" cy="32" r="10" fill="#b38a50" />
          <path d="M22 32 A10 10 0 0 0 42 32" fill="none" stroke="#7c4dff" strokeWidth="2.4" />
        </g>
      );
    case "hat-grad":
      return (
        <g {...O}>
          <rect x="18" y="18" width="28" height="28" rx="2" transform="rotate(45 32 32)" fill="#2b2633" />
          <circle cx="32" cy="32" r="2" fill="#ffd166" />
          <path d="M32 32 L42 40" stroke="#ffd166" strokeWidth="1.6" />
        </g>
      );
    case "hat-lion":
      return (
        <g fill="#e9a54b" {...O}>
          <circle cx="22" cy="26" r="4.5" />
          <circle cx="42" cy="26" r="4.5" />
        </g>
      );
    case "hat-halo":
      return <circle cx="32" cy="32" r="15" fill="none" stroke="#ffd166" strokeWidth="2.6" opacity="0.9" />;
    default:
      return <circle cx="32" cy="33" r="12" fill={c} {...O} />;
  }
}

function Pet({ id }: { id: string }) {
  if (!id || id === "pet-none") return null;
  const fill: Record<string, string> = {
    "pet-hamster": "#e9a54b",
    "pet-goldfish": "#ff9f43",
    "pet-cat": "#9aa3ad",
    "pet-duck": "#ffd166",
    "pet-dragon": "#5fd3a5",
    "pet-cub": "#e9a54b",
    "pet-robot": "#cfd6de",
    "pet-dog": "#c48a4f",
    "pet-cow": "#f4f0ff",
  };
  const c = fill[id] ?? "#cfd6de";
  return (
    <g className="td-pet" style={{ transformBox: "view-box", transformOrigin: "32px 32px" }}>
      <g transform="translate(52 52)">
        {(id === "pet-cat" || id === "pet-cub" || id === "pet-dog") && (
          <g fill={c} {...O} strokeWidth={1.6}>
            <circle cx="-4" cy="-5" r="2.6" />
            <circle cx="4" cy="-5" r="2.6" />
          </g>
        )}
        {id === "pet-dragon" && <path d="M-7 0 L-12 -5 L-6 -3 Z M7 0 L12 -5 L6 -3 Z" fill={c} {...O} strokeWidth={1.4} />}
        <circle r="6" fill={c} {...O} strokeWidth={1.8} />
        <circle cx="-2" cy="-2" r="0.9" fill={INK} />
        <circle cx="2" cy="-2" r="0.9" fill={INK} />
      </g>
    </g>
  );
}

export const TopDownFigure = memo(function TopDownFigure({
  avatar,
  badge,
  size = 60,
  ghost = false,
}: {
  avatar: Avatar;
  /** Company id whose parody logo is worn on the back. */
  badge: string | null;
  size?: number;
  ghost?: boolean;
}) {
  const skin = col(avatar.skin, "#e3ac7c");
  const handSkin = avatar.head === "head-robot" ? "#cfd6de" : avatar.head === "head-alien" ? "#8ee07a" : skin;
  return (
    <svg viewBox="-4 -4 72 72" width={size} height={size} aria-hidden className={ghost ? "opacity-30" : undefined} style={{ overflow: "visible" }}>
      <ellipse cx="32" cy="38" rx="20" ry="9" fill="rgb(0 0 0 / 22%)" />
      <g className="td-turn" style={{ transformBox: "view-box", transformOrigin: "32px 32px" }}>
        <Pet id={avatar.pet ?? "pet-none"} />
        <Hand cls="td-hand-l" x={13} skin={handSkin} />
        <Hand cls="td-hand-r" x={51} skin={handSkin} held={avatar.held && avatar.held !== "held-none" ? avatar.held : undefined} />
        <g className="td-body" style={{ transformBox: "view-box", transformOrigin: "32px 32px" }}>
          <Shoulders top={avatar.top ?? "top-tee"} />
          <BackPatch badge={badge} />
          <g transform="translate(0 -5)">
            <Head avatar={avatar} />
          </g>
        </g>
      </g>
    </svg>
  );
});

/** Pose a figure: facing angle (radians, 0 = north), walk phase and how much it's walking (0..1). */
export function poseFigure(root: Element, angle: number, phase: number, walk: number, now: number) {
  const turn = root.querySelector<SVGGElement>(".td-turn");
  if (!turn) return;
  const deg = (angle * 180) / Math.PI;
  turn.style.transform = `rotate(${deg}deg)`;
  const s = Math.sin(phase) * walk;
  // Fists swing forward and back in opposite directions, with a little idle sway.
  const idle = Math.sin(now / 520) * 1.2 * (1 - walk);
  const l = root.querySelector<SVGGElement>(".td-hand-l");
  const r = root.querySelector<SVGGElement>(".td-hand-r");
  if (l) l.style.transform = `translate(${-Math.abs(s) * 1.5}px, ${-s * 7 + idle}px)`;
  if (r) r.style.transform = `translate(${Math.abs(s) * 1.5}px, ${s * 7 - idle}px)`;
  const body = root.querySelector<SVGGElement>(".td-body");
  if (body) {
    const breathe = 1 + Math.sin(now / 700) * 0.015 * (1 - walk);
    const squash = 1 + Math.abs(Math.cos(phase)) * 0.045 * walk;
    body.style.transform = `scale(${breathe * squash}, ${breathe / squash})`;
  }
  const pet = root.querySelector<SVGGElement>(".td-pet");
  if (pet) pet.style.transform = `translate(${Math.sin(phase * 0.5) * 2 * walk}px, ${Math.abs(Math.sin(phase)) * -3 * walk}px)`;
}
