"use client";
import {useCallback,useEffect,useRef,useState} from 'react';

import {NPC_SPOTS,PLAYER} from './art';
import {damageEnergy,readNeeds} from './use-needs';

import {assessStreetEncounter,beginStreetEncounter,civilianDisposition,endCivilianThreat,recordStreetHit,type StreetEncounter,type StreetAssessment} from '@/game/core/civilian-conflict';

/** Only local ambient residents can initiate these fictional encounters. */
export function useStreetEncounters(active:boolean,onCase:(assessment:StreetAssessment)=>void,onDowned:()=>void){
 const [warning,setWarning]=useState<string|null>(null);
 const [attacked,setAttacked]=useState(false);
 const incident=useRef<StreetEncounter|null>(null),lastHit=useRef(0),warnAt=useRef(0),cooldown=useRef(0),retaliateAt=useRef(0);
 const warnedNpc=useRef<string|null>(null);
 const callbacks=useRef({onCase,onDowned});callbacks.current={onCase,onDowned};
 const finish=useCallback(()=>{const e=incident.current;incident.current=null;setAttacked(false);setWarning(null);warnAt.current=0;warnedNpc.current=null;if(e){cooldown.current=Date.now()+20000;callbacks.current.onCase(assessStreetEncounter(endCivilianThreat(e,Date.now())));}},[]);
 useEffect(()=>{if(!active){finish();return;}const timer=setInterval(()=>{
  const now=Date.now();if(now<cooldown.current)return;
  const current=incident.current;
  const nearby=NPC_SPOTS.filter(n=>n.id?.includes(':resident:')&&!n.id.includes(':pizza-')&&Math.hypot(n.x-PLAYER.x,n.y-PLAYER.y)<100);
  const npc=current?nearby.find(n=>n.id===current.npcId):nearby.find(n=>civilianDisposition(n.id!).hostile);
  if(!npc){if(current)finish();else{setWarning(null);warnAt.current=0;warnedNpc.current=null;}return;}
  const distance=Math.hypot(npc.x-PLAYER.x,npc.y-PLAYER.y),disposition=civilianDisposition(npc.id!);
  if(!current){setWarning(`${npc.name??'Civilian'} is agitated. Keep your distance.`);if(warnedNpc.current!==npc.id){warnedNpc.current=npc.id!;warnAt.current=now;}}
  if(distance>34||now-warnAt.current<disposition.windupMs)return;
  if(now-lastHit.current<disposition.hitCooldownMs)return;
  const encounter=current??beginStreetEncounter({npcId:npc.id!,npcName:npc.name??'Civilian',at:now,witnesses:Math.min(3,nearby.length-1)});
  incident.current=recordStreetHit(encounter,{attacker:'civilian',damage:disposition.damage,at:now});lastHit.current=now;
  setAttacked(true);setWarning(`${npc.name??'Civilian'} attacked. Walk away or defend yourself (F).`);
  window.dispatchEvent(new CustomEvent('illuminated:civilian-attack',{detail:{npcId:npc.id}}));
  const energy=damageEnergy(disposition.damage);
  if(energy<=0){const e=incident.current;incident.current=null;cooldown.current=now+60000;setAttacked(false);setWarning(null);if(e)callbacks.current.onCase(assessStreetEncounter(endCivilianThreat(e,now)));callbacks.current.onDowned();}
 },250);return()=>clearInterval(timer);},[active,finish]);
 const defend=useCallback(()=>{
  const e=incident.current,now=Date.now();if(!e||now-retaliateAt.current<850||readNeeds().energy<=0)return false;
  const target=NPC_SPOTS.find(n=>n.id===e.npcId&&Math.hypot(n.x-PLAYER.x,n.y-PLAYER.y)<64);if(!target)return false;
  retaliateAt.current=now;
  window.dispatchEvent(new CustomEvent('illuminated:fight',{detail:{npcId:e.npcId,defensive:true}}));
  // A limited defensive hit ends the threat; the case is assessed from actual hit provenance.
  return true;
 },[finish]);
 useEffect(()=>{
  const landed=(event:Event)=>{
    const hit=(event as CustomEvent<{npcId:string;npcName:string;defensive?:boolean}>).detail;
    if(!hit?.npcId)return;
    if(hit.defensive&&incident.current?.npcId!==hit.npcId)return;
    if(incident.current&&incident.current.npcId!==hit.npcId)finish();
    const now=Date.now(),e=incident.current??beginStreetEncounter({npcId:hit.npcId,npcName:hit.npcName,at:now,witnesses:1});
    incident.current=recordStreetHit(e,{attacker:'player',damage:12,at:now});finish();
  };
  window.addEventListener('illuminated:street-hit',landed);return()=>window.removeEventListener('illuminated:street-hit',landed);
 },[active,finish]);
 return{warning,attacked,defend};
}
