import { type Avatar, DEFAULT_AVATAR, cosmeticById } from "@/game/core/cosmetics";

/**
 * IlluminatED City characters: full-body "chibi" figures drawn as flat SVG
 * (big head, expressive eyes, rounded shapes, dark sticker outline, no
 * gradients). Every part is a category from the Locker. Bosses use the same
 * renderer, so the whole cast feels like one world.
 *
 * Head parts are drawn in a 0–200 "head space" (head centred at 100,100) and
 * scaled onto the body, which keeps every hat, hairstyle and pair of glasses
 * aligned whatever the head type.
 */
export type Mood = "happy" | "sad" | "wow" | "cool" | "cross";

// Characters are now Blender-rendered sprites; see ./character.tsx.
export { AvatarFigure } from "./character";

const INK = "#13203a";
const O = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const };
const HEAD_SPACE = "translate(100 90) scale(0.93) translate(-100 -100)";

/** Rough relative luminance (0–1), used to keep faces readable on darker skin tones. */
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

const colour = (id: string, fallback: string) => cosmeticById(id)?.color ?? fallback;

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. Flat shading only. */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** The original flat SVG character (kept as a reference and fallback). */
export function AvatarFigureSvg({
  avatar = DEFAULT_AVATAR,
  mood = "happy",
  size = 200,
  title,
  className,
  showPet = true,
  headOnly = false,
}: {
  avatar?: Avatar;
  mood?: Mood;
  /** Rendered height in px. */
  size?: number;
  title?: string;
  className?: string;
  showPet?: boolean;
  /** Crop to the head and shoulders (for chips and speech bubbles). */
  headOnly?: boolean;
}) {
  const a = { ...DEFAULT_AVATAR, ...avatar };
  const skin = colour(a.skin, "#d09460");
  const hair = colour(a.hairColor, INK);
  const view = headOnly ? "20 10 160 160" : `0 0 ${showPet ? 262 : 200} 300`;
  const [, , w, h] = view.split(" ").map(Number);
  return (
    <svg
      viewBox={view}
      width={(size * w) / h}
      height={size}
      role="img"
      aria-label={title ?? "Your character"}
      className={className}
    >
      <TopBack id={a.top} />
      {a.head === "head-human" && <g transform={HEAD_SPACE}><HairBack style={a.hair} color={hair} /></g>}
      <Legs bottom={a.bottom} skin={skin} />
      <Shoes id={a.shoes} />
      <rect x="89" y="128" width="22" height="26" rx="6" fill={shade(skin, -0.15)} {...O} />
      <Torso id={a.top} skin={skin} />
      <g transform={HEAD_SPACE}>
        <Head type={a.head} skin={skin} />
        <Face avatar={a} mood={mood} skin={skin} />
        {a.head === "head-human" && <HairFront style={a.hair} color={hair} />}
        <Eyewear id={a.face} />
        <Hat id={a.hat} hair={hair} />
      </g>
      <g transform="translate(-10 -6)">
        <Held id={a.held} />
      </g>
      <circle cx="148" cy="216" r="9" fill={skin} {...O} />
      {showPet && !headOnly && (
        <g transform="translate(200 224)">
          <Pet id={a.pet} />
        </g>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Head and face (head space: centre 100,100, radius 58)
// ─────────────────────────────────────────────────────────

function Head({ type, skin }: { type: string; skin: string }) {
  switch (type) {
    case "head-lion":
      return (
        <g>
          {Array.from({ length: 14 }, (_, i) => {
            const t = (i / 14) * Math.PI * 2;
            return <circle key={i} cx={100 + Math.cos(t) * 62} cy={102 + Math.sin(t) * 62} r="20" fill="#c4622d" {...O} />;
          })}
          <circle cx="100" cy="102" r="64" fill="#c4622d" />
          <circle cx="62" cy="54" r="13" fill="#e39b2d" {...O} />
          <circle cx="138" cy="54" r="13" fill="#e39b2d" {...O} />
          <circle cx="100" cy="102" r="56" fill="#e39b2d" {...O} />
          <ellipse cx="100" cy="128" rx="24" ry="17" fill="#ffd9a3" />
          <path d="M92 115 L108 115 L100 124 Z" fill={INK} />
        </g>
      );
    case "head-dog":
      return (
        <g>
          <circle cx="100" cy="100" r="58" fill="#c9a46b" {...O} />
          <ellipse cx="44" cy="108" rx="15" ry="32" fill="#5a3824" transform="rotate(12 44 108)" {...O} />
          <ellipse cx="156" cy="108" rx="15" ry="32" fill="#5a3824" transform="rotate(-12 156 108)" {...O} />
          <ellipse cx="100" cy="130" rx="26" ry="18" fill="#f4efe6" {...O} />
          <ellipse cx="100" cy="118" rx="8" ry="6" fill={INK} />
        </g>
      );
    case "head-cow":
      return (
        <g>
          <path d="M56 58 Q40 40 50 26 Q58 44 72 50 Z" fill="#f4efe6" {...O} />
          <path d="M144 58 Q160 40 150 26 Q142 44 128 50 Z" fill="#f4efe6" {...O} />
          <ellipse cx="38" cy="92" rx="18" ry="9" fill="#f3f6fb" transform="rotate(-20 38 92)" {...O} />
          <ellipse cx="162" cy="92" rx="18" ry="9" fill="#f3f6fb" transform="rotate(20 162 92)" {...O} />
          <circle cx="100" cy="100" r="58" fill="#f3f6fb" {...O} />
          <path d="M60 64 Q72 50 92 58 Q96 74 80 80 Q62 82 60 64 Z" fill={INK} />
          <circle cx="140" cy="76" r="9" fill={INK} />
          <ellipse cx="100" cy="134" rx="30" ry="18" fill="#ff9fcf" {...O} />
          <ellipse cx="90" cy="134" rx="4" ry="5" fill={INK} />
          <ellipse cx="110" cy="134" rx="4" ry="5" fill={INK} />
        </g>
      );
    case "head-robot":
      return (
        <g>
          <line x1="100" y1="40" x2="100" y2="16" stroke={INK} strokeWidth="4" />
          <circle cx="100" cy="14" r="7" fill="#ff7a6b" {...O} />
          <rect x="34" y="92" width="14" height="24" rx="4" fill="#8d85a0" {...O} />
          <rect x="152" y="92" width="14" height="24" rx="4" fill="#8d85a0" {...O} />
          <rect x="44" y="40" width="112" height="112" rx="26" fill="#b3abc4" {...O} />
          <rect x="56" y="68" width="88" height="70" rx="16" fill={INK} />
        </g>
      );
    case "head-alien":
      return (
        <g>
          <path d="M76 50 L62 18" stroke={INK} strokeWidth="4" />
          <path d="M124 50 L138 18" stroke={INK} strokeWidth="4" />
          <circle cx="62" cy="16" r="7" fill="#f2d9a6" {...O} />
          <circle cx="138" cy="16" r="7" fill="#f2d9a6" {...O} />
          <ellipse cx="100" cy="100" rx="58" ry="60" fill="#8de08a" {...O} />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="44" cy="106" r="12" fill={skin} {...O} />
          <circle cx="156" cy="106" r="12" fill={skin} {...O} />
          <circle cx="100" cy="100" r="58" fill={skin} {...O} />
          <circle cx="44" cy="106" r="5" fill={shade(skin, -0.15)} />
          <circle cx="156" cy="106" r="5" fill={shade(skin, -0.15)} />
        </g>
      );
  }
}

const ANIMAL = new Set(["head-lion", "head-dog", "head-cow"]);

function Face({ avatar, mood, skin }: { avatar: Avatar; mood: Mood; skin: string }) {
  const robot = avatar.head === "head-robot";
  const eyeInk = robot ? "#6bc6ff" : INK;
  const mouthY = ANIMAL.has(avatar.head) ? 142 : robot ? 124 : 128;
  const eyeY = robot ? 96 : 104;
  const cheekFill = avatar.extras === "extras-rosy" ? "#ff7a8f" : "#ff8fa3";
  const human = avatar.head === "head-human" || avatar.head === "head-alien";
  return (
    <g>
      {human && (
        <>
          <circle cx="68" cy="124" r="9" fill={cheekFill} opacity={avatar.extras === "extras-rosy" ? 0.6 : 0.25} />
          <circle cx="132" cy="124" r="9" fill={cheekFill} opacity={avatar.extras === "extras-rosy" ? 0.6 : 0.25} />
          <Extras id={avatar.extras} skin={skin} />
        </>
      )}
      {human &&
        luminance(skin) < 0.3 &&
        (mood === "happy" || mood === "cross") &&
        ["eyes-round", "eyes-sparkle", "eyes-focused", "eyes-dots"].includes(avatar.eyes) && (
        <g fill="#fff">
          <ellipse cx="80" cy={eyeY} rx="10" ry="11.5" />
          <ellipse cx="120" cy={eyeY} rx="10" ry="11.5" />
        </g>
      )}
      <Eyes style={avatar.eyes} mood={mood} ink={eyeInk} y={eyeY} />
      {!robot && <Brows style={avatar.brows} mood={mood} />}
      <Mouth style={avatar.mouth} mood={mood} y={mouthY} ink={eyeInk} robot={robot} />
    </g>
  );
}

function Eyes({ style, mood, ink, y }: { style: string; mood: Mood; ink: string; y: number }) {
  const both = (draw: (x: number, side: -1 | 1) => React.ReactNode) => (
    <>
      {draw(80, -1)}
      {draw(120, 1)}
    </>
  );
  if (mood === "wow")
    return both((x) => (
      <g key={x}>
        <circle cx={x} cy={y} r="11" fill="#fff" {...O} />
        <circle cx={x} cy={y + 1} r="5" fill={ink} />
      </g>
    ));
  if (mood === "cool")
    return both((x) => <path key={x} d={`M${x - 9} ${y + 3} Q${x} ${y - 9} ${x + 9} ${y + 3}`} fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />);
  if (mood === "sad")
    return (
      <>
        {both((x) => <ellipse key={x} cx={x} cy={y + 4} rx="5" ry="6" fill={ink} />)}
        <path d={`M132 ${y + 10} q-5 9 0 13 q5 -4 0 -13z`} fill="#6bc6ff" {...O} strokeWidth={2} />
      </>
    );
  switch (style) {
    case "eyes-sparkle":
      return both((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx="8" ry="10" fill={ink} />
          <circle cx={x + 3} cy={y - 4} r="3.2" fill="#fff" />
          <circle cx={x - 3} cy={y + 4} r="1.6" fill="#fff" />
        </g>
      ));
    case "eyes-sleepy":
      return both((x) => (
        <g key={x}>
          <path d={`M${x - 8} ${y} Q${x} ${y + 9} ${x + 8} ${y} Z`} fill={ink} />
          <path d={`M${x - 10} ${y} L${x + 10} ${y}`} stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      ));
    case "eyes-wink":
      return (
        <>
          <ellipse cx="80" cy={y} rx="6" ry="7.5" fill={ink} />
          <circle cx="82" cy={y - 3} r="2" fill="#fff" />
          <path d={`M111 ${y + 2} Q120 ${y - 7} 129 ${y + 2}`} fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
        </>
      );
    case "eyes-focused":
      return both((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y + 1} rx="6.5" ry="7" fill={ink} />
          <path d={`M${x - 10} ${y - 5} L${x + 10} ${y - 5}`} stroke={ink} strokeWidth="4" strokeLinecap="round" />
          <circle cx={x + 2} cy={y} r="1.8" fill="#fff" />
        </g>
      ));
    case "eyes-dots":
      return both((x) => <circle key={x} cx={x} cy={y} r="4.5" fill={ink} />);
    default:
      return both((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx="6" ry="7.5" fill={ink} />
          <circle cx={x + 2} cy={y - 3} r="2" fill="#fff" />
        </g>
      ));
  }
}

function Brows({ style, mood }: { style: string; mood: Mood }) {
  const line = (d: string, w = 4) => <path d={d} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" />;
  if (mood === "sad") return <>{line("M70 86 L88 82")}{line("M130 86 L112 82")}</>;
  if (mood === "cross" || style === "brows-fierce") return <>{line("M70 80 L90 88", 5)}{line("M130 80 L110 88", 5)}</>;
  switch (style) {
    case "brows-bold":
      return (
        <>
          <rect x="70" y="80" width="20" height="7" rx="3.5" fill={INK} />
          <rect x="110" y="80" width="20" height="7" rx="3.5" fill={INK} />
        </>
      );
    case "brows-raised":
      return <>{line("M70 80 Q80 70 90 78")}{line("M110 78 Q120 70 130 80")}</>;
    case "brows-none":
      return null;
    default:
      return <>{line("M71 86 Q80 81 89 85", 3.5)}{line("M111 85 Q120 81 129 86", 3.5)}</>;
  }
}

function Mouth({ style, mood, y, ink, robot }: { style: string; mood: Mood; y: number; ink: string; robot: boolean }) {
  const stroke = { fill: "none", stroke: ink, strokeWidth: 4.5, strokeLinecap: "round" as const };
  if (robot && mood === "happy" && style !== "mouth-laugh")
    return (
      <g>
        {[-12, -4, 4, 12].map((dx) => (
          <rect key={dx} x={100 + dx - 2.5} y={y - 2} width="5" height="8" rx="1.5" fill={ink} />
        ))}
      </g>
    );
  if (mood === "wow") return <ellipse cx="100" cy={y + 2} rx="7" ry="9" fill={INK} />;
  if (mood === "sad") return <path d={`M86 ${y + 6} Q100 ${y - 6} 114 ${y + 6}`} {...stroke} />;
  if (mood === "cross") return <path d={`M86 ${y + 2} q5 -4 10 0 t10 0 t8 0`} {...stroke} />;
  if (mood === "cool")
    return (
      <g>
        <path d={`M84 ${y - 3} Q100 ${y + 22} 116 ${y - 3} Z`} fill={INK} />
        <ellipse cx="100" cy={y + 9} rx="7" ry="4" fill="#ff7a6b" />
      </g>
    );
  switch (style) {
    case "mouth-grin":
      return <path d={`M85 ${y - 3} Q100 ${y + 18} 115 ${y - 3} Z`} fill="#fff" {...O} />;
    case "mouth-laugh":
      return (
        <g>
          <path d={`M85 ${y - 4} Q100 ${y + 22} 115 ${y - 4} Z`} fill={INK} />
          <ellipse cx="100" cy={y + 9} rx="7" ry="4" fill="#ff7a6b" />
        </g>
      );
    case "mouth-smirk":
      return <path d={`M90 ${y + 3} Q104 ${y + 8} 114 ${y - 3}`} {...stroke} />;
    case "mouth-cheeky":
      return (
        <g>
          <path d={`M101 ${y + 3} q0 9 6 9 q6 0 6 -9`} fill="#ff7a6b" {...O} strokeWidth={2.5} />
          <path d={`M86 ${y} Q100 ${y + 10} 116 ${y}`} {...stroke} />
        </g>
      );
    case "mouth-small":
      return <ellipse cx="100" cy={y + 3} rx="4.5" ry="3.5" fill={INK} />;
    default:
      return <path d={`M86 ${y} Q100 ${y + 14} 114 ${y}`} {...stroke} />;
  }
}

function Extras({ id, skin }: { id: string; skin: string }) {
  switch (id) {
    case "extras-freckles":
      return (
        <g fill={shade(skin, -0.35)}>
          {[[62, 116], [68, 120], [60, 124], [138, 116], [132, 120], [140, 124]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" />
          ))}
        </g>
      );
    case "extras-star":
      return <path d="M136 112 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#ffd166" {...O} strokeWidth={2} />;
    case "extras-plaster":
      return (
        <g transform="rotate(-25 134 116)">
          <rect x="120" y="110" width="28" height="11" rx="5" fill="#f1c09a" {...O} strokeWidth={2} />
          <rect x="130" y="110" width="8" height="11" fill="#e3ac7c" />
        </g>
      );
    case "extras-paint":
      return (
        <g fill="#2b5fd9">
          <rect x="62" y="114" width="20" height="5" rx="2.5" />
          <rect x="64" y="122" width="16" height="5" rx="2.5" fill="#f2d9a6" />
          <rect x="118" y="114" width="20" height="5" rx="2.5" />
          <rect x="120" y="122" width="16" height="5" rx="2.5" fill="#f2d9a6" />
        </g>
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────
// Hair (head space)
// ─────────────────────────────────────────────────────────

function HairBack({ style, color }: { style: string; color: string }) {
  const f = { fill: color, ...O };
  switch (style) {
    case "hair-long":
      return <path d="M38 100 Q38 36 100 36 Q162 36 162 100 L168 190 Q100 210 32 190 Z" {...f} />;
    case "hair-bob":
      return <rect x="34" y="44" width="132" height="108" rx="46" {...f} />;
    case "hair-ponytail":
      return (
        <g>
          <ellipse cx="168" cy="96" rx="17" ry="40" transform="rotate(-28 168 96)" {...f} />
          <circle cx="152" cy="62" r="9" fill="#8fb4ff" {...O} />
        </g>
      );
    case "hair-braids":
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <ellipse cx="42" cy={126 + i * 17} rx="11" ry="11" {...f} />
              <ellipse cx="158" cy={126 + i * 17} rx="11" ry="11" {...f} />
            </g>
          ))}
          <circle cx="42" cy="210" r="6" fill="#8fb4ff" {...O} />
          <circle cx="158" cy="210" r="6" fill="#8fb4ff" {...O} />
        </g>
      );
    case "hair-afro":
      return <circle cx="100" cy="88" r="80" {...f} />;
    case "hair-buns":
      return (
        <g>
          <circle cx="56" cy="46" r="24" {...f} />
          <circle cx="144" cy="46" r="24" {...f} />
        </g>
      );
    default:
      return null;
  }
}

function HairFront({ style, color }: { style: string; color: string }) {
  const f = { fill: color, ...O };
  switch (style) {
    case "hair-bald":
      return <path d="M76 56 Q92 48 110 50" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.5" />;
    case "hair-curly":
      return (
        <g>
          {[
            [46, 84], [56, 62], [74, 46], [100, 40], [126, 46], [144, 62], [154, 84],
            [66, 70], [88, 58], [112, 58], [134, 70],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="17" {...f} />
          ))}
        </g>
      );
    case "hair-buzz":
      return <path d="M44 94 Q46 40 100 40 Q154 40 156 94 Q130 68 100 68 Q70 68 44 94 Z" fill={color} opacity="0.9" />;
    case "hair-afro":
      return <path d="M46 88 Q60 50 100 50 Q140 50 154 88 Q128 72 100 74 Q72 72 46 88 Z" fill={color} />;
    case "hair-spiky":
      return <path d="M40 102 L34 66 L58 72 L54 32 L80 56 L92 18 L106 52 L128 22 L130 58 L156 38 L148 72 L168 70 L160 102 Q140 72 100 72 Q60 72 40 102 Z" {...f} />;
    case "hair-mohawk":
      return (
        <g>
          <path d="M84 62 L88 14 L100 0 L112 14 L116 62 Q100 56 84 62 Z" {...f} />
          <path d="M46 96 Q50 60 72 52 L74 60 Q56 74 46 96 Z" fill={color} opacity="0.55" />
          <path d="M154 96 Q150 60 128 52 L126 60 Q144 74 154 96 Z" fill={color} opacity="0.55" />
        </g>
      );
    case "hair-bob":
      return <path d="M40 104 Q38 38 100 38 Q162 38 160 104 L152 104 Q150 80 140 76 L60 76 Q50 80 48 104 Z" {...f} />;
    case "hair-quiff":
      return <path d="M44 98 Q42 52 70 44 Q78 18 112 20 Q142 24 134 44 Q158 54 156 98 Q150 74 130 68 Q110 62 90 68 Q66 72 44 98 Z" {...f} />;
    case "hair-long":
    case "hair-braids":
    case "hair-ponytail":
      return <path d="M40 106 Q38 38 100 36 Q162 38 160 106 Q150 76 122 66 Q118 80 100 82 Q82 78 80 64 Q52 74 40 106 Z" {...f} />;
    case "hair-buns":
    case "hair-short":
    default:
      return <path d="M40 102 Q38 36 100 36 Q162 36 160 102 Q156 78 142 70 Q138 80 124 76 Q118 64 100 66 Q86 80 70 72 Q56 78 40 102 Z" {...f} />;
  }
}

// ─────────────────────────────────────────────────────────
// Body (body space: torso 64–136 × 150–222, hands at 52/148,216)
// ─────────────────────────────────────────────────────────

const TOPS: Record<string, { sleeves: "short" | "long"; sleeve?: string }> = {
  "top-tee": { sleeves: "short" },
  "top-stripes": { sleeves: "short" },
  "top-polo": { sleeves: "short" },
  "top-jersey": { sleeves: "short" },
  "top-hivis": { sleeves: "short", sleeve: "#2d1b69" },
  "top-apron": { sleeves: "short", sleeve: "#2d1b69" },
  "top-cape": { sleeves: "short", sleeve: "#2d1b69" },
};

function TopBack({ id }: { id: string }) {
  if (id !== "top-cape") return null;
  return <path d="M70 156 Q40 230 52 268 L148 268 Q160 230 130 156 Z" fill="#2b5fd9" {...O} />;
}

function Torso({ id, skin }: { id: string; skin: string }) {
  const color = colour(id, "#2d1b69");
  const spec = TOPS[id] ?? { sleeves: "long" as const };
  const sleeve = spec.sleeve ?? color;
  const base = id === "top-apron" || id === "top-cape" || id === "top-hivis" ? "#2d1b69" : color;
  const dark = shade(base, -0.25);
  const torso = "M64 178 Q64 152 88 150 L112 150 Q136 152 136 178 L134 222 L66 222 Z";
  const arm = (x1: number, x2: number) => {
    const elbowX = x1 + (x2 - x1) * 0.45;
    return (
      <g>
        <line x1={x1} y1="160" x2={x2} y2="214" stroke={INK} strokeWidth="21" strokeLinecap="round" />
        <line x1={x1} y1="160" x2={x2} y2="214" stroke={spec.sleeves === "long" ? sleeve : skin} strokeWidth="15" strokeLinecap="round" />
        {spec.sleeves === "short" && (
          <line x1={x1} y1="160" x2={elbowX} y2="184" stroke={sleeve} strokeWidth="15" strokeLinecap="round" />
        )}
      </g>
    );
  };
  return (
    <g>
      {arm(70, 54)}
      {arm(130, 146)}
      <path d={torso} fill={base} {...O} />
      <TopDetail id={id} color={color} dark={dark} />
      <circle cx="52" cy="216" r="9" fill={skin} {...O} />
    </g>
  );
}

function TopDetail({ id, color, dark }: { id: string; color: string; dark: string }) {
  switch (id) {
    case "top-tee":
      return (
        <g>
          <path d="M88 151 Q100 162 112 151" fill="none" stroke={dark} strokeWidth="4" />
          <circle cx="100" cy="186" r="12" fill="#0d1726" />
          <text x="100" y="192" textAnchor="middle" fontSize="16" fontWeight="800" fill="#f2d9a6">i</text>
        </g>
      );
    case "top-hoodie":
      return (
        <g>
          <path d="M78 152 Q100 180 122 152" fill={dark} {...O} />
          <line x1="94" y1="166" x2="92" y2="186" stroke="#e9e6f2" strokeWidth="3" strokeLinecap="round" />
          <line x1="106" y1="166" x2="108" y2="186" stroke="#e9e6f2" strokeWidth="3" strokeLinecap="round" />
          <rect x="80" y="196" width="40" height="18" rx="7" fill={dark} />
        </g>
      );
    case "top-stripes":
      return (
        <g fill="#2b5fd9">
          {[164, 180, 196, 212].map((y) => (
            <rect key={y} x="66" y={y} width="68" height="7" />
          ))}
          <path d="M88 151 Q100 160 112 151" fill="none" stroke={INK} strokeWidth="3" />
        </g>
      );
    case "top-polo":
      return (
        <g>
          <path d="M88 150 L100 166 L112 150" fill={dark} {...O} strokeWidth={2} />
          <circle cx="100" cy="172" r="2.5" fill="#fff" />
          <circle cx="100" cy="182" r="2.5" fill="#fff" />
          <rect x="116" y="176" width="10" height="4" rx="2" fill="#2d1b69" />
        </g>
      );
    case "top-knit":
      return (
        <g>
          <path d="M70 176 l10 8 10 -8 10 8 10 -8 10 8 10 -8 6 4" fill="none" stroke="#ffd166" strokeWidth="4" />
          <path d="M70 196 l10 8 10 -8 10 8 10 -8 10 8 10 -8 6 4" fill="none" stroke="#fff" strokeWidth="4" />
          <rect x="66" y="212" width="68" height="10" fill={dark} />
        </g>
      );
    case "top-apron":
      return (
        <g>
          <path d="M78 164 L122 164 L126 222 L74 222 Z" fill={color} {...O} />
          <path d="M80 164 L86 151 M120 164 L114 151" stroke={color} strokeWidth="5" />
          <rect x="88" y="190" width="24" height="16" rx="4" fill={shade(color, -0.12)} />
        </g>
      );
    case "top-denim":
      return (
        <g>
          <path d="M90 151 L110 151 L108 222 L92 222 Z" fill="#f3f6fb" />
          <path d="M84 150 L96 172 L90 222 M116 150 L104 172 L110 222" fill="none" stroke={INK} strokeWidth="3" />
          <rect x="70" y="176" width="14" height="12" rx="2" fill={dark} />
          <rect x="116" y="176" width="14" height="12" rx="2" fill={dark} />
        </g>
      );
    case "top-jersey":
      return (
        <g>
          <path d="M88 151 L100 162 L112 151" fill="none" stroke="#fff" strokeWidth="5" />
          <text x="100" y="204" textAnchor="middle" fontSize="30" fontWeight="900" fill="#fff">10</text>
        </g>
      );
    case "top-suit":
    case "top-tux":
      return (
        <g>
          <path d="M86 150 L100 196 L114 150 Z" fill="#f3f6fb" />
          {id === "top-suit" ? (
            <path d="M96 158 L104 158 L106 188 L100 196 L94 188 Z" fill="#8fb4ff" />
          ) : (
            <path d="M89 158 L100 164 L111 158 L111 170 L100 164 L89 170 Z" fill="#0d1726" />
          )}
          <path d="M84 150 L100 196 L76 176 Z" fill={shade(color, 0.14)} {...O} strokeWidth={2} />
          <path d="M116 150 L100 196 L124 176 Z" fill={shade(color, 0.14)} {...O} strokeWidth={2} />
          <circle cx="100" cy="206" r="2.5" fill="#f3f6fb" />
        </g>
      );
    case "top-astronaut":
      return (
        <g>
          <rect x="78" y="172" width="44" height="30" rx="6" fill="#2b5fd9" {...O} strokeWidth={2} />
          <circle cx="88" cy="182" r="4" fill="#f2d9a6" />
          <circle cx="100" cy="182" r="4" fill="#ff7a6b" />
          <circle cx="112" cy="182" r="4" fill="#ffd166" />
          <rect x="84" y="192" width="32" height="5" rx="2.5" fill="#0d1726" />
          <path d="M74 152 Q100 142 126 152 L126 160 Q100 150 74 160 Z" fill="#b3abc4" {...O} strokeWidth={2} />
        </g>
      );
    case "top-cape":
      return (
        <g>
          <circle cx="100" cy="186" r="13" fill="#ffd166" {...O} strokeWidth={2} />
          <text x="100" y="192" textAnchor="middle" fontSize="16" fontWeight="900" fill={INK}>P</text>
          <circle cx="76" cy="156" r="5" fill="#ffd166" {...O} strokeWidth={2} />
          <circle cx="124" cy="156" r="5" fill="#ffd166" {...O} strokeWidth={2} />
        </g>
      );
    case "top-labcoat":
      return (
        <g>
          <path d="M90 151 L100 222 L110 151 Z" fill="#2b5fd9" />
          <line x1="100" y1="160" x2="100" y2="222" stroke="#d8d4e0" strokeWidth="2" />
          <rect x="112" y="184" width="18" height="14" rx="3" fill="#e9e6f2" {...O} strokeWidth={2} />
          <rect x="116" y="178" width="3" height="11" fill="#ff7a6b" />
          <rect x="122" y="178" width="3" height="11" fill="#6bc6ff" />
        </g>
      );
    case "top-hivis":
      return (
        <g>
          <path d="M72 152 L94 152 L96 222 L68 222 Z M106 152 L128 152 L132 222 L104 222 Z" fill={color} {...O} strokeWidth={2} />
          <rect x="68" y="190" width="28" height="6" fill="#e9e6f2" />
          <rect x="104" y="190" width="28" height="6" fill="#e9e6f2" />
          <rect x="68" y="206" width="28" height="6" fill="#e9e6f2" />
          <rect x="104" y="206" width="28" height="6" fill="#e9e6f2" />
        </g>
      );
    case "top-tracksuit":
      return (
        <g>
          <line x1="100" y1="152" x2="100" y2="222" stroke={INK} strokeWidth="3" />
          <path d="M68 168 L66 222 M132 168 L134 222" stroke="#fff" strokeWidth="5" />
          <path d="M86 150 L100 162 L114 150" fill="none" stroke="#fff" strokeWidth="4" />
        </g>
      );
    default:
      return null;
  }
}

function Legs({ bottom, skin }: { bottom: string; skin: string }) {
  const c = colour(bottom, "#3c5a9a");
  const dark = shade(c, -0.25);
  const leg = (x: number, fill: string, y1 = 218, y2 = 268) => (
    <rect x={x} y={y1} width="26" height={y2 - y1} rx="6" fill={fill} {...O} />
  );
  switch (bottom) {
    case "bottom-shorts":
      return (
        <g>
          {leg(74, skin, 230)}
          {leg(100, skin, 230)}
          <path d="M66 216 L134 216 L136 244 L102 244 L100 232 L98 244 L64 244 Z" fill={c} {...O} />
        </g>
      );
    case "bottom-skirt":
      return (
        <g>
          {leg(76, skin, 236)}
          {leg(98, skin, 236)}
          <path d="M68 214 L132 214 L144 250 L56 250 Z" fill={c} {...O} />
          <path d="M84 216 L80 250 M100 216 L100 250 M116 216 L120 250" stroke={dark} strokeWidth="3" />
        </g>
      );
    default:
      return (
        <g>
          {leg(72, c)}
          {leg(102, c)}
          <rect x="66" y="212" width="68" height="16" rx="5" fill={c} {...O} />
          {bottom === "bottom-joggers" && (
            <>
              <rect x="72" y="258" width="26" height="8" fill={dark} />
              <rect x="102" y="258" width="26" height="8" fill={dark} />
              <path d="M76 222 L76 256 M124 222 L124 256" stroke="#fff" strokeWidth="3" />
            </>
          )}
          {bottom === "bottom-cargo" && (
            <>
              <rect x="74" y="236" width="14" height="12" rx="2" fill={dark} {...O} strokeWidth={2} />
              <rect x="112" y="236" width="14" height="12" rx="2" fill={dark} {...O} strokeWidth={2} />
            </>
          )}
          {bottom === "bottom-smart" && <path d="M85 224 L85 264 M115 224 L115 264" stroke={dark} strokeWidth="2" />}
          {bottom === "bottom-tartan" && (
            <g stroke="#ffd166" strokeWidth="2.5">
              <path d="M74 232 H96 M74 248 H96 M104 232 H126 M104 248 H126" />
              <path d="M84 220 V266 M114 220 V266" stroke={INK} strokeWidth="2" />
            </g>
          )}
          {bottom === "bottom-jeans" && <path d="M100 214 L100 224 M88 216 Q86 222 78 222" stroke={dark} strokeWidth="2" fill="none" />}
        </g>
      );
  }
}

function Shoes({ id }: { id: string }) {
  const c = colour(id, "#f3f6fb");
  const pair = (draw: (x: number, dir: -1 | 1) => React.ReactNode) => (
    <>
      {draw(85, -1)}
      {draw(115, 1)}
    </>
  );
  const sneaker = (x: number, dir: -1 | 1, fill: string, top = 262) => (
    <g key={x}>
      <path
        d={`M${x - 14} ${top} L${x + 14} ${top} L${x + 14 + (dir > 0 ? 8 : 0)} ${top + 14} Q${x + 14 + (dir > 0 ? 8 : 0)} ${top + 20} ${x + 8} ${top + 20} L${x - 8} ${top + 20} Q${x - 14 - (dir < 0 ? 8 : 0)} ${top + 20} ${x - 14 - (dir < 0 ? 8 : 0)} ${top + 14} Z`}
        fill={fill}
        {...O}
      />
    </g>
  );
  switch (id) {
    case "shoes-hightops":
      return pair((x, d) => (
        <g key={x}>
          {sneaker(x, d, c, 254)}
          <rect x={x - 14} y="268" width="28" height="6" fill="#fff" />
        </g>
      ));
    case "shoes-boots":
      return pair((x, d) => sneaker(x, d, c, 252));
    case "shoes-sliders":
      return pair((x, d) => (
        <g key={x}>
          <rect x={x - 13} y="246" width="26" height="24" rx="6" fill="#fff" {...O} />
          <rect x={x - 16 + (d > 0 ? 4 : -4)} y="272" width="32" height="8" rx="4" fill={c} {...O} />
          <rect x={x - 14} y="262" width="28" height="9" rx="3" fill="#2b5fd9" {...O} strokeWidth={2} />
        </g>
      ));
    case "shoes-smart":
      return pair((x, d) => sneaker(x, d, c, 264));
    case "shoes-skates":
      return pair((x, d) => (
        <g key={x}>
          {sneaker(x, d, c, 252)}
          <circle cx={x - 8} cy="282" r="5" fill="#ffd166" {...O} strokeWidth={2} />
          <circle cx={x + 8} cy="282" r="5" fill="#ffd166" {...O} strokeWidth={2} />
        </g>
      ));
    case "shoes-rocket":
      return pair((x, d) => (
        <g key={x}>
          <path d={`M${x - 10} 282 L${x} 298 L${x + 10} 282 Z`} fill="#ff7a6b" />
          <path d={`M${x - 5} 282 L${x} 292 L${x + 5} 282 Z`} fill="#ffd166" />
          {sneaker(x, d, c, 254)}
          <rect x={x - 14} y="262" width="28" height="5" fill="#2b5fd9" />
        </g>
      ));
    default:
      return pair((x, d) => (
        <g key={x}>
          {sneaker(x, d, c)}
          <path d={`M${x - 12} 276 L${x + 12} 276`} stroke="#2b5fd9" strokeWidth="3" />
        </g>
      ));
  }
}

// ─────────────────────────────────────────────────────────
// Accessories (head space)
// ─────────────────────────────────────────────────────────

function Eyewear({ id }: { id: string }) {
  switch (id) {
    case "face-round":
      return (
        <g fill="none" stroke={INK} strokeWidth="4">
          <circle cx="80" cy="104" r="14" />
          <circle cx="120" cy="104" r="14" />
          <path d="M94 102 Q100 98 106 102" />
        </g>
      );
    case "face-star": {
      const star = (cx: number) =>
        Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 ? 8 : 18;
          const t = (Math.PI / 5) * i - Math.PI / 2;
          return `${cx + r * Math.cos(t)},${104 + r * Math.sin(t)}`;
        }).join(" ");
      return (
        <g>
          <polygon points={star(80)} fill="#ff8fd1" {...O} />
          <polygon points={star(120)} fill="#ff8fd1" {...O} />
          <path d="M96 102 L104 102" stroke={INK} strokeWidth="4" />
        </g>
      );
    }
    case "face-vr":
      return (
        <g>
          <rect x="44" y="98" width="14" height="10" fill={INK} />
          <rect x="142" y="98" width="14" height="10" fill={INK} />
          <rect x="54" y="86" width="92" height="34" rx="13" fill="#6bc6ff" {...O} />
          <rect x="62" y="93" width="76" height="8" rx="4" fill="#fff" opacity="0.6" />
        </g>
      );
    case "face-shades":
      return (
        <g fill={INK}>
          <path d="M58 94 L96 94 L92 114 Q78 121 64 112 Z" />
          <path d="M104 94 L142 94 L136 112 Q122 121 108 114 Z" />
          <rect x="54" y="92" width="92" height="6" rx="2" />
          <rect x="66" y="100" width="12" height="3" fill="#fff" opacity="0.5" />
        </g>
      );
    case "face-monocle":
      return (
        <g fill="none" stroke="#ffd166" strokeWidth="4">
          <circle cx="120" cy="104" r="15" />
          <path d="M133 113 Q146 150 134 176" strokeWidth="2" />
        </g>
      );
    default:
      return null;
  }
}

function Hat({ id, hair }: { id: string; hair: string }) {
  const c = cosmeticById(id)?.color ?? "#8fb4ff";
  switch (id) {
    case "hat-cap":
      return (
        <g>
          <path d="M42 78 Q46 26 100 26 Q154 26 158 78 Z" fill={c} {...O} />
          <path d="M42 78 L158 78 Q182 80 188 90 L42 90 Z" fill={shade(c, -0.3)} {...O} />
          <circle cx="100" cy="28" r="5" fill={shade(c, -0.3)} />
        </g>
      );
    case "hat-beanie":
      return (
        <g>
          <path d="M42 80 Q44 24 100 24 Q156 24 158 80 Z" fill={c} {...O} />
          <rect x="36" y="68" width="128" height="22" rx="9" fill={shade(c, -0.22)} {...O} />
          <circle cx="100" cy="20" r="13" fill="#f3f6fb" {...O} />
        </g>
      );
    case "hat-party":
      return (
        <g>
          <path d="M100 -6 L134 56 L66 56 Z" fill={c} {...O} />
          <path d="M84 26 L116 26 M76 42 L124 42" stroke="#2b5fd9" strokeWidth="5" />
          <circle cx="100" cy="-6" r="8" fill="#ff7a6b" {...O} />
        </g>
      );
    case "hat-headphones":
      return (
        <g>
          <path d="M40 104 Q38 30 100 30 Q162 30 160 104" fill="none" stroke={INK} strokeWidth="10" />
          <path d="M40 104 Q38 30 100 30 Q162 30 160 104" fill="none" stroke="#2b5fd9" strokeWidth="5" />
          <rect x="28" y="88" width="24" height="36" rx="10" fill={c} {...O} />
          <rect x="148" y="88" width="24" height="36" rx="10" fill={c} {...O} />
          <circle cx="40" cy="106" r="5" fill="#f2d9a6" />
          <circle cx="160" cy="106" r="5" fill="#f2d9a6" />
        </g>
      );
    case "hat-tophat":
      return (
        <g transform="rotate(-10 110 40)">
          <rect x="80" y="2" width="52" height="46" rx="4" fill={c} {...O} />
          <rect x="80" y="34" width="52" height="8" fill="#8fb4ff" />
          <rect x="66" y="44" width="80" height="10" rx="5" fill={c} {...O} />
        </g>
      );
    case "hat-crown":
      return (
        <g>
          <path d="M54 62 L58 18 L80 42 L100 10 L120 42 L142 18 L146 62 Z" fill={c} {...O} />
          <circle cx="100" cy="48" r="6" fill="#ff7a6b" {...O} strokeWidth={2} />
          <circle cx="76" cy="54" r="4" fill="#6bc6ff" />
          <circle cx="124" cy="54" r="4" fill="#5fd3a5" />
        </g>
      );
    case "hat-hardhat":
      return (
        <g>
          <path d="M44 76 Q46 22 100 22 Q154 22 156 76 Z" fill={c} {...O} />
          <rect x="30" y="70" width="140" height="14" rx="7" fill={shade(c, -0.2)} {...O} />
          <rect x="93" y="24" width="14" height="48" rx="5" fill={shade(c, 0.3)} />
        </g>
      );
    case "hat-chef":
      return (
        <g fill={c} {...O}>
          <rect x="60" y="38" width="80" height="36" />
          <circle cx="68" cy="32" r="19" />
          <circle cx="100" cy="18" r="23" />
          <circle cx="132" cy="32" r="19" />
          <rect x="58" y="60" width="84" height="18" rx="5" />
        </g>
      );
    case "hat-explorer":
      return (
        <g>
          <ellipse cx="100" cy="72" rx="84" ry="13" fill={shade(c, -0.2)} {...O} />
          <path d="M56 72 Q58 26 100 26 Q142 26 144 72 Z" fill={c} {...O} />
          <rect x="57" y="58" width="86" height="9" fill="#2b5fd9" />
        </g>
      );
    case "hat-grad":
      return (
        <g>
          <path d="M58 60 Q60 44 100 44 Q140 44 142 60 L142 76 L58 76 Z" fill={c} {...O} />
          <path d="M100 14 L176 38 L100 62 L24 38 Z" fill={shade(c, 0.15)} {...O} />
          <path d="M100 38 L162 48 L162 80" fill="none" stroke="#ffd166" strokeWidth="3" />
          <circle cx="162" cy="82" r="6" fill="#ffd166" {...O} strokeWidth={2} />
        </g>
      );
    case "hat-lion":
      return (
        <g>
          <circle cx="58" cy="48" r="21" fill={c} {...O} />
          <circle cx="142" cy="48" r="21" fill={c} {...O} />
          <circle cx="58" cy="48" r="10" fill="#ffd9a3" />
          <circle cx="142" cy="48" r="10" fill="#ffd9a3" />
          <path d="M60 50 Q100 28 140 50" fill="none" stroke={hair} strokeWidth="6" />
        </g>
      );
    case "hat-halo":
      return <ellipse cx="100" cy="14" rx="40" ry="10" fill="none" stroke={c} strokeWidth="7" />;
    default:
      return null;
  }
}

function Held({ id }: { id: string }) {
  switch (id) {
    case "held-coffee":
      return (
        <g>
          <path d="M150 196 L176 196 L172 228 L154 228 Z" fill="#f3f6fb" {...O} />
          <rect x="148" y="190" width="30" height="8" rx="3" fill="#2b5fd9" {...O} strokeWidth={2} />
          <rect x="152" y="206" width="22" height="10" fill="#8fb4ff" />
          <path d="M158 184 q4 -6 0 -12 M168 184 q4 -6 0 -12" stroke="#b3abc4" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case "held-phone":
      return (
        <g transform="rotate(12 166 206)">
          <rect x="156" y="186" width="22" height="38" rx="5" fill={INK} {...O} />
          <rect x="159" y="191" width="16" height="26" rx="2" fill="#6bc6ff" />
          <circle cx="167" cy="204" r="4" fill="#ffd166" />
        </g>
      );
    case "held-croissant":
      return <path d="M144 214 Q160 188 186 206 Q180 214 174 210 Q168 222 160 216 Q152 224 144 214 Z" fill="#ffb26b" {...O} />;
    case "held-briefcase":
      return (
        <g>
          <rect x="150" y="226" width="44" height="32" rx="5" fill="#5a3824" {...O} />
          <rect x="164" y="218" width="16" height="10" rx="3" fill="none" stroke={INK} strokeWidth="4" />
          <rect x="168" y="236" width="8" height="6" fill="#ffd166" />
        </g>
      );
    case "held-mic":
      return (
        <g>
          <rect x="154" y="198" width="8" height="32" rx="3" fill="#2c2440" {...O} strokeWidth={2} />
          <circle cx="158" cy="192" r="11" fill="#b3abc4" {...O} />
        </g>
      );
    case "held-laptop":
      return (
        <g transform="translate(-40 0)">
          <rect x="120" y="196" width="60" height="38" rx="4" fill="#d8d4e0" {...O} />
          <rect x="125" y="201" width="50" height="28" rx="2" fill="#6bc6ff" />
          <rect x="112" y="234" width="76" height="8" rx="3" fill="#b3abc4" {...O} strokeWidth={2} />
        </g>
      );
    case "held-trophy":
      return (
        <g>
          <path d="M148 182 L184 182 L180 206 Q166 218 152 206 Z" fill="#ffd166" {...O} />
          <rect x="162" y="212" width="8" height="12" fill="#ffd166" />
          <rect x="154" y="224" width="24" height="8" rx="2" fill="#ffd166" {...O} strokeWidth={2} />
          <path d="M166 188 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z" fill="#fff" />
        </g>
      );
    case "held-compass":
      return (
        <g>
          <circle cx="166" cy="204" r="16" fill="#ffd166" {...O} />
          <circle cx="166" cy="204" r="11" fill="#f3f6fb" />
          <path d="M166 194 L170 204 L166 214 L162 204 Z" fill="#ff7a6b" />
        </g>
      );
    default:
      return null;
  }
}

function Pet({ id }: { id: string }) {
  switch (id) {
    case "pet-hamster":
      return (
        <g>
          <ellipse cx="28" cy="46" rx="24" ry="18" fill="#e3ac7c" {...O} />
          <circle cx="14" cy="32" r="7" fill="#e3ac7c" {...O} />
          <circle cx="40" cy="32" r="7" fill="#e3ac7c" {...O} />
          <ellipse cx="28" cy="52" rx="14" ry="10" fill="#fbe0cf" />
          <circle cx="20" cy="42" r="2.8" fill={INK} />
          <circle cx="36" cy="42" r="2.8" fill={INK} />
          <path d="M18 28 L22 18 L28 26 L34 18 L38 28 Z" fill="#ffd166" {...O} strokeWidth={2} />
        </g>
      );
    case "pet-cat":
      return (
        <g>
          <path d="M46 56 Q66 50 58 30" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M46 56 Q66 50 58 30" fill="none" stroke="#8d85a0" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="28" cy="52" rx="22" ry="14" fill="#8d85a0" {...O} />
          <path d="M10 26 L14 8 L24 20 L34 20 L44 8 L46 26 Q48 42 28 44 Q8 42 10 26 Z" fill="#8d85a0" {...O} />
          <path d="M18 28 L26 28 M32 28 L40 28" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M26 36 Q29 34 32 36" fill="none" stroke={INK} strokeWidth="2" />
        </g>
      );
    case "pet-goldfish":
      return (
        <g>
          <circle cx="28" cy="34" r="28" fill="#6bc6ff" opacity="0.35" {...O} />
          <rect x="8" y="58" width="40" height="8" rx="3" fill="#b3abc4" {...O} strokeWidth={2} />
          <ellipse cx="26" cy="36" rx="12" ry="8" fill="#ffb26b" />
          <path d="M36 36 L48 28 L48 44 Z" fill="#ffb26b" />
          <circle cx="20" cy="34" r="2" fill={INK} />
        </g>
      );
    case "pet-duck":
      return (
        <g>
          <ellipse cx="30" cy="50" rx="24" ry="14" fill="#ffd166" {...O} />
          <circle cx="18" cy="30" r="14" fill="#ffd166" {...O} />
          <path d="M4 30 L-8 34 L4 37 Z" fill="#ff7a6b" {...O} strokeWidth={2} />
          <circle cx="14" cy="26" r="2.5" fill={INK} />
        </g>
      );
    case "pet-dragon":
      return (
        <g>
          <path d="M32 34 L54 12 L48 38 Z" fill="#8fb4ff" {...O} />
          <ellipse cx="28" cy="48" rx="22" ry="16" fill="#5fd3a5" {...O} />
          <circle cx="14" cy="28" r="14" fill="#5fd3a5" {...O} />
          <path d="M8 16 L4 4 L14 12 M18 14 L22 2 L24 14" stroke="#ffd166" strokeWidth="3" fill="none" />
          <circle cx="10" cy="26" r="2.5" fill={INK} />
          <path d="M0 32 q-6 -2 -10 2 q4 4 10 2" fill="#ff7a6b" />
        </g>
      );
    case "pet-cub":
      return (
        <g>
          <circle cx="26" cy="28" r="21" fill="#c4622d" {...O} />
          <ellipse cx="26" cy="52" rx="18" ry="12" fill="#e39b2d" {...O} />
          <circle cx="26" cy="30" r="14" fill="#e39b2d" {...O} strokeWidth={2} />
          <circle cx="20" cy="28" r="2.5" fill={INK} />
          <circle cx="32" cy="28" r="2.5" fill={INK} />
          <ellipse cx="26" cy="35" rx="4" ry="3" fill={INK} />
          <rect x="14" y="44" width="24" height="10" rx="3" fill="#2b5fd9" />
        </g>
      );
    case "pet-robot":
      return (
        <g>
          <line x1="26" y1="2" x2="26" y2="12" stroke={INK} strokeWidth="3" />
          <circle cx="26" cy="2" r="4" fill="#ff7a6b" />
          <rect x="8" y="12" width="36" height="26" rx="6" fill="#b3abc4" {...O} />
          <rect x="14" y="18" width="24" height="12" rx="4" fill="#0d1726" />
          <circle cx="20" cy="24" r="3" fill="#6bc6ff" />
          <circle cx="32" cy="24" r="3" fill="#6bc6ff" />
          <rect x="12" y="40" width="28" height="22" rx="4" fill="#d8d4e0" {...O} />
        </g>
      );
    case "pet-dog":
      return (
        <g>
          <ellipse cx="30" cy="50" rx="22" ry="12" fill="#c9a46b" {...O} />
          <circle cx="20" cy="28" r="15" fill="#c9a46b" {...O} />
          <ellipse cx="8" cy="28" rx="6" ry="12" fill="#5a3824" {...O} strokeWidth={2} />
          <ellipse cx="32" cy="28" rx="6" ry="12" fill="#5a3824" {...O} strokeWidth={2} />
          <circle cx="16" cy="26" r="2.5" fill={INK} />
          <circle cx="24" cy="26" r="2.5" fill={INK} />
          <ellipse cx="20" cy="34" rx="4" ry="3" fill={INK} />
          <path d="M16 42 L20 54 L24 42 Z" fill="#2b5fd9" />
        </g>
      );
    case "pet-cow":
      return (
        <g>
          <ellipse cx="30" cy="50" rx="22" ry="12" fill="#f3f6fb" {...O} />
          <circle cx="38" cy="48" r="5" fill={INK} />
          <circle cx="20" cy="28" r="15" fill="#f3f6fb" {...O} />
          <path d="M8 16 L4 8 M32 16 L36 8" stroke="#c9a46b" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="20" cy="36" rx="10" ry="6" fill="#ff9fcf" {...O} strokeWidth={2} />
          <circle cx="14" cy="24" r="2.5" fill={INK} />
          <circle cx="26" cy="24" r="2.5" fill={INK} />
        </g>
      );
    default:
      return null;
  }
}
