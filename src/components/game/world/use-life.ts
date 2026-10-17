"use client";
import {useCallback,useEffect,useState} from "react";

import {freshLife,type LifeState} from "@/game/core/law";
import {lifeStorageKey,readAccountLife,resetAccountWanted,type LifeStorage} from "@/game/core/life-storage";

const EVENT="illuminated:life";
const memory=new Map<string,string>();
const store:LifeStorage={getItem:key=>{try{return localStorage.getItem(key)??memory.get(key)??null;}catch{return memory.get(key)??null;}},setItem:(key,value)=>{memory.set(key,value);try{localStorage.setItem(key,value);}catch{/* Keep this browser session playable when storage is blocked. */}}};
export function readLife(userId:string):LifeState{return readAccountLife(store,userId,Date.now());}
export function writeLife(userId:string,state:LifeState){store.setItem(lifeStorageKey(userId),JSON.stringify(state));window.dispatchEvent(new CustomEvent(EVENT));}
/** Browser-local game state, scoped to the signed-in account. */
export function useLife(userId:string,resetWantedToken?:string){
 const [life,setLife]=useState<LifeState>(freshLife);
 useEffect(()=>{
  if(resetWantedToken)resetAccountWanted(store,userId,resetWantedToken,Date.now());
  setLife(readLife(userId));
  const timer=setInterval(()=>setLife(readLife(userId)),1000);
  const on=()=>setLife(readLife(userId));window.addEventListener(EVENT,on);
  return()=>{clearInterval(timer);window.removeEventListener(EVENT,on);};
 },[userId,resetWantedToken]);
 const update=useCallback((f:(state:LifeState)=>LifeState)=>{const next=f(readLife(userId));writeLife(userId,next);setLife(next);},[userId]);
 return {life,update};
}
