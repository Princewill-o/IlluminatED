import {buildLondon} from "./london";
import {safeSpot,TILE,type WorldMap} from "./world";
export interface JobStop {name:string;x:number;y:number;}
/** Real movement between tasks, always using the player's collision map. */
export function dailyJobRoute(workplace:string,map:WorldMap):JobStop[]{
 if(workplace==="tescow"&&map.id==="supermarket")return [["Delivery bay: check the order",4,4],["Produce aisle: restock",6,10],["Chilled aisle: check food safety",13,12],["Customer help point",20,18],["Checkout: serve the customer",25,20]].map(([name,x,y])=>({name:String(name),...safeSpot(map,Number(x)*TILE,Number(y)*TILE)}));
 if(map.id===`workplace-${workplace}`&&workplace!=="pizzazz")return workplaceRoute(map);
 if(workplace!=="pizzazz"||map.id!=="city")return [];
 const pickup=map.portals.find(p=>p.id==="pizzazz");if(!pickup)return [];
 const first={x:pickup.rect.x+pickup.rect.w/2,y:pickup.rect.y+pickup.rect.h/2};
 const homes=buildLondon().things.flatMap(t=>t.kind==="building"&&t.style==="terrace"?[safeSpot(map,(t.x+t.w/2)*TILE,(t.y+t.h+0.8)*TILE)]:[]).filter(p=>Math.hypot(p.x-first.x,p.y-first.y)>TILE*4).sort((a,b)=>Math.hypot(a.x-first.x,a.y-first.y)-Math.hypot(b.x-first.x,b.y-first.y));
 const unique=homes.filter((p,i)=>homes.findIndex(q=>Math.hypot(p.x-q.x,p.y-q.y)<TILE*2)===i).slice(0,4);
 return [{name:"Pizzazz: collect and check the order",...first},...unique.map((p,i)=>({name:`${["Maya","Theo","Aisha","Jules"][i]} · waiting on the street for pizza`,...p}))];
}

/** What the work looks like for each kind of task: the label at the work point and the animation. */
export const TASK_ACTION: Record<string, { verb: string; activity: string }> = {
  change: { verb: "Till: count the change back", activity: "serve" },
  basket: { verb: "Checkout: scan the basket", activity: "serve" },
  pizzaOrder: { verb: "Prep line: make the pizza to ticket", activity: "cook" },
  foodSafety: { verb: "Kitchen: probe-check food temperatures", activity: "clipboard" },
  stock: { verb: "Stockroom: restock the shelves", activity: "carry" },
  inbox: { verb: "Desk: clear the team inbox", activity: "keyboard" },
  booking: { verb: "Front desk: book the appointment", activity: "keyboard" },
  email: { verb: "Desk: write the reply", activity: "keyboard" },
  gdpr: { verb: "Records: lock away personal files", activity: "carry" },
  bugfix: { verb: "Dev desk: fix the failing code", activity: "keyboard" },
  trace: { verb: "Dev desk: trace the program", activity: "keyboard" },
  sql: { verb: "Data desk: query the database", activity: "keyboard" },
  itTicket: { verb: "Help desk: fix the user's computer", activity: "keyboard" },
  interest: { verb: "Advice desk: work out the interest", activity: "keyboard" },
  fraud: { verb: "Fraud desk: check the transactions", activity: "clipboard" },
  triage: { verb: "Ward: triage the waiting patients", activity: "clipboard" },
  vitals: { verb: "Bay: take the patient's observations", activity: "treat" },
  reception: { verb: "Reception: greet the visitor", activity: "serve" },
  clause: { verb: "Library: read the contract", activity: "clipboard" },
  headline: { verb: "Studio: write the post", activity: "keyboard" },
  ctr: { verb: "Studio: check the campaign results", activity: "keyboard" },
};
export const taskAction = (kind: string) => TASK_ACTION[kind] ?? { verb: "Work point: do the task", activity: "clipboard" };

/** Five work points spread across a workplace floor, in front of its desks, counters and shelves. */
export function workplaceRoute(map: WorldMap): JobStop[] {
  const spots: { x: number; y: number }[] = [];
  for (let y = 2; y < map.rows - 2; y++)
    for (let x = 2; x < map.cols - 2; x++) {
      if (!"dkrtvbs".includes(map.tiles[y][x]) || map.tiles[y][x - 1] === map.tiles[y][x]) continue;
      const front = map.tiles[y + 1]?.[x] === "." ? y + 1 : map.tiles[y - 1]?.[x] === "." ? y - 1 : -1;
      if (front < 0) continue;
      const p = safeSpot(map, (x + 0.5) * TILE, (front + 0.5) * TILE);
      if (spots.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > TILE * 3.5)) spots.push(p);
    }
  // Zig-zag across the floor rather than reading order, so each task is a walk.
  const ordered = spots.sort((a, b) => a.x - b.x).filter((_, i) => i % Math.max(1, Math.floor(spots.length / 5)) === 0).slice(0, 5);
  return ordered.map((p, i) => ({ name: `Work point ${i + 1}`, ...p }));
}
