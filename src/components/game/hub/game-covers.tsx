/** Illustrated low-poly covers for the Games collection: one little scene per game, in SVG. */
export function GameCover({ id, className }: { id: string; className?: string }) {
  const ink = "#141020";
  const common = { viewBox: "0 0 240 140", preserveAspectRatio: "xMidYMid slice", className, role: "img", "aria-hidden": true } as const;
  switch (id) {
    case "tycoon":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#2b5fd9" />
          <path d="M0 110 L240 70 L240 140 L0 140Z" fill="#1e4bb8" />
          <rect x="18" y="22" width="120" height="90" rx="6" fill="#e9f0ff" stroke={ink} strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={18 + i * 30} y="22" width="30" height="14" fill={["#c8322d", "#f2a541", "#2fa865", "#7a5ce6"][i]} stroke={ink} strokeWidth="2" />)}
          <text x="78" y="78" textAnchor="middle" fontSize="16" fontWeight="900" fill="#13203a">LONDON</text>
          {[[160, 70], [188, 56], [212, 74]].map(([x, y], i) => (
            <g key={i} stroke={ink} strokeWidth="2.5" strokeLinejoin="round">
              <rect x={x} y={y} width="22" height="22" fill={["#ffd166", "#ff7a6b", "#5fd3a5"][i]} />
              <path d={`M${x - 3} ${y} L${x + 11} ${y - 12} L${x + 25} ${y}Z`} fill="#c8322d" />
            </g>
          ))}
          <g transform="translate(160 104) rotate(-12)" stroke={ink} strokeWidth="2.5"><rect width="22" height="22" rx="4" fill="#fff" /><circle cx="7" cy="7" r="2.4" fill={ink} /><circle cx="15" cy="15" r="2.4" fill={ink} /></g>
        </svg>
      );
    case "c4":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#c8322d" />
          <circle cx="210" cy="20" r="60" fill="#e04a40" />
          <rect x="50" y="18" width="140" height="112" rx="10" fill="#2b5fd9" stroke={ink} strokeWidth="3.5" />
          {Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, c) => {
            const col = (r * 5 + c) % 7 === 0 ? "#ffd166" : (r * 3 + c) % 4 === 0 ? "#c8322d" : "#e9f0ff";
            return <circle key={`${r}${c}`} cx={70 + c * 25} cy={38 + r * 26} r="10" fill={col} stroke={ink} strokeWidth="2.5" />;
          }))}
          <circle cx="120" cy="8" r="11" fill="#ffd166" stroke={ink} strokeWidth="3" />
        </svg>
      );
    case "draughts":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#13203a" />
          <g transform="translate(120 70) rotate(-8) translate(-70 -55)">
            {Array.from({ length: 6 }, (_, r) => Array.from({ length: 8 }, (_, c) => <rect key={`${r}${c}`} x={c * 17.5} y={r * 18.5} width="17.5" height="18.5" fill={(r + c) % 2 ? "#3d5360" : "#e9e1d0"} />))}
            <rect width="140" height="111" fill="none" stroke={ink} strokeWidth="3.5" />
            {[[1, 0], [3, 0], [5, 0], [0, 1], [2, 1]].map(([c, r]) => <circle key={`w${c}${r}`} cx={c * 17.5 + 8.75} cy={r * 18.5 + 9.25} r="7" fill="#fff" stroke={ink} strokeWidth="2.5" />)}
            {[[2, 5], [4, 5], [6, 5], [5, 4]].map(([c, r]) => <circle key={`b${c}${r}`} cx={c * 17.5 + 8.75} cy={r * 18.5 + 9.25} r="7" fill="#c8322d" stroke={ink} strokeWidth="2.5" />)}
          </g>
          <path d="M190 26 l8 10 l8 -12 l8 12 l8 -10 l-4 22 h-24z" fill="#ffd166" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      );
    case "ttt":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#15987f" />
          <g stroke="#e9fff7" strokeWidth="7" strokeLinecap="round"><path d="M100 22 V118 M140 22 V118 M70 54 H170 M70 86 H170" /></g>
          <g stroke={ink} strokeWidth="9" strokeLinecap="round"><path d="M76 28 L94 46 M94 28 L76 46 M146 92 L164 110 M164 92 L146 110" /></g>
          <circle cx="120" cy="70" r="10" fill="none" stroke="#ffd166" strokeWidth="7" />
          <circle cx="155" cy="38" r="10" fill="none" stroke="#ffd166" strokeWidth="7" />
          <path d="M70 104 L170 36" stroke="#c8322d" strokeWidth="5" strokeLinecap="round" strokeDasharray="6 8" />
        </svg>
      );
    case "quiz":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#7a5ce6" />
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M120 140 L${i * 30} 0 L${i * 30 + 14} 0Z`} fill="#8b70ee" />)}
          {[[60, 86, "#ffd166"], [120, 70, "#5fd3a5"], [180, 96, "#ff7a6b"]].map(([x, y, c], i) => (
            <g key={i} stroke={ink} strokeWidth="3"><rect x={Number(x) - 24} y={Number(y)} width="48" height={140 - Number(y)} fill="#e9e1ff" /><ellipse cx={x} cy={Number(y) - 4} rx="13" ry="6" fill={String(c)} /></g>
          ))}
          <text x="120" y="52" textAnchor="middle" fontSize="44" fontWeight="900" fill="#fff" stroke={ink} strokeWidth="3">?</text>
        </svg>
      );
    case "racing":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#5fae4a" />
          <path d="M-10 120 C60 60 120 150 250 40" stroke="#3c414b" strokeWidth="44" fill="none" />
          <path d="M-10 120 C60 60 120 150 250 40" stroke="#f4e6bf" strokeWidth="3" strokeDasharray="12 12" fill="none" />
          <g transform="translate(110 78) rotate(-14)" stroke={ink} strokeWidth="3" strokeLinejoin="round">
            <rect x="-30" y="-10" width="60" height="22" rx="6" fill="#e4572e" />
            <rect x="-12" y="-20" width="26" height="12" rx="3" fill="#bde3ff" />
            <circle cx="-17" cy="13" r="7" fill={ink} /><circle cx="17" cy="13" r="7" fill={ink} />
          </g>
          <text x="196" y="118" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff" stroke={ink} strokeWidth="2">7×8</text>
          <rect x="20" y="10" width="44" height="16" fill="#fff" stroke={ink} strokeWidth="2" />
          {Array.from({ length: 4 }, (_, i) => <rect key={i} x={20 + i * 11} y={(i % 2) * 8 + 10} width="11" height="8" fill={ink} />)}
        </svg>
      );
    case "championship":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#f2a541" />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M120 70 L${120 + Math.cos(i / 1.9) * 200} ${70 + Math.sin(i / 1.9) * 200} L${120 + Math.cos(i / 1.9 + 0.2) * 200} ${70 + Math.sin(i / 1.9 + 0.2) * 200}Z`} fill="#f7b85a" />)}
          <g stroke={ink} strokeWidth="3.5" strokeLinejoin="round">
            <path d="M92 26 H148 V54 C148 78 92 78 92 54Z" fill="#ffd166" />
            <path d="M92 34 H76 C76 54 90 58 94 58 M148 34 H164 C164 54 150 58 146 58" fill="none" />
            <rect x="112" y="76" width="16" height="18" fill="#ffd166" />
            <rect x="98" y="94" width="44" height="14" rx="3" fill="#c8322d" />
          </g>
          <text x="120" y="56" textAnchor="middle" fontSize="18" fontWeight="900" fill="#c8322d">1</text>
        </svg>
      );
    case "what-if":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#15987f" />
          <path d="M120 140 V96 C120 70 70 70 60 40 M120 96 C120 70 170 70 180 40" stroke="#e9fff7" strokeWidth="10" fill="none" strokeLinecap="round" />
          {[[60, 30], [180, 30]].map(([x, y], i) => <g key={i} stroke={ink} strokeWidth="3"><circle cx={x} cy={y} r="20" fill={i ? "#ffd166" : "#ff7a6b"} /><text x={x} y={y + 8} textAnchor="middle" fontSize="22" fontWeight="900" fill={ink} strokeWidth="0">{i ? "B" : "A"}</text></g>)}
          <circle cx="120" cy="118" r="12" fill="#fff" stroke={ink} strokeWidth="3" />
        </svg>
      );
    case "panic":
      return (
        <svg {...common}>
          <rect width="240" height="140" fill="#ff5a7a" />
          {[["#c8322d", 40], ["#2b5fd9", 100], ["#ffd166", 160], ["#2fa865", 210]].map(([c, x], i) => <ellipse key={i} cx={Number(x)} cy="112" rx="26" ry="10" fill={String(c)} stroke={ink} strokeWidth="3" />)}
          <rect x="70" y="18" width="100" height="56" rx="8" fill="#fff" stroke={ink} strokeWidth="3" />
          <text x="120" y="54" textAnchor="middle" fontSize="26" fontWeight="900" fill="#c8322d">0:15</text>
        </svg>
      );
    default:
      return <svg {...common}><rect width="240" height="140" fill="#13203a" /></svg>;
  }
}
