"use client";
import { useEffect, useRef, useState } from "react";

import { ArrowDown, ArrowUp, X } from "lucide-react";

import { play, soundOn } from "../sound";
import { LIFT_CABIN } from "./art";

type Floor = { mapId: string; label: string; current: boolean; level?: 0 | 1; x?: number; y?: number };

export function LiftPanel({ floors, onClose, onArrive }: { floors: Floor[]; onClose: () => void; onArrive: (floor: Floor) => void }) {
 const here = Math.max(0,floors.findIndex(floor => floor.current));
 const [target,setTarget]=useState<number|null>(null);
 const [shown,setShown]=useState(here);
 const [phase,setPhase]=useState("Choose a floor");
 const arrive=useRef(onArrive);
 arrive.current=onArrive;
 const floorList=useRef(floors);
 floorList.current=floors;
 useEffect(()=>{
  LIFT_CABIN.floor=here;
  if(target===null){LIFT_CABIN.doors=1;LIFT_CABIN.travelling=false;return;}
  const steps=Math.abs(target-here),direction=Math.sign(target-here);
  const started=performance.now();
  const travel=2800+steps*1300;
  const finish=900+travel;
  setPhase("Doors closing");
  LIFT_CABIN.direction=direction;
  let delivered=false;
  const timer=window.setInterval(()=>{
   const elapsed=performance.now()-started;
   LIFT_CABIN.doors=elapsed<900?Math.max(0,1-elapsed/900):elapsed<finish?0:Math.min(1,(elapsed-finish)/900);
   LIFT_CABIN.travelling=elapsed>=900&&elapsed<finish;
   if(elapsed>=900&&elapsed<finish){
    setPhase(direction>0?"Going up":"Going down");
    const floor=here+direction*Math.min(steps,Math.floor((elapsed-900)/travel*(steps+1)));
    setShown(floor);LIFT_CABIN.floor=floor;
   }
   if(elapsed>=finish){setPhase("Doors opening");setShown(target);LIFT_CABIN.floor=target;}
   if(elapsed>=finish+1200&&!delivered){
    delivered=true;window.clearInterval(timer);play("door",soundOn());arrive.current(floorList.current[target]);
   }
  },40);
  return()=>{window.clearInterval(timer);LIFT_CABIN.doors=1;LIFT_CABIN.travelling=false;};
 },[target,here]);
 return <aside className="fixed top-20 right-4 z-[100010] w-[min(20rem,90vw)] rounded-2xl border-2 border-slate-400 bg-slate-200 p-5 text-slate-950 shadow-xl" aria-label="Lift controls">
  <div className="flex items-center justify-between">
   <p className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 font-mono text-2xl text-amber-400">{target!==null&&(target>here?<ArrowUp/>:<ArrowDown/>)}{shown===0?"G":shown}</p>
   {target===null&&<button className="grid size-11 place-items-center rounded-lg bg-white" onClick={onClose} aria-label="Close lift controls"><X/></button>}
  </div>
  <p role="status" className="my-3 font-bold">{phase}</p>
  <div className="grid gap-2">{floors.map((floor,index)=><button key={floor.mapId+":"+index} disabled={target!==null||floor.current} onClick={()=>{play("click",soundOn());setTarget(index);}} className="min-h-12 rounded-xl border border-slate-400 bg-white p-3 text-left font-bold disabled:opacity-50">{index===0?"G":index} · {floor.label}</button>)}</div>
  <p className="mt-4 text-sm">You can move around inside the cabin during the ride.</p>
 </aside>;
}
