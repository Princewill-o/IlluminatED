"use client";
import {useEffect,useMemo,useRef,useState,useTransition} from "react";

import {useRouter} from "next/navigation";

import {DELIVERY_SCENE,PLAYER,PLAYER_WORK} from "./art";
import type {Place} from "./city-map";

import {startCareerSession,completeCareerSession} from "@/app/games/careers/actions";
import {notifyPlayerChanged} from "@/components/app/app-shell";
import { CareerError } from "@/components/careers/career-error";
import {TaskCard} from "@/components/careers/task-card";
import type {ActiveJob} from "@/components/careers/work";
import {WorkInterface} from "@/components/careers/work-interface";
import {buildShift,roleOf,workplaceById} from "@/game/core/careers";
import {dailyJobRoute,taskAction} from "@/game/core/daily-jobs";
import {TILE,type WorldMap} from "@/game/core/world";

export function DailyShift({job,map,onClose,onPaid,onTarget,onBusy,active=true}:{job:ActiveJob;map:WorldMap;onClose:()=>void;onPaid:(n:number)=>void;onTarget:(p:Place|null)=>void;onBusy:(v:boolean)=>void;active?:boolean}){
 const [seed,setSeed]=useState(1),token=useRef(""),answers=useRef<(number|string)[]>([]),results=useRef<boolean[]>([]),router=useRouter();
 const [sessionError,setSessionError]=useState(""),[ready,setReady]=useState(false);
 useEffect(()=>{let alive=true;startCareerSession(job.workplace,"shift").then(session=>{if(!alive)return;if(!session.ok){setSessionError(session.error);return;}token.current=session.token;setSeed(session.seed);setReady(true);}).catch(()=>{if(alive)setSessionError("Could not start a verified shift. Try again.");});return()=>{alive=false;};},[job.workplace]);
 const route=useMemo(()=>dailyJobRoute(job.workplace,map),[job.workplace,map]);
 const tasks=useMemo(()=>buildShift(roleOf(job.workplace,job.role)!,seed),[job.workplace,job.role,seed]);
 const [index,setIndex]=useState(0),[open,setOpen]=useState(false),[distance,setDistance]=useState(Infinity),[pending,start]=useTransition(),[result,setResult]=useState<{pay?:number;error?:string}|null>(null);
 const point=route[index],finished=index>=5;
 const onFloor=map.id.startsWith("workplace-"),action=taskAction(String(tasks[index]?.kind??""));
 const stopName=point?(onFloor?action.verb:point.name):"";
 // Hands-on work: your character does the job (typing, cooking, treating…) before the task card opens.
 const [working,setWorking]=useState<number|null>(null),[progress,setProgress]=useState(0);
 useEffect(()=>{
   if(working===null)return;
   PLAYER_WORK.activity=action.activity;
   const t=setInterval(()=>{const k=Math.min(1,(performance.now()-working)/3200);setProgress(k);if(k>=1){clearInterval(t);PLAYER_WORK.activity=null;setWorking(null);setProgress(0);setOpen(true);}},60);
   return()=>{clearInterval(t);PLAYER_WORK.activity=null;};
 },[working,action.activity]);
 useEffect(()=>{
   DELIVERY_SCENE.active=ready&&active&&job.workplace==="pizzazz"&&!finished;
   DELIVERY_SCENE.carrying=index>0&&!finished;
   DELIVERY_SCENE.target=point?{...point,pickup:index===0}:null;
   return()=>{DELIVERY_SCENE.active=false;DELIVERY_SCENE.carrying=false;DELIVERY_SCENE.target=null;};
 },[ready,active,job.workplace,index,finished,point]);
 useEffect(()=>{onBusy(open||finished||working!==null);return()=>onBusy(false);},[onBusy,open,finished,working]);
 useEffect(()=>{onTarget(point?{id:`daily-${index}`,name:stopName,kind:"job",x:point.x,y:point.y}:null);const tick=()=>setDistance(point?Math.hypot(PLAYER.x-point.x,PLAYER.y-point.y):0);tick();const t=setInterval(tick,200);return()=>{clearInterval(t);onTarget(null);};},[point,index,onTarget,stopName]);
 const clockOut=()=>start(async()=>{if(result?.pay!==undefined)return;let r:Awaited<ReturnType<typeof completeCareerSession>>;try{r=await completeCareerSession(token.current,answers.current);}catch{setResult({error:"Could not save your shift. Please try again."});return;}if(!r.ok)setResult({error:r.error});else{setResult({pay:r.data.pay});window.dispatchEvent(new CustomEvent("illuminated:scene",{detail:{title:"Shift complete",subtitle:`You earned ${r.data.pay} Clout. Your skills and experience have been saved.`}}));onPaid(r.data.pay);notifyPlayerChanged();router.refresh();}});
 if(!active)return null;
 if(sessionError || !ready)return <aside className="absolute top-24 left-1/2 z-[100008] -translate-x-1/2 rounded-2xl bg-white p-4 text-[#13203a]" role="status">{sessionError ? <CareerError message={sessionError} /> : "Starting verified shift…"}<button onClick={onClose} className="ml-3 underline">Close</button></aside>;
 if(route.length!==5)return <aside className="absolute top-24 left-1/2 z-[70] -translate-x-1/2 rounded-2xl bg-white p-4 text-[#13203a]">This route is unavailable.<button onClick={onClose} className="ml-3 underline">Close</button></aside>;
 if(finished)return <div className="absolute inset-0 z-[100008] grid place-items-center bg-black/50 p-4"><section role="dialog" aria-label="End of practical shift" className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]"><h2 className="text-2xl font-black">Route complete</h2><p className="mt-3">{results.current.filter(Boolean).length}/5 learning tasks correct. Clock out to save your shift and earn in-game Clout.</p>{result?.pay!==undefined?<p className="mt-4 text-3xl font-black">+{result.pay} Clout saved</p>:<button disabled={pending} onClick={clockOut} className="jelly mt-5 w-full rounded-full bg-[#2b5fd9] py-3 font-bold text-white">{pending?"Saving shift…":"Clock out"}</button>}{result?.error&&<p role="alert" className="mt-3">{result.error} You can try saving again.</p>}<button onClick={onClose} className="mt-4 w-full py-2 underline">{result?.pay!==undefined?"Back to the city":"Leave without saving"}</button></section></div>;
 return <><aside className="absolute top-28 left-1/2 z-[70] w-[min(350px,calc(100%-24px))] -translate-x-1/2 rounded-2xl bg-[#13203a]/95 p-4 text-white"><p className="text-xs font-black uppercase tracking-widest">{job.workplace==="pizzazz"?"Pizza delivery":job.workplace==="tescow"&&!onFloor?"Supermarket shift":`${workplaceById(job.workplace)?.name??"Work"} shift`} · {index+1}/5</p><p className="mt-2 font-bold">{stopName}</p><p className="mt-1 text-sm">{Math.ceil(distance/TILE)} tiles away · follow the map pin</p><p className="mt-2 text-xs text-white/75">{job.workplace==="pizzazz"?index===0?"Your uniform is on. Collect the stack of four pizzas outside Pizzazz, then check the dispatch ticket.":`Carrying ${5-index} pizza ${5-index===1?"box":"boxes"}. Find the waiting customer, check their ticket and hand over a pizza.`:onFloor?"Walk to the glowing work point, do the job hands-on, then make the call.":"Walk to each work point, restock safely and help customers."}</p>{working!==null&&<div className="mt-3"><div className="h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#6cc04a]" style={{width:`${progress*100}%`}}/></div><p className="mt-1 text-xs font-bold">Working… {Math.round(progress*100)}%</p></div>}<div className="mt-3 flex justify-between gap-3"><button disabled={distance>TILE*1.8||working!==null} onClick={()=>setWorking(performance.now())} className="rounded-full bg-[#f2d9a6] px-4 py-2 font-bold text-[#13203a] disabled:opacity-40">{distance>TILE*1.8?"Walk to the work point":job.workplace==="pizzazz"?(index===0?"Collect pizzas & check ticket":"Hand over pizza & check ticket"):`Start: ${action.verb.split(": ")[1]??"the task"}`}</button><button onClick={onClose} className="text-xs underline">End shift</button></div></aside>{open&&<div className="absolute inset-0 z-[100008] grid place-items-center overflow-y-auto bg-black/60 p-3"><section role="dialog" aria-label="Work task" className="my-4 w-full max-w-3xl text-[#13203a] [color-scheme:light]"><button type="button" className="mb-2 min-h-11 rounded-full bg-white px-4 text-sm font-bold shadow" onClick={()=>setOpen(false)}>Back to route</button><WorkInterface taskKind={String(tasks[index].kind)} place={job.workplace}><TaskCard bare key={index} task={tasks[index]} index={index} total={5} onDone={(correct,answer)=>{answers.current[index]=answer;results.current.push(correct);setIndex(n=>n+1);setOpen(false);}}/></WorkInterface></section></div>}</>;
}
