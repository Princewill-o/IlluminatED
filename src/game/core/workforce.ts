import { hospitalBeds } from "./additional-world-assets";
import type { Thing } from "./london";
import { M25_COLS } from "./m25-layout";
import type { WorldMap } from "./world";

/**
 * The people who keep the world running, placed where the work is: nurses at the bedside,
 * chefs at food carts, cleaners sweeping the concourse, crews mending the road.
 * Pure data; the 3D world draws them and plays their work animation.
 */
export type WorkActivity =
  | "typing" | "laptop" | "eat" | "cook" | "treat" | "sweep" | "direct"
  | "hammer" | "clipboard" | "serve" | "carry" | "lie" | "phone" | "sit-read" | "sit" | "cuffed" | "walk" | "keyboard";
export type WorkRole =
  | "office" | "nurse" | "doctor" | "patient" | "chef" | "diner" | "cleaner"
  | "staff" | "roadworker" | "marshal" | "student" | "passenger"
  | "police" | "judge" | "barrister" | "juror" | "detainee" | "witness";
export type WorkProp = "laptop" | "grill" | "plate" | "broom" | "cones" | "van" | "tray" | "drill";
export type WorkSpot = {
  id: string;
  /** Tile coordinates (centre of the person). */
  x: number;
  z: number;
  heading: number;
  activity: WorkActivity;
  role: WorkRole;
  /** Seated people sit this high (tiles). */
  seatY?: number;
  prop?: WorkProp;
  /** Sweepers and patrolling staff pace between two points. */
  patrol?: { x: number; z: number };
};

/** Clothing per role (top cosmetic ids from the blocky wardrobe). */
export const ROLE_TOP: Record<WorkRole, string> = {
  office: "top-suit",
  nurse: "top-blocky-paramedic-emerald",
  doctor: "top-blocky-business-navy",
  patient: "top-blocky-student-navy",
  chef: "top-blocky-chef-sand",
  diner: "top-blocky-student-navy",
  cleaner: "top-blocky-chef-sand",
  staff: "top-blocky-business-navy",
  roadworker: "top-blocky-workwear-amber",
  marshal: "top-blocky-workwear-amber",
  police: "top-blocky-police-navy",
  judge: "top-blocky-business-slate",
  barrister: "top-blocky-business-navy",
  juror: "top-blocky-casual-teal",
  detainee: "top-blocky-hoodie-slate",
  witness: "top-blocky-raincoat-sand",
  student: "top-blocky-student-navy",
  passenger: "top-blocky-business-navy",
};

const face = (fromX: number, fromZ: number, toX: number, toZ: number) => Math.atan2(toX - fromX, toZ - fromZ);
const ROAD = new Set(["=", ":"]);
const tile = (map: Pick<WorldMap, "tiles">, x: number, y: number) => map.tiles[Math.floor(y)]?.[Math.floor(x)] ?? "#";
/** Open ground a person can stand on (not road, wall or furniture). */
const open = (map: Pick<WorldMap, "tiles">, x: number, y: number) => ".-,_~gG'".includes(tile(map, x, y));

function hospital(map: WorldMap): WorkSpot[] {
  const out: WorkSpot[] = [];
  hospitalBeds(map.tiles).forEach((bay, i) => {
    const px = bay.x + 0.78, pz = bay.y + bay.h / 2;
    out.push({ id: `patient-${i}`, x: px, z: pz, heading: 0, activity: "lie", role: "patient", seatY: 0.62 });
    const nx = bay.x + 1.45, nz = bay.y + bay.h - 0.2;
    out.push({ id: `nurse-${i}`, x: nx, z: nz, heading: face(nx, nz, px, pz), activity: i % 3 === 2 ? "clipboard" : "treat", role: i % 3 === 2 ? "doctor" : "nurse" });
  });
  for (let y = 0; y < map.rows; y++) {
    const x = map.tiles[y].indexOf("r");
    if (x < 0) continue;
    let w = 1;
    while (map.tiles[y][x + w] === "r") w++;
    out.push({ id: "reception", x: x + w * 0.35, z: y - 0.45, heading: 0, activity: "typing", role: "staff", seatY: 0.45 });
    out.push({ id: "reception-2", x: x + w * 0.75, z: y - 0.45, heading: 0, activity: "serve", role: "nurse" });
    break;
  }
  out.push({ id: "porter", x: 10, z: 10.5, heading: Math.PI / 2, activity: "sweep", role: "cleaner", prop: "broom", patrol: { x: 15, z: 10.5 } });
  return out;
}

function station(map: WorldMap): WorkSpot[] {
  const out: WorkSpot[] = [];
  let benches = 0, machines = 0;
  for (let y = 1; y < map.rows - 1; y++)
    for (let x = 1; x < map.cols - 1; x++) {
      const c = map.tiles[y][x];
      if (c === "s" && map.tiles[y][x - 1] !== "s" && benches < 4) {
        out.push({ id: `wait-${x}-${y}`, x: x + 0.5, z: y + 0.55, heading: 0, activity: benches % 2 ? "sit-read" : "phone", role: "passenger", seatY: 0.42 });
        benches++;
      }
      if (c === "v" && map.tiles[y][x - 1] !== "v" && machines < 2 && open(map, x + 0.5, y + 1.6)) {
        out.push({ id: `help-${x}-${y}`, x: x + 0.5, z: y + 1.6, heading: Math.PI, activity: "clipboard", role: "staff" });
        machines++;
      }
    }
  const mid = Math.floor(map.rows / 2);
  for (let x = 2; x < map.cols - 6; x++)
    if (open(map, x, mid) && open(map, x + 5, mid)) {
      out.push({ id: "cleaner", x: x + 0.5, z: mid + 0.5, heading: Math.PI / 2, activity: "sweep", role: "cleaner", prop: "broom", patrol: { x: x + 5.5, z: mid + 0.5 } });
      break;
    }
  return out;
}

/** Street life for outdoor maps: food carts, people eating on benches, roadworks crews. */
function streets(map: WorldMap, things: readonly Thing[]): WorkSpot[] {
  const out: WorkSpot[] = [];
  let carts = 0, diners = 0;
  for (const t of things) {
    if (t.kind === "bench" && diners < 6 && (t.x * 7 + t.y * 3) % 3 === 0) {
      out.push({ id: `diner-${t.id}`, x: t.x + 0.5, z: t.y + 0.45, heading: 0, activity: diners % 3 === 2 ? "laptop" : "eat", role: diners % 3 === 2 ? "student" : "diner", seatY: 0.42, prop: diners % 3 === 2 ? "laptop" : "plate" });
      diners++;
    }
    if (t.kind === "building" && (t.style === "shop" || t.style === "company" || !t.id.includes("home")) && t.style !== "terrace" && carts < 5 && (t.x + t.y) % 2 === 0) {
      const cx = t.x + t.w / 2, cz = t.y + t.h + 1.4;
      if (open(map, cx, cz) && open(map, cx, cz + 1) && open(map, cx + 1, cz)) {
        out.push({ id: `chef-${t.id}`, x: cx, z: cz - 0.55, heading: 0, activity: "cook", role: "chef", prop: "grill" });
        out.push({ id: `customer-${t.id}`, x: cx + 0.2, z: cz + 1.1, heading: Math.PI, activity: "serve", role: "diner" });
        carts++;
      }
    }
  }
  // Roadworks: a few kerbside crews where pavement meets road, spread across the map.
  let crews = 0, lastX = -99, lastY = -99;
  for (let y = 4; y < map.rows - 4 && crews < 4; y++)
    for (let x = 6; x < map.cols - 8 && crews < 4; x++) {
      if (Math.abs(y - lastY) < 30 && Math.abs(x - lastX) < 40) continue;
      if (!(ROAD.has(tile(map, x, y)) && ROAD.has(tile(map, x + 3, y)) && open(map, x, y - 1) && open(map, x + 4, y - 1))) continue;
      out.push({ id: `works-${x}-${y}`, x: x + 1, z: y + 0.5, heading: 0, activity: "hammer", role: "roadworker", prop: "cones" });
      out.push({ id: `marshal-${x}-${y}`, x: x + 4.2, z: y - 0.5, heading: -Math.PI / 2, activity: "direct", role: "marshal" });
      crews++; lastX = x; lastY = y;
    }
  return out;
}

/** M25 maintenance crews on the hard shoulder, with a works van and a coned-off lane. */
function motorway(): WorkSpot[] {
  const out: WorkSpot[] = [];
  for (const [i, x] of [120, 340, 610].entries()) {
    if (x >= M25_COLS) continue;
    const z = i % 2 ? 46.5 : 25.2;
    out.push({ id: `m25-van-${i}`, x, z, heading: Math.PI / 2, activity: "clipboard", role: "roadworker", prop: "van" });
    out.push({ id: `m25-drill-${i}`, x: x + 3, z, heading: i % 2 ? Math.PI : 0, activity: "hammer", role: "roadworker", prop: "cones" });
    out.push({ id: `m25-marshal-${i}`, x: x - 4, z, heading: -Math.PI / 2, activity: "direct", role: "marshal" });
  }
  return out;
}

/** The custody suite: desk sergeant, custody officer, officers writing up, someone already in a cell. */
function policeStation(): WorkSpot[] {
  return [
    { id: "desk-sergeant", x: 6.5, z: 12.4, heading: 0, activity: "typing", role: "police", seatY: 0.45 },
    { id: "custody-officer", x: 17.5, z: 7.3, heading: 0, activity: "clipboard", role: "police" },
    { id: "officer-1", x: 4.5, z: 10.4, heading: Math.PI, activity: "typing", role: "police", seatY: 0.45 },
    { id: "officer-2", x: 9.5, z: 10.4, heading: Math.PI, activity: "typing", role: "police", seatY: 0.45 },
    { id: "detainee", x: 18.5, z: 2.5, heading: 0, activity: "sit", role: "detainee", seatY: 0.42 },
    { id: "interview", x: 4, z: 4.4, heading: Math.PI, activity: "clipboard", role: "police" },
    { id: "patrol", x: 12, z: 15.2, heading: Math.PI / 2, activity: "walk", role: "police", patrol: { x: 23, z: 15.2 } },
  ];
}

/** The Crown Court in session: judge, clerk, barristers, usher, witness and the jury. Ids match COURT.speaker. */
function court(): WorkSpot[] {
  const jury: WorkSpot[] = Array.from({ length: 6 }, (_, i) => ({ id: `jury-${i + 1}`, x: 2.5 + (i % 2), z: 3.2 + Math.floor(i / 2) * 1.1, heading: Math.PI / 2, activity: "sit", role: "juror", seatY: 0.42 }));
  return [
    { id: "judge", x: 10.5, z: 1.6, heading: 0, activity: "clipboard", role: "judge" },
    { id: "clerk", x: 10.5, z: 3.7, heading: 0, activity: "typing", role: "staff", seatY: 0.45 },
    { id: "prosecution", x: 6, z: 5.6, heading: Math.PI, activity: "clipboard", role: "barrister" },
    { id: "defence", x: 15, z: 5.6, heading: Math.PI, activity: "clipboard", role: "barrister" },
    { id: "witness", x: 18.5, z: 3.4, heading: -Math.PI / 2, activity: "idle" as WorkActivity, role: "witness" },
    { id: "usher", x: 19.5, z: 8.5, heading: -Math.PI / 2, activity: "clipboard", role: "staff" },
    { id: "dock-officer", x: 13.6, z: 8.4, heading: Math.PI, activity: "idle" as WorkActivity, role: "police" },
    ...jury,
  ];
}

export function workforceFor(map: WorldMap, things: readonly Thing[] = []): WorkSpot[] {
  if (map.id === "police-station") return policeStation();
  if (map.id === "court") return court();
  if (map.kind === "hospital") return hospital(map);
  if (map.kind === "station") return station(map);
  if (map.id === "m25") return motorway();
  if (map.kind === "city" || map.kind === "campus") return streets(map, things);
  return [];
}
