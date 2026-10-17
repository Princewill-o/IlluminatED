import {buildLondon} from "./london";
import {safeSpot,TILE,type WorldMap} from "./world";
export interface JobStop {name:string;x:number;y:number;}
/** Real movement between tasks, always using the player's collision map. */
export function dailyJobRoute(workplace:string,map:WorldMap):JobStop[]{
 if(workplace==="tescow"&&map.id==="supermarket")return [["Delivery bay: check the order",4,4],["Produce aisle: restock",6,10],["Chilled aisle: check food safety",13,12],["Customer help point",20,18],["Checkout: serve the customer",25,20]].map(([name,x,y])=>({name:String(name),...safeSpot(map,Number(x)*TILE,Number(y)*TILE)}));
 if(workplace!=="pizzazz"||map.id!=="city")return [];
 const pickup=map.portals.find(p=>p.id==="pizzazz");if(!pickup)return [];
 const first={x:pickup.rect.x+pickup.rect.w/2,y:pickup.rect.y+pickup.rect.h/2};
 const homes=buildLondon().things.flatMap(t=>t.kind==="building"&&t.style==="terrace"?[safeSpot(map,(t.x+t.w/2)*TILE,(t.y+t.h+0.8)*TILE)]:[]).filter(p=>Math.hypot(p.x-first.x,p.y-first.y)>TILE*4).sort((a,b)=>Math.hypot(a.x-first.x,a.y-first.y)-Math.hypot(b.x-first.x,b.y-first.y));
 const unique=homes.filter((p,i)=>homes.findIndex(q=>Math.hypot(p.x-q.x,p.y-q.y)<TILE*2)===i).slice(0,4);
 return [{name:"Pizzazz: collect and check the order",...first},...unique.map((p,i)=>({name:`Delivery ${i+1}: check the ticket before handing over`,...p}))];
}
