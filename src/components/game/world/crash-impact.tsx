"use client";

/** The moment of a crash: white flash, the world shakes, cracked glass and a comic CRASH burst. */
export function CrashImpact({ kind }: { kind: "crash" | "collapse" }) {
  const crash = kind === "crash";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[36] overflow-hidden">
      <div className="absolute inset-0 bg-white" style={{ animation: "crash-flash .7s ease-out forwards" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, transparent 35%, rgba(120,0,0,.55) 100%)", animation: "crash-vignette 4s ease-out forwards" }} />
      {crash && (
        <>
          <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-0 size-full" style={{ animation: "crash-glass 3.2s ease-out forwards" }}>
            <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".85">
              <path d="M262 96 L400 40 M262 96 L388 160 M262 96 L330 300 M262 96 L180 0 M262 96 L120 120 M262 96 L210 240 M262 96 L400 110" />
              <path d="M300 80 L322 118 L296 150 L254 148 L232 112 L250 74 Z M340 64 L366 136 L318 188 L238 192 L196 128 L224 50 Z" strokeWidth="1.4" />
            </g>
          </svg>
          <div className="absolute top-[26%] left-1/2 -translate-x-1/2" style={{ animation: "crash-pop 1.6s cubic-bezier(.2,1.6,.4,1) forwards" }}>
            <svg viewBox="0 0 220 140" className="w-72 drop-shadow-[0_6px_0_rgba(0,0,0,.4)]">
              <path d="M110 4 L128 40 L172 18 L160 58 L214 62 L170 84 L200 122 L148 104 L132 138 L110 104 L84 136 L76 100 L22 120 L50 82 L6 62 L58 54 L44 14 L90 38 Z" fill="#ffd23f" stroke="#111" strokeWidth="5" strokeLinejoin="round" />
              <text x="110" y="82" textAnchor="middle" fontSize="40" fontWeight="900" fill="#e0312b" stroke="#111" strokeWidth="2" fontFamily="system-ui, sans-serif">CRASH!</text>
            </svg>
          </div>
        </>
      )}
      <style>{`
        @keyframes crash-flash{0%{opacity:.95}100%{opacity:0}}
        @keyframes crash-vignette{0%{opacity:1}70%{opacity:.6}100%{opacity:0}}
        @keyframes crash-glass{0%{opacity:1}75%{opacity:.9}100%{opacity:0}}
        @keyframes crash-pop{0%{transform:translate(-50%,0) scale(.2) rotate(-12deg);opacity:0}25%{transform:translate(-50%,0) scale(1.1) rotate(4deg);opacity:1}80%{opacity:1}100%{transform:translate(-50%,0) scale(1) rotate(0);opacity:0}}
        @keyframes crash-shake{0%,100%{transform:translate(0,0)}10%{transform:translate(-14px,8px)}20%{transform:translate(12px,-10px)}30%{transform:translate(-10px,-6px)}40%{transform:translate(9px,7px)}55%{transform:translate(-6px,4px)}70%{transform:translate(4px,-3px)}85%{transform:translate(-2px,2px)}}
        canvas[data-graphics-fps]{animation:crash-shake .75s ease-out}
      `}</style>
    </div>
  );
}
