"use client";

import { useEffect, useRef } from "react";

import { Gavel, Landmark, Shield, Siren } from "lucide-react";

const RIDE_MS = 5200;

/**
 * The ride in the back of the police van: the city slides past the barred window, blue lights
 * wash the cabin, your cuffed hands rest in front of you, and a route bar runs to the destination.
 * Used when there's no road to play the arrest live (e.g. leaving the station for court).
 */
export function PoliceTransportCutscene({ onArrive, destination = "prison", people }: { onArrive: () => void; destination?: "court" | "prison" | "station"; people?: string }) {
  const finish = useRef(onArrive);
  const finished = useRef(false);
  finish.current = onArrive;
  const finishOnce = () => { if (!finished.current) { finished.current = true; finish.current(); } };
  useEffect(() => {
    const timer = window.setTimeout(finishOnce, RIDE_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const to = destination === "court" ? { label: "Crown Court", Icon: Gavel } : destination === "station" ? { label: "Police station", Icon: Shield } : { label: "HMP Thames", Icon: Landmark };
  const skyline = Array.from({ length: 22 }, (_, i) => ({ h: 30 + ((i * 37) % 55), w: 34 + ((i * 13) % 30), c: ["#2b3a52", "#34465f", "#26324a"][i % 3] }));
  return (
    <div className="fixed inset-0 z-[100012] overflow-hidden bg-[#0c111b] text-white" role="status" aria-live="assertive">
      <style>{`
        @keyframes van-pan { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes van-bump { 0%,100% { transform: translateY(0) } 50% { transform: translateY(2px) } }
        @keyframes van-blue { 0%,45% { opacity: .0 } 50%,60% { opacity: .55 } 65%,100% { opacity: 0 } }
        @keyframes van-red { 0%,10% { opacity: .0 } 15%,25% { opacity: .35 } 30%,100% { opacity: 0 } }
        @keyframes van-route { from { width: 4% } to { width: 100% } }
      `}</style>
      <div className="absolute inset-0" style={{ animation: "van-bump .5s ease-in-out infinite" }}>
        {/* The cabin wall, and the barred rear window with the city going by. */}
        <div className="absolute inset-0 bg-[linear-gradient(#1b2433,#0d131d)]" />
        <div className="absolute top-[12%] left-1/2 h-[42%] w-[min(760px,84vw)] -translate-x-1/2 overflow-hidden rounded-3xl border-[10px] border-[#2a3242] bg-[linear-gradient(#ffb36b,#e87a5d_45%,#5b4b7a)] shadow-[inset_0_0_60px_#0008]">
          <div className="absolute bottom-0 left-0 flex h-full w-[200%] items-end" style={{ animation: "van-pan 9s linear infinite" }}>
            {[...skyline, ...skyline].map((b, i) => (
              <span key={i} className="relative mr-2 shrink-0 rounded-t-md" style={{ height: `${b.h}%`, width: b.w, background: b.c }}>
                {Array.from({ length: 6 }, (_, k) => <span key={k} className="absolute size-1.5 rounded-sm bg-[#ffd98a]" style={{ left: 6 + (k % 2) * 14, top: 10 + Math.floor(k / 2) * 16, opacity: (i + k) % 3 ? 0.9 : 0.15 }} />)}
              </span>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 flex h-[30%] w-[200%] items-end gap-24" style={{ animation: "van-pan 3.2s linear infinite" }}>
            {Array.from({ length: 24 }, (_, i) => <span key={i} className="h-full w-1.5 shrink-0 bg-[#141a24]"><span className="block size-3 -translate-x-1 rounded-full bg-[#ffe29a] shadow-[0_0_16px_#ffe29a]" /></span>)}
          </div>
          {/* Bars. */}
          <div className="absolute inset-0 flex justify-evenly">{Array.from({ length: 6 }, (_, i) => <span key={i} className="h-full w-2 bg-[#1d2330] shadow-[2px_0_0_#3a4458]" />)}</div>
        </div>
        {/* Blue and red lights washing through. */}
        <div className="absolute inset-0 bg-[#2f7bff] mix-blend-screen" style={{ animation: "van-blue .7s linear infinite" }} />
        <div className="absolute inset-0 bg-[#ff3b4a] mix-blend-screen" style={{ animation: "van-red .7s linear infinite" }} />
        {/* Your cuffed hands in your lap. */}
        <div className="absolute bottom-[24%] left-1/2 flex -translate-x-1/2 items-center gap-6">
          <span className="h-16 w-24 rounded-[40%] bg-[#c98d64] shadow-[inset_-8px_-6px_0_#0003]" />
          <span className="absolute left-1/2 top-1/2 h-1.5 w-12 -translate-x-1/2 -translate-y-1/2 bg-[#9aa3ad]" />
          <span className="absolute left-[30%] top-1/2 size-10 -translate-y-1/2 rounded-full border-[6px] border-[#c9ced6]" />
          <span className="absolute right-[30%] top-1/2 size-10 -translate-y-1/2 rounded-full border-[6px] border-[#c9ced6]" />
          <span className="h-16 w-24 rounded-[40%] bg-[#c98d64] shadow-[inset_8px_-6px_0_#0003]" />
        </div>
      </div>
      <div className="absolute inset-x-4 bottom-6 mx-auto max-w-xl rounded-3xl border border-white/15 bg-[#111a2a]/92 p-5 shadow-xl">
        <div className="flex items-center gap-2 text-[#b8d6f4]"><Siren className="size-5" /><span className="text-xs font-black tracking-[.18em] uppercase">Police escort · handcuffed</span></div>
        <p className="mt-2 text-xl font-black">On the way to {to.label}</p>
        <p className="mt-1 text-sm text-white/70">{destination === "court" ? `${people ?? "You"} in the back of the police van. The trial starts when you arrive.` : destination === "station" ? "You'll be booked into custody on arrival." : "Your sentence starts on arrival."}</p>
        <div className="mt-3 flex items-center gap-2 text-xs font-bold">
          <Shield className="size-4 text-[#8fb4ff]" />
          <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/15"><span className="absolute inset-y-0 left-0 rounded-full bg-[#8fb4ff]" style={{ animation: `van-route ${RIDE_MS}ms linear forwards` }} /></span>
          <to.Icon className="size-4 text-[#ffd166]" />
        </div>
        {destination !== "court" && <button type="button" onClick={finishOnce} className="mt-4 min-h-10 rounded-full border border-white/35 px-5 text-xs font-bold hover:bg-white/10">Skip journey</button>}
      </div>
    </div>
  );
}
