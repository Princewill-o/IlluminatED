import "server-only";
import {UNIVERSITIES} from "@/game/core/universities";

export interface UniversityEvent {name:string;url:string;start:string;university:string;}
function extractEvents(value:unknown,host:string,id:string,result:UniversityEvent[],depth=0):void {
 if(depth>12||!value||typeof value!=="object")return;
 if(Array.isArray(value)){value.slice(0,200).forEach(v=>extractEvents(v,host,id,result,depth+1));return;}
 const o=value as Record<string,unknown>;
 if((o["@type"]==="Event"||Array.isArray(o["@type"])&&o["@type"].includes("Event"))&&typeof o.name==="string"&&typeof o.startDate==="string"&&typeof o.url==="string") {
  try{const u=new URL(o.url,`https://${host}`);const date=new Date(o.startDate);if(u.protocol==="https:"&&(u.hostname===host||u.hostname.endsWith(`.${host}`))&&date.getTime()>=Date.now()&&o.name.length<=300)result.push({name:o.name,url:u.href,start:date.toISOString(),university:id});}catch{/* Invalid upstream metadata is ignored. */}
 }
 for(const v of Object.values(o))extractEvents(v,host,id,result,depth+1);
}
export async function universityEvents(){
 const sources=await Promise.all(UNIVERSITIES.map(async u=>{
  const events:UniversityEvent[]=[];let status="unavailable";
  try{const r=await fetch(u.events,{next:{revalidate:10800},signal:AbortSignal.timeout(8000),headers:{accept:"text/html"}});if(r.ok){const content=await r.text();if(content.length<2_000_000){for(const match of content.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{extractEvents(JSON.parse(match[1]),new URL(u.events).hostname.replace(/^www\./,""),u.id,events);}catch{/* Keep valid items from other blocks. */}}status=events.length?"dated-events":"official-calendar";}}}catch{/* The official calendar link remains available. */}
  return {id:u.id,url:u.events,status,checkedAt:new Date().toISOString(),events:events.slice(0,12)};
 }));
 return {sources,events:sources.flatMap(s=>s.events).sort((a,b)=>a.start.localeCompare(b.start))};
}
