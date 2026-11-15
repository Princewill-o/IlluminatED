import {canArrestPlayer,cooled,freshLife,MAX_STARS,releaseFromPrison,type LifeState} from "./law";
import {canHearStreetCase} from "./street-custody";
export interface LifeStorage {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void;}
export const lifeStorageKey=(userId:string)=>`illuminated:life:${userId}`;
/** Claim the old device save once, then keep each account's penalties separate. */
export function readAccountLife(store:LifeStorage,userId:string,now:number):LifeState {
 const key=lifeStorageKey(userId);
 let raw=store.getItem(key);
 const legacy=store.getItem("illuminated:life");
 if(!raw&&legacy&&!store.getItem("illuminated:life-owner")) {
  store.setItem("illuminated:life-owner",userId);store.setItem(key,legacy);raw=legacy;
 }
 try{
  const saved=raw?{...freshLife(),...JSON.parse(raw)}:freshLife();
  const s:LifeState={...saved,stars:Math.max(0,Math.min(MAX_STARS,Number(saved.stars)||0)),jailUntil:Math.max(0,Number(saved.jailUntil)||0)};
  if(s.jailUntil>0&&now>=s.jailUntil)return releaseFromPrison(s);
  if(s.hearing?.streetCase&&!canArrestPlayer(s.stars)&&!canHearStreetCase(s.hearing.streetCase,s.hearing.custody))
   return cooled({...s,hearing:null},now);
  return cooled(s,now);
 }catch{return freshLife();}
}
export function resetAccountWanted(store:LifeStorage,userId:string,token:string,now:number){
 const marker=`illuminated:wanted-reset:${userId}:${token}`;
 if(store.getItem(marker))return;
 store.setItem(lifeStorageKey(userId),JSON.stringify(releaseFromPrison(readAccountLife(store,userId,now))));
 store.setItem(marker,"done");
}
