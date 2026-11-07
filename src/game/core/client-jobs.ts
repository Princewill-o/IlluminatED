/**
 * Real jobs with NPC clients. Every practical role works the same honest way:
 * a client turns up with a specific request, you collect exactly what it needs from the
 * stations in your workplace (walk onto a station to use it, no buttons), then hand it
 * over to the client. Delivery, taxi and bus roles take the order out into the city
 * to a client waiting at an address or a kerb. Accuracy (the right things, in the right
 * order where order matters) sets the pay, which the server checks.
 */
import { TILE, type WorldMap } from "./world";

export type Rng = () => number;
export type JobMode = "counter" | "delivery" | "ride";
export type StationDef = { id: string; label: string; action: "cook" | "treat" | "sweep" | "direct" | "hammer" | "clipboard" | "serve" | "keyboard" | "carry" | "laptop"; tile: string };
export type ClientOrder = { client: string; line: string; needs: string[]; ordered: boolean; dropLabel?: string };
export type ClientJobDef = {
  mode: JobMode;
  building: string;
  clientKind: string;
  stations: StationDef[];
  order: (rng: Rng, tier: number) => ClientOrder;
  thanks: [good: string, poor: string];
};

const NAMES = ["Amara", "Jordan", "Priya", "Tom", "Kwame", "Sofia", "Ali", "Grace", "Leo", "Mei", "Zara", "Ollie", "Nia", "Ravi", "Ellie", "Sam"];
const pick = <T,>(rng: Rng, list: readonly T[]) => list[Math.floor(rng() * list.length) % list.length];
const some = <T,>(rng: Rng, list: readonly T[], n: number) => [...list].sort(() => rng() - 0.5).slice(0, n);
const st = (id: string, label: string, action: StationDef["action"], tile: string): StationDef => ({ id, label, action, tile });
const who = (rng: Rng) => pick(rng, NAMES);

export const CLIENT_JOBS: Record<string, ClientJobDef> = {
  "pizza-chef": {
    mode: "counter", building: "Pizzazz Pizza kitchen", clientKind: "customer", thanks: ["Smells amazing, thank you!", "Hmm, that's not quite what I ordered…"],
    stations: [st("dough", "Dough station", "cook", "k"), st("sauce", "Tomato sauce", "cook", "k"), st("cheese", "Cheese", "cook", "F"), st("pepperoni", "Pepperoni", "cook", "F"), st("mushrooms", "Mushrooms", "cook", "F"), st("peppers", "Peppers", "cook", "F"), st("oven", "Pizza oven", "cook", "O"), st("box", "Boxing counter", "serve", "k")],
    order: (rng, tier) => {
      const toppings = some(rng, ["pepperoni", "mushrooms", "peppers"], tier >= 1 ? 2 : rng() < 0.5 ? 1 : 0);
      const name = toppings.length ? `${toppings.join(" and ")} pizza` : "margherita";
      return { client: who(rng), line: `One ${name}, please!`, needs: ["dough", "sauce", "cheese", ...toppings, "oven", "box"], ordered: true };
    },
  },
  "delivery-driver": {
    mode: "delivery", building: "Delivery depot", clientKind: "recipient", thanks: ["Brilliant, I've been waiting for this!", "Is this really mine? The box is a bit battered…"],
    stations: [st("scanner", "Scanner desk", "keyboard", "d"), st("parcels", "Parcel shelves", "carry", "v"), st("pizza-hatch", "Pizzazz collection hatch", "carry", "k"), st("trolley", "Heavy-item trolley", "carry", "k")],
    order: (rng, tier) => {
      const pizza = rng() < 0.4;
      const heavy = !pizza && tier >= 2 && rng() < 0.5;
      return { client: who(rng), line: pizza ? "Hot pizza order for delivery" : heavy ? "A heavy parcel (needs the trolley)" : "A parcel for delivery", needs: pizza ? ["pizza-hatch"] : heavy ? ["scanner", "parcels", "trolley"] : ["scanner", "parcels"], ordered: true, dropLabel: pizza ? "Hand over the pizza" : "Hand over the parcel" };
    },
  },
  cashier: {
    mode: "counter", building: "Supermarket tills", clientKind: "shopper", thanks: ["Thanks, have a lovely day!", "I think you've charged me wrong…"],
    stations: [st("scan", "Barcode scanner", "serve", "k"), st("scales", "Fruit and veg scales", "serve", "k"), st("bag", "Bagging area", "carry", "k"), st("card", "Card reader", "keyboard", "k"), st("cash", "Cash drawer", "keyboard", "k"), st("receipt", "Receipt printer", "serve", "d")],
    order: (rng) => { const veg = rng() < 0.5, cash = rng() < 0.4; return { client: who(rng), line: `${veg ? "Just these apples and my shopping" : "Just my shopping"}, I'll pay by ${cash ? "cash" : "card"}.`, needs: ["scan", ...(veg ? ["scales"] : []), "bag", cash ? "cash" : "card", "receipt"], ordered: true }; },
  },
  stocker: {
    mode: "counter", building: "Supermarket aisles", clientKind: "shopper", thanks: ["Oh perfect, just what I needed!", "That's not the shelf I meant…"],
    stations: [st("milk", "Stockroom: milk crates", "carry", "F"), st("bread", "Stockroom: bread trays", "carry", "v"), st("tins", "Stockroom: tins", "carry", "v"), st("dairy", "Dairy aisle", "carry", "F"), st("bakery", "Bakery aisle", "carry", "v"), st("tinned", "Tinned food aisle", "carry", "v"), st("price", "Price label gun", "clipboard", "d")],
    order: (rng, tier) => { const [what, store, shelf] = pick(rng, [["milk", "milk", "dairy"], ["bread", "bread", "bakery"], ["beans", "tins", "tinned"]] as const); return { client: who(rng), line: `Excuse me, you're out of ${what}!`, needs: [store, shelf, ...(tier >= 1 ? ["price"] : [])], ordered: true }; },
  },
  mechanic: {
    mode: "counter", building: "Motor Mile garage", clientKind: "driver", thanks: ["It drives like new, thank you!", "It's still making that noise…"],
    stations: [st("diagnostics", "Diagnostic computer", "laptop", "d"), st("ramp", "Car ramp", "hammer", "A"), st("tyres", "Tyre rack", "carry", "v"), st("brakes", "Brake parts", "carry", "v"), st("oil", "Oil and filters", "carry", "F"), st("battery", "Battery shelf", "carry", "v"), st("keys", "Key desk", "serve", "r")],
    order: (rng) => { const fault = pick(rng, [["The tyre's gone flat", ["ramp", "tyres"]], ["The brakes squeal", ["diagnostics", "ramp", "brakes"]], ["It's due a service", ["ramp", "oil"]], ["It won't start", ["diagnostics", "battery"]]] as const); return { client: who(rng), line: `${fault[0]}. Can you fix it?`, needs: [...fault[1], "keys"], ordered: false }; },
  },
  doctor: {
    mode: "counter", building: "St Tomas' Hospital clinic", clientKind: "patient", thanks: ["I feel much better already, thank you doctor.", "Are you sure that's right?"],
    stations: [st("obs", "Observations machine", "treat", "d"), st("exam", "Examination bed", "treat", "b"), st("bloods", "Blood test kit", "treat", "k"), st("xray", "X-ray room", "treat", "d"), st("prescription", "Prescription printer", "keyboard", "d"), st("sling", "Splints and slings", "treat", "v")],
    order: (rng) => { const c = pick(rng, [["I've had a cough for a week", ["obs", "exam", "prescription"]], ["I fell and hurt my wrist", ["exam", "xray", "sling"]], ["I've been really tired lately", ["obs", "bloods"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: false }; },
  },
  nurse: {
    mode: "counter", building: "St Tomas' Hospital ward", clientKind: "patient", thanks: ["Thank you, nurse.", "Could you check that again?"],
    stations: [st("obs", "Obs machine", "treat", "d"), st("meds", "Medicine trolley", "treat", "k"), st("dressing", "Dressings", "treat", "v"), st("water", "Water jug", "serve", "k"), st("chart", "Patient chart", "clipboard", "d")],
    order: (rng) => { const c = pick(rng, [["Bed 3 needs their medicine round", ["chart", "meds"]], ["Bed 5's dressing needs changing", ["dressing", "chart"]], ["Bed 2 needs obs and a drink", ["obs", "water", "chart"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: false }; },
  },
  police: {
    mode: "counter", building: "Police station front desk", clientKind: "member of the public", thanks: ["Thank you, officer, that's a weight off my mind.", "I hope that gets sorted…"],
    stations: [st("report", "Crime report terminal", "keyboard", "d"), st("lost", "Lost property", "carry", "v"), st("radio", "Radio a patrol", "direct", "d"), st("leaflet", "Safety leaflets", "serve", "v")],
    order: (rng) => { const c = pick(rng, [["I've lost my wallet", ["lost", "report"]], ["My bike was stolen", ["report", "radio"]], ["Someone's been knocking on doors pretending to be from the council", ["report", "leaflet"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: false }; },
  },
  firefighter: {
    mode: "delivery", building: "Fire station", clientKind: "resident", thanks: ["Thank you so much, we feel safer now.", "Was that it? I thought it'd be more thorough…"],
    stations: [st("kit", "Kit lockers", "carry", "v"), st("alarm", "Smoke alarm stock", "carry", "v"), st("extinguisher", "Extinguishers", "carry", "F"), st("engine", "Fire engine", "direct", "A")],
    order: (rng) => { const ext = rng() < 0.5; return { client: who(rng), line: ext ? "Home fire-safety visit: fit an alarm and drop off an extinguisher" : "Home fire-safety visit: fit a smoke alarm", needs: ["kit", "alarm", ...(ext ? ["extinguisher"] : []), "engine"], ordered: false, dropLabel: "Fit the alarm and talk through fire safety" }; },
  },
  builder: {
    mode: "counter", building: "Builders' yard", clientKind: "homeowner", thanks: ["Solid work, thank you!", "It looks a bit wonky…"],
    stations: [st("bricks", "Brick pallets", "carry", "v"), st("mixer", "Cement mixer", "hammer", "F"), st("timber", "Timber rack", "carry", "v"), st("tools", "Tool store", "hammer", "k"), st("level", "Spirit level", "clipboard", "d")],
    order: (rng) => { const c = pick(rng, [["Can you build a garden wall?", ["bricks", "mixer", "tools", "level"]], ["We need a new garden shed", ["timber", "tools", "level"]], ["The patio needs repairing", ["mixer", "tools"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: false }; },
  },
  cleaner: {
    mode: "counter", building: "Office cleaning cupboard", clientKind: "office manager", thanks: ["Spotless, thanks!", "There's still a sticky patch…"],
    stations: [st("mop", "Mop and bucket", "sweep", "k"), st("sign", "Wet floor signs", "carry", "v"), st("spray", "Cleaning spray", "sweep", "k"), st("vacuum", "Vacuum", "sweep", "F"), st("bins", "Recycling bins", "carry", "v")],
    order: (rng) => { const c = pick(rng, [["Someone spilt coffee in reception", ["sign", "mop"]], ["The meeting room needs a hoover", ["vacuum", "bins"]], ["The kitchen's a mess", ["spray", "bins", "mop"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: false }; },
  },
  barber: {
    mode: "counter", building: "City salon", clientKind: "client", thanks: ["Love it, thank you!", "That's… not what I asked for."],
    stations: [st("sink", "Wash basin", "serve", "k"), st("chair", "Styling chair", "serve", "s"), st("clippers", "Clippers", "serve", "d"), st("scissors", "Scissors", "serve", "d"), st("dryer", "Hairdryer", "serve", "d"), st("till", "Salon till", "keyboard", "r")],
    order: (rng) => { const c = pick(rng, [["Short back and sides, please", ["chair", "clippers", "till"]], ["Just a trim, please", ["sink", "chair", "scissors", "dryer", "till"]], ["A skin fade, please", ["chair", "clippers", "scissors", "till"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: true }; },
  },
  teacher: {
    mode: "counter", building: "Study Quarter classroom", clientKind: "student", thanks: ["Oh, I get it now. Thanks, Miss/Sir!", "I'm still a bit confused…"],
    stations: [st("board", "Whiteboard", "clipboard", "d"), st("worksheet", "Worksheet printer", "keyboard", "d"), st("books", "Textbook shelf", "carry", "v"), st("laptop", "Class laptop trolley", "laptop", "k"), st("marking", "Marking desk", "clipboard", "d")],
    order: (rng) => { const c = pick(rng, [["I don't understand fractions", ["board", "worksheet"]], ["Can I check my essay?", ["marking", "books"]], ["I need to research volcanoes", ["laptop", "books"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: false }; },
  },
  "bus-driver": {
    mode: "ride", building: "Bus depot", clientKind: "passenger", thanks: ["Cheers, driver!", "That was a bumpy ride…"],
    stations: [st("depot-desk", "Depot desk: collect your route", "clipboard", "d"), st("ticket", "Ticket machine", "keyboard", "k")],
    order: (rng) => ({ client: who(rng), line: "Waiting at the bus stop", needs: ["depot-desk", "ticket"], ordered: true, dropLabel: "Drop off at the stop" }),
  },
  "taxi-driver": {
    mode: "ride", building: "Taxi office", clientKind: "passenger", thanks: ["Great driving, keep the change!", "Took the long way round, didn't you?"],
    stations: [st("dispatch", "Dispatch desk", "keyboard", "d"), st("meter", "Taxi meter", "keyboard", "k")],
    order: (rng) => ({ client: who(rng), line: "Waiting for a taxi", needs: ["dispatch", "meter"], ordered: true, dropLabel: "Drop off at the destination" }),
  },
  gardener: {
    mode: "counter", building: "Garden centre", clientKind: "customer", thanks: ["The garden looks gorgeous!", "Hmm, that's not what I had in mind."],
    stations: [st("seeds", "Seed shed", "carry", "v"), st("compost", "Compost bags", "carry", "k"), st("trowel", "Trowels and forks", "sweep", "k"), st("can", "Watering cans", "sweep", "F"), st("mower", "Lawnmower", "sweep", "A")],
    order: (rng) => { const c = pick(rng, [["Can you plant tulips for me?", ["seeds", "compost", "trowel", "can"]], ["My lawn needs mowing", ["mower"]], ["I'd like a vegetable bed", ["compost", "seeds", "trowel"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: false }; },
  },
  warehouse: {
    mode: "counter", building: "Distribution warehouse", clientKind: "dispatcher", thanks: ["Order's out on time, nice one.", "That order's wrong, it'll come back."],
    stations: [st("shelf-a", "Aisle A: headphones", "carry", "v"), st("shelf-b", "Aisle B: kettles", "carry", "v"), st("shelf-c", "Aisle C: books", "carry", "v"), st("pack", "Packing bench", "carry", "k"), st("dispatch", "Dispatch bay", "carry", "A")],
    order: (rng) => { const items = some(rng, [["shelf-a", "headphones"], ["shelf-b", "a kettle"], ["shelf-c", "books"]] as const, 1 + Math.floor(rng() * 2)); return { client: who(rng), line: `Order: ${items.map((i) => i[1]).join(" and ")}`, needs: [...items.map((i) => i[0]), "pack", "dispatch"], ordered: false }; },
  },
  waiter: {
    mode: "counter", building: "Pizzazz dining room", clientKind: "diner", thanks: ["Lovely, thank you!", "This isn't what we ordered…"],
    stations: [st("menus", "Menus", "serve", "v"), st("drinks", "Drinks fridge", "serve", "F"), st("pass", "Kitchen pass", "serve", "k"), st("dessert", "Dessert counter", "serve", "k"), st("till", "Till", "keyboard", "r")],
    order: (rng) => { const want = some(rng, [["drinks", "two lemonades"], ["pass", "a margherita"], ["dessert", "an ice cream"]] as const, 2); return { client: who(rng), line: `We'd like ${want.map((w) => w[1]).join(" and ")}, please.`, needs: [...want.map((w) => w[0]), "till"], ordered: false }; },
  },
  fisher: {
    mode: "counter", building: "Thames bait and tackle", clientKind: "fishmonger", thanks: ["Fresh catch, lovely!", "These are a bit small…"],
    stations: [st("rod", "Rod rack", "carry", "v"), st("bait", "Bait fridge", "carry", "F"), st("nets", "Crab pots and nets", "carry", "v"), st("jetty", "End of the jetty: cast and reel in", "carry", "A"), st("coolbox", "Cool box", "carry", "k"), st("scales", "Weighing scales", "clipboard", "d")],
    order: (rng) => rng() < 0.35
      ? { client: who(rng), line: "Any crabs today? I'll take a few.", needs: ["nets", "jetty", "coolbox", "scales"], ordered: true }
      : { client: who(rng), line: `I'll buy ${pick(rng, ["two mackerel", "some cod", "a sea bass"])}, fresh as you like.`, needs: ["rod", "bait", "jetty", "coolbox", "scales"], ordered: true },
  },
  security: {
    mode: "counter", building: "Office security desk", clientKind: "visitor", thanks: ["Thanks, that was quick.", "I've been waiting ages…"],
    stations: [st("log", "Visitor log", "clipboard", "d"), st("badge", "ID badge printer", "keyboard", "d"), st("cctv", "CCTV screens", "laptop", "d"), st("lift", "Call the lift", "direct", "k"), st("lostfound", "Lost and found", "carry", "v")],
    order: (rng) => { const c = pick(rng, [[`I'm here to see Ms Okafor`, ["log", "badge", "lift"]], ["I left my umbrella here yesterday", ["cctv", "lostfound"]], ["I'm a contractor for the second floor", ["log", "badge", "lift"]]] as const); return { client: who(rng), line: c[0], needs: [...c[1]], ordered: true }; },
  },
};
export const clientJob = (roleId: string) => CLIENT_JOBS[roleId] ?? null;

/** How well you did: the right things collected, nothing extra, and in order if it matters. */
export function serviceAccuracy(order: ClientOrder, collected: string[]) {
  const need = order.needs;
  const hits = need.filter((n) => collected.includes(n)).length;
  const extra = collected.filter((c) => !need.includes(c)).length;
  let orderScore = 1;
  if (order.ordered) {
    const seq = collected.filter((c) => need.includes(c));
    let inOrder = 0;
    for (let i = 0; i < seq.length; i++) if (seq[i] === need[i]) inOrder++;
    orderScore = need.length ? inOrder / need.length : 1;
  }
  const score = (hits / Math.max(1, need.length)) * (order.ordered ? 0.6 + 0.4 * orderScore : 1) - extra * 0.12;
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

/**
 * The workplace for a role: its own building interior with the role's stations along the
 * walls, a counter by the door where clients come to you, and the exit to the city.
 */
export const ROLE_MAP_W = 26, ROLE_MAP_H = 18;
export function roleStationSpots(def: ClientJobDef) {
  // Stations around three walls; positions are the floor tile in front of each station's furniture.
  const slots: { fx: number; fy: number; x: number; y: number }[] = [];
  for (let x = 3; x <= 22 && slots.length < 8; x += 4) slots.push({ fx: x, fy: 2, x, y: 3 });
  for (let y = 6; y <= 10 && slots.length < 10; y += 4) { slots.push({ fx: 1, fy: y, x: 2, y }); slots.push({ fx: 24, fy: y, x: 23, y }); }
  return def.stations.map((s, i) => ({ ...s, ...slots[i % slots.length] }));
}
export const ROLE_COUNTER = { x: 13, y: 12 };
export function roleMapTiles(def: ClientJobDef) {
  const t: string[][] = Array.from({ length: ROLE_MAP_H }, (_, y) => Array.from({ length: ROLE_MAP_W }, (_, x): string => (x === 0 || y === 0 || x === ROLE_MAP_W - 1 || y === ROLE_MAP_H - 1 ? "#" : ".")));
  for (let x = 2; x < ROLE_MAP_W - 2; x += 3) t[0][x] = "W";
  for (const s of roleStationSpots(def)) t[s.fy][s.fx] = s.tile === "A" ? "A" : s.tile;
  // The service counter between you and the client.
  for (let x = 10; x <= 16; x++) t[ROLE_COUNTER.y + 1][x] = "r";
  t[ROLE_COUNTER.y + 1][13] = ".";
  t[ROLE_MAP_H - 1][12] = t[ROLE_MAP_H - 1][13] = "e";
  t[ROLE_MAP_H - 4][2] = "p"; t[ROLE_MAP_H - 4][23] = "p";
  return t.map((r) => r.join(""));
}
/** A client waiting spot in the city for deliveries and rides: in front of a building's door. */
export function cityClientSpot(map: WorldMap, rng: Rng, avoid: { x: number; y: number }) {
  const doors = map.portals.filter((p) => p.to.kind === "map" && p.rect.w <= TILE * 3 && Math.hypot(p.rect.x - avoid.x, p.rect.y - avoid.y) > TILE * 18 && Math.hypot(p.rect.x - avoid.x, p.rect.y - avoid.y) < TILE * 70);
  const door = doors.length ? doors[Math.floor(rng() * doors.length) % doors.length] : null;
  if (!door) return { x: avoid.x + TILE * 20, y: avoid.y, label: "the client" };
  return { x: door.rect.x + door.rect.w / 2, y: door.rect.y + door.rect.h + TILE * 1.2, label: door.label.replace(/^Enter\s+/i, "") };
}

/** The role's own building interior (map id `role-<role>`), entered from the Jobs portal. */
export function roleWorkplaceMap(id: string, title: string, colour: string): WorldMap | null {
  const roleId = id.replace(/^role-/, "");
  const def = clientJob(roleId);
  if (!def) return null;
  const tiles = roleMapTiles(def);
  const stations = roleStationSpots(def);
  return {
    id, kind: "office", name: `${def.building} · ${title}`,
    cols: ROLE_MAP_W, rows: ROLE_MAP_H, width: ROLE_MAP_W * TILE, height: ROLE_MAP_H * TILE, tiles,
    structures: [],
    portals: [{ id: "exit", rect: { x: 12 * TILE, y: (ROLE_MAP_H - 2) * TILE, w: 2 * TILE, h: TILE }, label: "Out to the city", to: { kind: "map", mapId: "city", label: "London" } }],
    rooms: [{ name: def.building, rect: { x: TILE, y: TILE, w: (ROLE_MAP_W - 2) * TILE, h: (ROLE_MAP_H - 2) * TILE } }],
    spawn: { x: 13 * TILE, y: (ROLE_MAP_H - 3) * TILE },
    accent: colour,
    sign: { x: 13, y: 8, text: `${def.building}: ${stations.map((s) => s.label.split(":")[0]).slice(0, 3).join(" · ")}` },
    theme: { floor: ["#e9e4da", "#dfd8cb"], wall: "#f2ede3", skirting: colour },
  };
}
