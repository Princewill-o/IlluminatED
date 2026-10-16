import type { BuildingShape } from "@/game/core/companies";

const WALL = "#241b36";
const WALL_DARK = "#1a1428";
const WINDOW = "#3a2d58";
const LIT = "#ffd166";

function Windows({
  x,
  y,
  cols,
  rows,
  w = 10,
  h = 12,
  gap = 6,
  lit = [] as number[],
}: {
  x: number;
  y: number;
  cols: number;
  rows: number;
  w?: number;
  h?: number;
  gap?: number;
  lit?: number[];
}) {
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      cells.push(
        <rect
          key={i}
          x={x + c * (w + gap)}
          y={y + r * (h + gap)}
          width={w}
          height={h}
          rx="2"
          fill={lit.includes(i) ? LIT : WINDOW}
        />,
      );
    }
  return <g>{cells}</g>;
}

/** Flat, low-detail buildings for the city map. One accent colour each. */
export function Building({
  shape,
  accent,
  className,
}: {
  shape: BuildingShape;
  accent: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 160 140" className={className} aria-hidden>
      <rect x="0" y="132" width="160" height="8" fill="#0f0c16" />
      {SHAPES[shape](accent)}
    </svg>
  );
}

const SHAPES: Record<BuildingShape, (a: string) => React.ReactNode> = {
  tower: (a) => (
    <g>
      <rect x="50" y="20" width="60" height="112" fill={WALL} />
      <rect x="50" y="20" width="60" height="10" fill={a} />
      <line x1="80" y1="2" x2="80" y2="20" stroke={a} strokeWidth="3" />
      <circle cx="80" cy="4" r="4" fill={a} />
      <Windows x={58} y={38} cols={3} rows={5} lit={[1, 5, 6, 10, 14]} />
      <rect x="70" y="116" width="20" height="16" fill={a} />
      <rect x="20" y="70" width="30" height="62" fill={WALL_DARK} />
      <Windows x={26} y={80} cols={2} rows={3} w={7} h={9} gap={5} lit={[3]} />
      <rect x="110" y="56" width="32" height="76" fill={WALL_DARK} />
      <Windows
        x={116}
        y={66}
        cols={2}
        rows={4}
        w={8}
        h={10}
        gap={5}
        lit={[0, 5]}
      />
    </g>
  ),
  dome: (a) => (
    <g>
      <path d="M20 48 L80 14 L140 48 Z" fill={a} />
      <rect x="24" y="48" width="112" height="10" fill={WALL} />
      {[32, 54, 76, 98, 120].map((x) => (
        <rect key={x} x={x} y="58" width="10" height="60" fill="#3a2d58" />
      ))}
      <rect x="20" y="118" width="120" height="7" fill={WALL} />
      <rect x="14" y="125" width="132" height="7" fill={WALL_DARK} />
      <circle cx="80" cy="34" r="7" fill={WALL} />
      <text
        x="80"
        y="38"
        textAnchor="middle"
        fontSize="10"
        fontWeight="900"
        fill={a}
      >
        £
      </text>
    </g>
  ),
  barn: (a) => (
    <g>
      <path d="M24 62 L80 22 L136 62 L136 132 L24 132 Z" fill={a} />
      <path
        d="M24 62 L80 22 L136 62"
        fill="none"
        stroke="#f3f6fb"
        strokeWidth="5"
      />
      <rect x="58" y="82" width="44" height="50" fill={WALL} />
      <path
        d="M58 82 L102 132 M102 82 L58 132"
        stroke="#f3f6fb"
        strokeWidth="4"
      />
      <rect
        x="58"
        y="82"
        width="44"
        height="50"
        fill="none"
        stroke="#f3f6fb"
        strokeWidth="4"
      />
      <circle cx="80" cy="54" r="9" fill={WALL} />
      <circle cx="40" cy="96" r="7" fill={WALL} opacity="0.5" />
      <circle cx="120" cy="108" r="9" fill={WALL} opacity="0.5" />
    </g>
  ),
  hospital: (a) => (
    <g>
      <rect x="22" y="40" width="116" height="92" fill="#f3f6fb" />
      <rect x="22" y="40" width="116" height="10" fill={a} />
      <rect x="66" y="12" width="28" height="28" rx="4" fill={a} />
      <rect x="77" y="16" width="6" height="20" fill="#fff" />
      <rect x="70" y="23" width="20" height="6" fill="#fff" />
      <Windows
        x={32}
        y={60}
        cols={5}
        rows={3}
        w={12}
        h={10}
        gap={8}
        lit={[2, 8]}
      />
      <rect x="66" y="112" width="28" height="20" fill={a} />
    </g>
  ),
  factory: (a) => (
    <g>
      <rect x="112" y="16" width="16" height="70" fill={WALL_DARK} />
      <rect x="112" y="24" width="16" height="6" fill={a} />
      <circle cx="122" cy="8" r="8" fill="#3a2d58" />
      <circle cx="136" cy="2" r="6" fill="#3a2d58" />
      <path
        d="M16 132 L16 62 L44 44 L44 62 L72 44 L72 62 L100 44 L100 62 L144 62 L144 132 Z"
        fill={WALL}
      />
      <path
        d="M16 62 L44 44 L44 62 L72 44 L72 62 L100 44 L100 62"
        fill="none"
        stroke={a}
        strokeWidth="5"
      />
      <Windows
        x={26}
        y={76}
        cols={6}
        rows={2}
        w={12}
        h={14}
        gap={7}
        lit={[0, 3, 7, 11]}
      />
      <rect x="60" y="110" width="40" height="22" fill={a} />
    </g>
  ),
  courthouse: (a) => (
    <g>
      <path d="M50 40 Q80 2 110 40 Z" fill={a} />
      <path d="M18 56 L80 34 L142 56 Z" fill={WALL} />
      {[28, 50, 72, 94, 116].map((x) => (
        <rect key={x} x={x} y="58" width="14" height="58" fill="#f3f6fb" />
      ))}
      <rect x="18" y="116" width="124" height="16" fill={WALL} />
      <path d="M68 48 L92 48 M80 40 L80 54" stroke={a} strokeWidth="3" />
    </g>
  ),
  cinema: (a) => (
    <g>
      <rect x="18" y="30" width="124" height="102" fill={WALL} />
      <rect x="10" y="54" width="140" height="30" fill={a} />
      {Array.from({ length: 13 }, (_, i) => (
        <circle key={i} cx={16 + i * 11} cy="50" r="3" fill={LIT} />
      ))}
      <text
        x="80"
        y="75"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill="#0d1726"
      >
        NOW SHOWING
      </text>
      <rect x="40" y="96" width="32" height="36" fill={WINDOW} />
      <rect x="88" y="96" width="32" height="36" fill={WINDOW} />
      <path d="M50 20 L60 30 L70 20" stroke={a} strokeWidth="4" fill="none" />
    </g>
  ),
  bakery: (a) => (
    <g>
      <rect x="22" y="36" width="116" height="96" fill={WALL} />
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d={`M${22 + i * 14.5} 62 L${36.5 + i * 14.5} 62 L${36.5 + i * 14.5} 76 Q${29 + i * 14.5} 84 ${22 + i * 14.5} 76 Z`}
          fill={i % 2 ? "#f3f6fb" : a}
        />
      ))}
      <rect x="18" y="56" width="124" height="8" fill={a} />
      <rect x="34" y="88" width="54" height="34" fill={WINDOW} />
      <path
        d="M44 112 Q58 92 76 106 Q70 112 66 110 Q62 118 56 114 Q50 120 44 112 Z"
        fill="#ffb26b"
      />
      <rect x="100" y="88" width="26" height="44" fill={a} />
    </g>
  ),
  crane: (a) => (
    <g>
      <rect x="30" y="64" width="74" height="68" fill={WALL} />
      <Windows
        x={38}
        y={74}
        cols={4}
        rows={3}
        w={10}
        h={10}
        gap={7}
        lit={[1, 6]}
      />
      <rect
        x="30"
        y="54"
        width="74"
        height="10"
        fill="none"
        stroke={a}
        strokeWidth="3"
        strokeDasharray="6 4"
      />
      <rect x="124" y="20" width="8" height="112" fill={a} />
      <path d="M124 20 L60 20 L60 26 L132 26 Z" fill={a} />
      <path d="M128 20 L128 8 L150 22 Z" fill={a} />
      <line x1="72" y1="26" x2="72" y2="46" stroke="#b3abc4" strokeWidth="2" />
      <rect x="64" y="46" width="16" height="10" fill="#ff7a6b" />
    </g>
  ),
  stadium: (a) => (
    <g>
      <ellipse cx="80" cy="106" rx="70" ry="26" fill={WALL} />
      <ellipse cx="80" cy="100" rx="56" ry="16" fill="#5fd3a5" />
      <line x1="80" y1="86" x2="80" y2="114" stroke="#f3f6fb" strokeWidth="2" />
      <ellipse
        cx="80"
        cy="100"
        rx="8"
        ry="4"
        fill="none"
        stroke="#f3f6fb"
        strokeWidth="2"
      />
      <path
        d="M10 106 L10 80 Q80 56 150 80 L150 106"
        fill="none"
        stroke={a}
        strokeWidth="6"
      />
      <rect x="14" y="20" width="4" height="60" fill="#b3abc4" />
      <rect x="142" y="20" width="4" height="60" fill="#b3abc4" />
      <rect x="6" y="14" width="20" height="10" fill={LIT} />
      <rect x="134" y="14" width="20" height="10" fill={LIT} />
    </g>
  ),
  nursery: (a) => (
    <g>
      <path d="M18 66 L80 24 L142 66 Z" fill={a} />
      <rect x="26" y="66" width="108" height="66" fill={WALL} />
      <rect x="38" y="78" width="20" height="20" fill="#ffd166" />
      <rect x="102" y="78" width="20" height="20" fill="#6bc6ff" />
      <rect x="66" y="100" width="28" height="32" rx="12" fill="#ff7a6b" />
      <circle cx="80" cy="52" r="9" fill="#ffd166" />
      <text x="44" y="94" fontSize="13" fontWeight="900" fill="#0d1726">
        A
      </text>
      <text x="107" y="94" fontSize="13" fontWeight="900" fill="#0d1726">
        B
      </text>
    </g>
  ),
  globe: (a) => (
    <g>
      <rect x="30" y="66" width="100" height="66" fill={WALL} />
      <Windows
        x={40}
        y={80}
        cols={5}
        rows={2}
        w={10}
        h={12}
        gap={8}
        lit={[2, 6]}
      />
      <rect x="70" y="112" width="20" height="20" fill={a} />
      <rect x="76" y="54" width="8" height="12" fill="#b3abc4" />
      <circle cx="80" cy="32" r="24" fill={a} />
      <path
        d="M66 20 Q76 26 72 36 Q82 40 78 50 M90 14 Q98 22 94 30 Q100 34 98 42"
        fill="none"
        stroke="#0d1726"
        strokeWidth="4"
      />
      <ellipse
        cx="80"
        cy="32"
        rx="30"
        ry="8"
        fill="none"
        stroke="#f3f6fb"
        strokeWidth="2"
        transform="rotate(-20 80 32)"
      />
    </g>
  ),
};
