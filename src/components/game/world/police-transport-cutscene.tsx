"use client";

import { useEffect, useRef } from "react";

import { CarFront, Siren } from "lucide-react";

import { CutsceneBrand } from "./cutscene-brand";

const RIDE_MS = 3200;

export function PoliceTransportCutscene({ onArrive }: { onArrive: () => void }) {
  const finish = useRef(onArrive);
  finish.current = onArrive;
  useEffect(() => {
    const timer = window.setTimeout(() => finish.current(), RIDE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="fixed inset-0 z-[100012] overflow-hidden bg-[#101827] text-white" role="status" aria-live="assertive">
    <style jsx>{`
      @keyframes police-road { from { transform: translateX(0); } to { transform: translateX(-48%); } }
      @keyframes police-car { 0% { transform: translateX(-140vw) scale(.8); } 72% { transform: translateX(4vw) scale(1); } 100% { transform: translateX(0) scale(1); } }
      @keyframes police-light { 0%,49% { background:#fa4b50; box-shadow:0 0 22px #fa4b50; } 50%,100% { background:#6bc6ff; box-shadow:0 0 22px #6bc6ff; } }
    `}</style>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#53677c_0%,#29384d_42%,#101827_82%)]" />
    <div className="absolute left-1/2 top-[15%] -translate-x-1/2 rounded-2xl bg-[#f6f2e8] px-5 py-4 text-[#13203a] shadow-2xl"><CutsceneBrand kind="police"/></div>
    <div className="absolute inset-x-0 bottom-[24%] h-24 overflow-hidden border-y-4 border-[#8b8273] bg-[#3c414b]">
      <div className="absolute inset-y-0 left-0 flex w-[200%] items-center gap-20" style={{animation:`police-road 1s linear infinite`}}>{Array.from({length:18},(_,i)=><span key={i} className="h-2 w-20 shrink-0 rounded bg-[#f4e6bf]" />)}</div>
    </div>
    <div className="absolute inset-x-0 bottom-[27%] flex items-center justify-center" style={{animation:`police-car ${RIDE_MS}ms cubic-bezier(.2,.7,.2,1) both`}}>
      <div className="relative flex h-24 w-64 items-center justify-center rounded-[2rem_2rem_1rem_1rem] border-4 border-[#d8e2ed] bg-[#172f4e] shadow-[0_16px_40px_#0009]">
        <div className="absolute inset-x-5 top-3 h-9 rounded-xl border-2 border-[#97b9d6] bg-[#8cb2cb]/50" />
        <CarFront className="relative mt-8 size-11 text-white" aria-hidden />
        <span className="absolute -bottom-4 left-8 size-9 rounded-full border-[7px] border-[#131820] bg-[#84909c]" />
        <span className="absolute -bottom-4 right-8 size-9 rounded-full border-[7px] border-[#131820] bg-[#84909c]" />
        <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full" style={{animation:`police-light .36s steps(2,end) infinite`}} />
        <span className="absolute left-0 top-12 h-4 w-5 bg-[#6bc6ff] shadow-[0_0_20px_#6bc6ff]" />
        <span className="absolute right-0 top-12 h-4 w-5 bg-[#fa4b50] shadow-[0_0_20px_#fa4b50]" />
      </div>
    </div>
    <div className="absolute inset-x-4 bottom-8 mx-auto max-w-xl rounded-3xl border border-white/15 bg-[#111a2a]/90 p-5 text-center shadow-xl">
      <div className="flex items-center justify-center gap-2 text-[#b8d6f4]"><Siren className="size-5"/><span className="text-xs font-black uppercase tracking-[.18em]">Serious offence · {RIDE_MS / 1000}s journey</span></div>
      <p className="mt-2 text-2xl font-black">Transport to HMP Thames</p>
      <p className="mt-1 text-sm text-white/70">Police escort in progress. Prison sentence begins on arrival.</p>
      <button type="button" onClick={()=>finish.current()} className="pointer-events-auto mt-4 min-h-10 rounded-full border border-white/35 px-5 text-xs font-bold hover:bg-white/10">Skip journey</button>
    </div>
  </div>;
}
