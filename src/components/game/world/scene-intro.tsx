"use client";
import {useEffect,useRef} from "react";

import {CAMERA_SHOT,INTRO_MS} from "@/game/core/cinematics";
export function SceneIntro({title,subtitle,onDone}:{title:string;subtitle:string;onDone:()=>void}){
 const done=useRef(onDone);done.current=onDone;
 useEffect(()=>{CAMERA_SHOT.at=performance.now();const t=setTimeout(()=>done.current(),INTRO_MS);return()=>{clearTimeout(t);CAMERA_SHOT.at=-1;};},[]);
 return <div className="pointer-events-none absolute inset-0 z-[100009]" role="status" aria-live="polite"><div className="absolute inset-x-0 top-0 h-12 bg-[#101727]/85 md:h-16"/><div className="absolute inset-x-0 bottom-0 flex min-h-28 items-center justify-between gap-4 bg-[#101727]/90 px-5 py-5 text-white"><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a8c6ff]">IlluminatED City</p><p className="mt-1 text-xl font-black md:text-3xl">{title}</p><p className="mt-1 text-xs text-white/80 md:text-sm">{subtitle}</p></div><button type="button" onClick={()=>done.current()} className="pointer-events-auto min-h-11 shrink-0 rounded-full border border-white/40 px-4 py-2 text-xs font-bold">Skip intro</button></div></div>;
}
