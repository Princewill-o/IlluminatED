"use client";
import {useEffect,useMemo,useRef,useState,useTransition} from "react";

import {useRouter} from "next/navigation";

import {PLAYER} from "./art";
import type {Place} from "./city-map";

import {finishWorkShift} from "@/app/games/careers/actions";
import {notifyPlayerChanged} from "@/components/app/app-shell";
import {TaskCard} from "@/components/careers/task-card";
import type {ActiveJob} from "@/components/careers/work";
import {buildShift,roleOf, type SkillId} from "@/game/core/careers";
import {dailyJobRoute} from "@/game/core/daily-jobs";
import {newSeed} from "@/game/core/rng";
import {TILE,type WorldMap} from "@/game/core/world";

export function DailyShift({job,map,onClose,onPaid,onTarget,onBusy}:{job:ActiveJob;map:WorldMap;onClose:()=>void;onPaid:(n:number)=>void;onTarget:(p:Place|null)=>void;onBusy:(v:boolean)=>void}){
 const seed=useRef(newSeed()),started=useRef(Date.now()),results=useRef<boolean[]>([]),router=useRouter();
 const route=useMemo(()=>dailyJobRoute(job.workplace,map),[job.workplace,map]);
 const tasks=useMemo(()=>buildShift(roleOf(job.workplace,job.role)!,seed.current),[job.workplace,job.role]);
 const [index,setIndex]=useState(0),[open,setOpen]=useState(false),[distance,setDistance]=useState(Infinity),[pending,start]=useTransition(),[result,setResult]=useState<{pay?:number;error?:string}|null>(null);
 const point=route[index],finished=index>=5;
 useEffect(()=>{onBusy(open||finished);return()=>onBusy(false);},[onBusy,open,finished]);
 useEffect(()=>{onTarget(point?{id:`daily-${index}`,name:point.name,kind:"job",x:point.x,y:point.y}:null);const tick=()=>setDistance(point?Math.hypot(PLAYER.x-point.x,PLAYER.y-point.y):0);tick();const t=setInterval(tick,200);return()=>{clearInterval(t);onTarget(null);};},[point,index,onTarget]);
 const clockOut=()=>start(async()=>{if(result?.pay!==undefined)return;const skills:Record<string,[number,number]>={};tasks.forEach((t,i)=>{const item=skills[t.skill as SkillId]??[0,0];item[0]+=results.current[i]?1:0;item[1]++;skills[t.skill]=item;});const r=await finishWorkShift(seed.current,results.current.filter(Boolean).length,Date.now()-started.current,skills);if(!r.ok)setResult({error:r.error});else{setResult({pay:r.data.pay});window.dispatchEvent(new CustomEvent("illuminated:scene",{detail:{title:"Shift complete",subtitle:`You earned ${r.data.pay} Clout. Your skills and experience have been saved.`}}));onPaid(r.data.pay);notifyPlayerChanged();router.refresh();}});
 if(route.length!==5)return <aside className="absolute top-24 left-1/2 z-[70] -translate-x-1/2 rounded-2xl bg-white p-4 text-[#13203a]">This route is unavailable.<button onClick={onClose} className="ml-3 underline">Close</button></aside>;
 if(finished)return <div className="absolute inset-0 z-[100008] grid place-items-center bg-black/50 p-4"><section role="dialog" aria-label="End of practical shift" className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]"><h2 className="text-2xl font-black">Route complete</h2><p className="mt-3">{results.current.filter(Boolean).length}/5 learning tasks correct. Clock out to save your shift and earn in-game Clout.</p>{result?.pay!==undefined?<p className="mt-4 text-3xl font-black">+{result.pay} Clout saved</p>:<button disabled={pending} onClick={clockOut} className="mt-5 w-full rounded-full bg-[#2b5fd9] py-3 font-bold text-white">{pending?"Saving shift…":"Clock out"}</button>}{result?.error&&<p role="alert" className="mt-3">{result.error} You can try saving again.</p>}<button onClick={onClose} className="mt-4 w-full py-2 underline">{result?.pay!==undefined?"Back to the city":"Leave without saving"}</button></section></div>;
 return <><aside className="absolute top-28 left-1/2 z-[70] w-[min(350px,calc(100%-24px))] -translate-x-1/2 rounded-2xl bg-[#13203a]/95 p-4 text-white"><p className="text-xs font-black uppercase tracking-widest">{job.workplace==="pizzazz"?"Pizza delivery":"Supermarket shift"} · {index+1}/5</p><p className="mt-2 font-bold">{point.name}</p><p className="mt-1 text-sm">{Math.ceil(distance/TILE)} tiles away · follow the map pin</p><p className="mt-2 text-xs text-white/75">{job.workplace==="pizzazz"?"Travel on foot or hire a bike. Look out for other people and check every delivery ticket.":"Walk to each work point, restock safely and help customers."}</p><div className="mt-3 flex justify-between gap-3"><button disabled={distance>TILE*1.8} onClick={()=>setOpen(true)} className="rounded-full bg-[#f2d9a6] px-4 py-2 font-bold text-[#13203a] disabled:opacity-40">{distance>TILE*1.8?"Walk to the work point":"Do the task"}</button><button onClick={onClose} className="text-xs underline">End shift</button></div></aside>{open&&<div className="absolute inset-0 z-[100008] grid place-items-center overflow-y-auto bg-black/60 p-3"><section role="dialog" aria-label="Work task" className="my-4 w-full max-w-xl rounded-3xl bg-[#f7f1e6] p-3 text-[#13203a] [color-scheme:light]"><button type="button" className="mb-2 min-h-11 px-3 text-sm font-bold underline" onClick={()=>setOpen(false)}>Back to route</button><TaskCard key={index} task={tasks[index]} index={index} total={5} onDone={correct=>{results.current.push(correct);setIndex(n=>n+1);setOpen(false);}}/></section></div>}</>;
}
