"use client";

import { useEffect, useState } from "react";

/** When the road carries you through an edge tunnel, the screen dips into tunnel dark with passing lamps. */
export function TunnelFlash() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const on = () => setKey((k) => k + 1);
    window.addEventListener("illuminated:road-loop", on);
    return () => window.removeEventListener("illuminated:road-loop", on);
  }, []);
  if (!key) return null;
  return (
    <div key={key} aria-hidden className="pointer-events-none fixed inset-0 z-[35] overflow-hidden" style={{ animation: "tunnel-dip 1.1s ease-out forwards" }}>
      <div className="absolute inset-0 bg-[#121318]" />
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="absolute top-[12%] left-1/2 h-3 w-40 -translate-x-1/2 rounded-full bg-[#ffd479] shadow-[0_0_40px_12px_rgba(255,212,121,.55)]"
          style={{ animation: `tunnel-lamp .5s linear ${i * 0.16}s forwards`, opacity: 0 }} />
      ))}
      <p className="absolute bottom-[18%] left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs font-black tracking-wide text-[#ffd479] uppercase">Tunnel</p>
      <style>{`@keyframes tunnel-dip{0%{opacity:0}18%{opacity:1}62%{opacity:1}100%{opacity:0;visibility:hidden}}@keyframes tunnel-lamp{0%{opacity:0;transform:translate(-50%,0) scale(.4)}40%{opacity:1}100%{opacity:0;transform:translate(-50%,60vh) scale(2.6)}}`}</style>
    </div>
  );
}
