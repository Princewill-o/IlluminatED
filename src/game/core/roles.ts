/**
 * Practical roles: hands-on jobs anyone can pick up in the world and earn Clout from.
 *
 * Each role has the steps of one job (walk to a work spot, do the action with the right
 * animation, a skill check sets how well), the equipment you use, a pay range (mirrored
 * server-side in private.role_pay, which sets the actual pay) and its own six-tier career
 * ladder. Higher tiers add harder steps, so a Master's job is bigger and pays nearer the top.
 */
import { TILE, safeSpot, type WorldMap } from "./world";

/** Animation the character plays at a step (see components/game/activity-pose.ts). */
export type RoleAction = "cook" | "treat" | "sweep" | "direct" | "hammer" | "clipboard" | "serve" | "keyboard" | "carry" | "laptop";
export type RoleStep = { label: string; action: RoleAction };
export type TierName = "Trainee" | "Junior" | "Experienced" | "Specialist" | "Expert" | "Master";
export type RoleTier = { tier: TierName; from: number; title: string; unlock: string };

export interface PracticalRole {
  id: string;
  title: string;
  sector: "Food" | "Retail" | "Transport" | "Health" | "Emergency" | "Trades" | "Services" | "Outdoors" | "Education";
  /** Where the work happens: a map the Jobs panel can take you to, or outdoors in the city. */
  place: { label: string; mapId: string | null };
  summary: string;
  pay: [number, number];
  equipment: string[];
  /** The steps every job has (Trainee). */
  steps: RoleStep[];
  /** Extra steps added at Junior, Experienced, Specialist and Expert. */
  advanced: RoleStep[];
  /** Six role-specific titles and what each unlocks. */
  tiers: [string, string][];
  /** Shown on the reward toast: "+40 Clout — Pizza order completed". */
  done: string;
  colour: string;
  /** Professional roles need Plus Experience; local and automotive roles are free for everyone. */
  plus?: boolean;
}

/** Career levels from the brief: Trainee 1–4, Junior 5–9, Experienced 10–19, Specialist 20–34, Expert 35–49, Master 50+. */
export const TIER_LEVELS: [TierName, number][] = [["Trainee", 1], ["Junior", 5], ["Experienced", 10], ["Specialist", 20], ["Expert", 35], ["Master", 50]];

/** XP needed to reach a level: 12·(level−1)². Level 5 ≈ 7 jobs, 10 ≈ 35, 50 ≈ 1,000. */
export const xpForLevel = (level: number) => 12 * (level - 1) ** 2;
export const levelForXp = (xp: number) => Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 12)) + 1);
export function tierIndex(level: number) {
  let i = 0;
  TIER_LEVELS.forEach(([, from], k) => { if (level >= from) i = k; });
  return i;
}
export function roleTiers(role: PracticalRole): RoleTier[] {
  return TIER_LEVELS.map(([tier, from], i) => ({ tier, from, title: role.tiers[i][0], unlock: role.tiers[i][1] }));
}

const s = (label: string, action: RoleAction): RoleStep => ({ label, action });

export const ROLES: PracticalRole[] = [
  {
    id: "pizza-chef", title: "Pizza Chef", sector: "Food", colour: "#e4572e", done: "Pizza order completed",
    place: { label: "Pizzazz Pizza kitchen", mapId: "workplace-pizzazz" }, pay: [25, 40],
    summary: "Make each pizza exactly to the ticket: dough, sauce, cheese, toppings, oven, box.",
    equipment: ["Dough scraper", "Sauce ladle", "Pizza peel", "Oven gloves"],
    steps: [s("Read the order ticket", "clipboard"), s("Knead and flatten the dough", "cook"), s("Ladle on the sauce", "cook"), s("Sprinkle cheese and toppings", "cook"), s("Slide it into the oven and bake", "cook"), s("Box it at the collection counter", "serve")],
    advanced: [s("Hand-stretch a stuffed crust", "cook"), s("Check allergen notes on the ticket", "clipboard"), s("Fire a second pizza at once", "cook"), s("Quality-check the bake", "clipboard")],
    tiers: [["Dough Prep Trainee", "Margherita orders"], ["Line Cook", "Two-topping orders, allergen notes"], ["Pizzaiolo", "Stuffed crusts and the wood-fired oven"], ["Head Pizzaiolo", "Double orders and catering boxes"], ["Kitchen Lead", "Golden apron, quality checks"], ["Master Pizzaiolo", "Prestige: your signature pizza on the menu"]],
  },
  {
    id: "delivery-driver", title: "Delivery Driver", sector: "Transport", colour: "#f2a541", done: "Delivery completed",
    place: { label: "Delivery depot (city streets)", mapId: null }, pay: [35, 60],
    summary: "Collect the parcel, load the van, follow the pin, park up, ring the bell and hand it over.",
    equipment: ["Delivery van", "Handheld scanner", "Parcel trolley"],
    steps: [s("Accept the delivery and scan the parcel", "keyboard"), s("Carry the parcel to the van", "carry"), s("Drive to the address and park", "direct"), s("Ring the doorbell", "serve"), s("Hand over and get a signature", "serve")],
    advanced: [s("Plan a two-drop route", "clipboard"), s("Load a heavy item with the trolley", "carry"), s("Photo proof of delivery", "keyboard"), s("Collect a return", "carry")],
    tiers: [["Courier Trainee", "Single parcels"], ["Van Driver", "Two-drop routes"], ["Route Driver", "Heavy items with the trolley"], ["Multi-drop Specialist", "Timed deliveries"], ["Lead Driver", "Branded van wrap"], ["Fleet Master", "Prestige: your own delivery livery"]],
  },
  {
    id: "cashier", title: "Supermarket Cashier", sector: "Retail", colour: "#3aa76d", done: "Transaction completed",
    place: { label: "Supermarket tills", mapId: "supermarket" }, pay: [15, 25],
    summary: "Scan every item, bag the shopping, take payment and hand over the receipt.",
    equipment: ["Barcode scanner", "Till", "Bags"],
    steps: [s("Open your till", "keyboard"), s("Scan each item across the scanner", "serve"), s("Bag the groceries", "carry"), s("Take payment", "keyboard"), s("Hand over the receipt", "serve")],
    advanced: [s("Apply a multibuy offer", "keyboard"), s("Weigh loose fruit", "serve"), s("Check ID for an age-restricted item", "clipboard"), s("Count back change", "keyboard")],
    tiers: [["Till Trainee", "Small baskets"], ["Checkout Assistant", "Offers and weighed items"], ["Senior Cashier", "Age checks"], ["Customer Service Desk", "Refunds and exchanges"], ["Checkout Supervisor", "Supervisor lanyard"], ["Front-of-Store Master", "Prestige: name badge in gold"]],
  },
  {
    id: "stocker", title: "Supermarket Stocker", sector: "Retail", colour: "#2a9d8f", done: "Shelves restocked",
    place: { label: "Supermarket aisles", mapId: "supermarket" }, pay: [10, 30],
    summary: "Spot the gaps, fetch boxes from the stockroom, unpack and face up the shelves.",
    equipment: ["Cage trolley", "Box cutter", "Shelf-edge labels"],
    steps: [s("Inspect the shelf for gaps", "clipboard"), s("Fetch boxes from the stockroom", "carry"), s("Open and unpack the boxes", "carry"), s("Stock the shelf front-to-back", "carry"), s("Flatten and bin the packaging", "carry")],
    advanced: [s("Rotate stock by use-by date", "clipboard"), s("Reach the top shelf with the step", "carry"), s("Re-label prices", "keyboard"), s("Return the cage trolley", "carry")],
    tiers: [["Shelf Trainee", "One aisle"], ["Stock Assistant", "Date rotation"], ["Aisle Lead", "Top shelves and price labels"], ["Replenishment Specialist", "Chilled and frozen"], ["Stock Controller", "Hi-vis with stripes"], ["Store Ops Master", "Prestige: aisle named after you"]],
  },
  {
    id: "mechanic", title: "Mechanic", sector: "Trades", colour: "#5c677d", done: "Repair completed",
    place: { label: "Motor Mile garage", mapId: null }, pay: [50, 100],
    summary: "Diagnose the fault, raise the car, swap the part with the right tool and road-test it.",
    equipment: ["Vehicle lift", "Wrench set", "Impact driver", "Diagnostic tablet"],
    steps: [s("Inspect the car and find the fault", "clipboard"), s("Raise it on the lift", "keyboard"), s("Remove the damaged part", "hammer"), s("Fit and tighten the new part", "hammer"), s("Test drive and hand back the keys", "serve")],
    advanced: [s("Plug in the diagnostic tablet", "laptop"), s("Change a tyre and balance the wheel", "hammer"), s("Bleed the brakes", "hammer"), s("Respray the panel", "sweep")],
    tiers: [["Workshop Trainee", "Tyres and fluids"], ["Junior Mechanic", "Batteries and diagnostics"], ["Mechanic", "Brakes and the lift"], ["Engine Specialist", "Engine repairs"], ["Master Technician", "Bodywork respray booth"], ["Garage Master", "Prestige: custom tool chest"]],
  },
  {
    id: "doctor", plus: true, title: "Doctor", sector: "Health", colour: "#1d7ed8", done: "Patient treated",
    place: { label: "St Tomas' Hospital", mapId: "hospital" }, pay: [40, 90],
    summary: "Hear the symptoms, check vitals, examine, decide the treatment, give it and write it up.",
    equipment: ["Stethoscope", "Thermometer", "Bandages", "Patient notes"],
    steps: [s("Greet the patient and hear their symptoms", "clipboard"), s("Check pulse and temperature", "treat"), s("Listen with the stethoscope", "treat"), s("Give the treatment", "treat"), s("Write up the patient record", "keyboard")],
    advanced: [s("Order a scan", "keyboard"), s("Dress a wound", "treat"), s("Explain the plan to the family", "serve"), s("Review the results", "laptop")],
    tiers: [["Foundation Doctor", "Minor injuries"], ["Junior Doctor", "Scans and wound care"], ["Registrar", "Ward rounds"], ["Consultant", "Complex cases"], ["Clinical Lead", "White coat with your name"], ["Chief of Medicine", "Prestige: the hospital wing plaque"]],
  },
  {
    id: "nurse", plus: true, title: "Nurse", sector: "Health", colour: "#4cc9f0", done: "Patient care task completed",
    place: { label: "St Tomas' Hospital ward", mapId: "hospital" }, pay: [20, 50],
    summary: "Prepare beds, take observations, change dressings and wheel patients where they need to go.",
    equipment: ["Wheelchair", "Obs monitor", "Dressings"],
    steps: [s("Prepare the bed", "carry"), s("Escort the patient to the bay", "serve"), s("Take their observations", "treat"), s("Change the dressing", "treat"), s("Update the chart", "clipboard")],
    advanced: [s("Wheel a patient to X-ray", "carry"), s("Restock the supply trolley", "carry"), s("Assist the doctor", "treat"), s("Hand over to the next shift", "clipboard")],
    tiers: [["Student Nurse", "Beds and obs"], ["Staff Nurse", "Wheelchair transfers"], ["Senior Staff Nurse", "Assisting doctors"], ["Nurse Specialist", "Wound care clinics"], ["Ward Sister", "Navy uniform"], ["Matron", "Prestige: ward named in your honour"]],
  },
  {
    id: "police", plus: true, title: "Police Officer", sector: "Emergency", colour: "#22408a", done: "Incident resolved",
    place: { label: "Police station and city streets", mapId: null }, pay: [30, 90],
    summary: "Take the dispatch call, patrol, gather evidence, talk to witnesses and file the report. No powers over other players outside opt-in modes.",
    equipment: ["Radio", "Notebook", "Evidence bags", "Patrol car"],
    steps: [s("Take the call on your radio", "keyboard"), s("Patrol to the scene", "direct"), s("Bag the evidence", "carry"), s("Interview the witness", "clipboard"), s("File the incident report", "keyboard")],
    advanced: [s("Direct traffic round the scene", "direct"), s("Check CCTV", "laptop"), s("Escort a suspect NPC", "serve"), s("Brief the sergeant", "clipboard")],
    tiers: [["Special Constable", "Lost property and reports"], ["Police Constable", "Traffic control"], ["Response Officer", "CCTV checks"], ["Detective Constable", "Investigations"], ["Sergeant", "Sergeant's stripes"], ["Inspector", "Prestige: station commendation"]],
  },
  {
    id: "firefighter", plus: true, title: "Firefighter", sector: "Emergency", colour: "#d62828", done: "Emergency handled",
    place: { label: "Fire station", mapId: null }, pay: [50, 100],
    summary: "Kit up, ride the engine, connect the hose, put the fire out and help people to safety.",
    equipment: ["Fire kit and helmet", "Hose", "Fire engine", "Breathing set"],
    steps: [s("Kit up when the alarm sounds", "carry"), s("Ride the engine to the incident", "direct"), s("Connect the hose to the hydrant", "hammer"), s("Aim and put out the fire", "direct"), s("Make the area safe and pack away", "carry")],
    advanced: [s("Help an NPC to safety", "serve"), s("Use the breathing set", "carry"), s("Ventilate the building", "hammer"), s("Check for hot spots", "clipboard")],
    tiers: [["Trainee Firefighter", "Bin and car fires"], ["Firefighter", "Rescues"], ["Crew Member", "Breathing apparatus"], ["Rescue Specialist", "Building fires"], ["Crew Commander", "White helmet"], ["Station Commander", "Prestige: engine named after you"]],
  },
  {
    id: "builder", plus: true, title: "Builder", sector: "Trades", colour: "#e9a03b", done: "Construction contract finished",
    place: { label: "City building site", mapId: null }, pay: [75, 150],
    summary: "Carry materials, lay the foundation, stack the bricks, fit the beams and windows, paint and sign off.",
    equipment: ["Hard hat", "Trowel", "Hammer", "Drill", "Wheelbarrow"],
    steps: [s("Wheel the bricks and timber over", "carry"), s("Set out the foundation", "hammer"), s("Lay the bricks", "hammer"), s("Fit the beams", "hammer"), s("Paint the finished wall", "sweep"), s("Pass the inspection", "clipboard")],
    advanced: [s("Fit the windows and door", "hammer"), s("Drill and fix the frame", "hammer"), s("Clear the debris", "sweep"), s("Read the plans", "clipboard")],
    tiers: [["Labourer", "Garden walls"], ["Bricklayer", "Windows and doors"], ["Site Builder", "Framing and drilling"], ["Construction Specialist", "Whole extensions"], ["Site Foreman", "Gold hard hat"], ["Master Builder", "Prestige: build a landmark"]],
  },
  {
    id: "cleaner", title: "Cleaner", sector: "Services", colour: "#8ecae6", done: "Area cleaned",
    place: { label: "Offices, stations and homes", mapId: null }, pay: [10, 20],
    summary: "Sweep, mop, wipe and empty the bins. The mess only disappears once the job is done properly.",
    equipment: ["Broom", "Mop and bucket", "Cloths", "Bin bags"],
    steps: [s("Sweep the floor", "sweep"), s("Mop the spill", "sweep"), s("Wipe the counters", "sweep"), s("Empty the bins", "carry")],
    advanced: [s("Clean the windows", "sweep"), s("Refill the soap and towels", "carry"), s("Scrub the stains", "sweep"), s("Take the rubbish out", "carry")],
    tiers: [["Cleaning Trainee", "Sweeping and bins"], ["Cleaner", "Windows"], ["Senior Cleaner", "Supplies and stains"], ["Deep-clean Specialist", "Whole buildings"], ["Cleaning Supervisor", "Supervisor tabard"], ["Facilities Master", "Prestige: spotless award"]],
  },
  {
    id: "barber", title: "Hairdresser / Barber", sector: "Services", colour: "#b5179e", done: "Appointment completed",
    place: { label: "City salon", mapId: null }, pay: [25, 50],
    summary: "Seat the client, check the reference, wash, cut, style and colour to match.",
    equipment: ["Scissors", "Clippers", "Comb and brush", "Hair dryer"],
    steps: [s("Seat the client and check the style", "clipboard"), s("Wash the hair", "treat"), s("Cut with scissors and clippers", "treat"), s("Style and dry", "treat"), s("Show the mirror and take payment", "serve")],
    advanced: [s("Apply colour", "treat"), s("Fade the sides", "treat"), s("Trim the beard", "treat"), s("Book the next visit", "keyboard")],
    tiers: [["Salon Junior", "Washes and trims"], ["Stylist", "Colour"], ["Senior Stylist", "Fades"], ["Colour Specialist", "Bold colours"], ["Top Stylist", "Your own chair"], ["Salon Master", "Prestige: signature cut"]],
  },
  {
    id: "teacher", plus: true, title: "Teacher", sector: "Education", colour: "#7b2cbf", done: "Lesson taught",
    place: { label: "Study Quarter classroom", mapId: "study-lobby" }, pay: [30, 60],
    summary: "Pick the lesson, write on the board, explain, hand out worksheets and mark the work.",
    equipment: ["Whiteboard pens", "Worksheets", "Register"],
    steps: [s("Take the register", "clipboard"), s("Write the lesson on the board", "direct"), s("Explain the task", "direct"), s("Hand out worksheets", "carry"), s("Mark the work", "clipboard")],
    advanced: [s("Ask questions round the class", "direct"), s("Run a group activity", "serve"), s("Give written feedback", "clipboard"), s("Plan the next lesson", "laptop")],
    tiers: [["Trainee Teacher", "Starter lessons"], ["Teacher", "Questioning"], ["Experienced Teacher", "Group work"], ["Subject Lead", "Planning units"], ["Head of Year", "Lanyard upgrade"], ["Headteacher", "Prestige: school assembly"]],
  },
  {
    id: "bus-driver", title: "Bus Driver", sector: "Transport", colour: "#c1121f", done: "Bus route completed",
    place: { label: "Bus depot", mapId: null }, pay: [40, 80],
    summary: "Collect the bus, pull in at each stop, open the doors, let passengers on and off, return to depot.",
    equipment: ["Double-decker", "Ticket machine", "Mirrors"],
    steps: [s("Check the bus and mirrors", "clipboard"), s("Drive to the first stop", "direct"), s("Open the doors and take fares", "keyboard"), s("Drive the route to the next stop", "direct"), s("Return to the depot", "direct")],
    advanced: [s("Lower the ramp for a wheelchair", "carry"), s("Announce a diversion", "keyboard"), s("Night-route checks", "clipboard"), s("Swap drivers at the depot", "serve")],
    tiers: [["Trainee Driver", "Short routes"], ["Bus Driver", "Accessibility ramp"], ["Route Driver", "Diversions"], ["Night Bus Specialist", "Night routes"], ["Senior Driver", "Route of your choice"], ["Depot Master", "Prestige: your name on the blind"]],
  },
  {
    id: "taxi-driver", title: "Taxi Driver", sector: "Transport", colour: "#f6c90e", done: "Journey completed",
    place: { label: "City taxi rank", mapId: null }, pay: [25, 60],
    summary: "Accept the fare, pick them up, take the best route and drop them off safely.",
    equipment: ["City Cab", "Meter", "Sat-nav"],
    steps: [s("Accept the passenger request", "keyboard"), s("Drive to the pickup", "direct"), s("Wait for them to board", "serve"), s("Drive to the destination", "direct"), s("Park and let them out", "serve")],
    advanced: [s("Load their luggage", "carry"), s("Pick the quickest route", "clipboard"), s("Airport run", "direct"), s("Take card payment", "keyboard")],
    tiers: [["Rookie Cabbie", "Short hops"], ["Cab Driver", "Luggage"], ["Knowledge Driver", "Best-route bonus"], ["Airport Specialist", "Airport runs"], ["Executive Driver", "Black cab finish"], ["Cab Legend", "Prestige: golden roof light"]],
  },
  {
    id: "gardener", title: "Farmer / Gardener", sector: "Outdoors", colour: "#55a630", done: "Gardening contract completed",
    place: { label: "Parks and gardens", mapId: null }, pay: [20, 60],
    summary: "Dig the bed, plant, water, weed, harvest and take the crop to market.",
    equipment: ["Spade", "Watering can", "Basket", "Lawnmower"],
    steps: [s("Dig and prepare the soil", "hammer"), s("Plant the seeds", "carry"), s("Water the bed", "sweep"), s("Pull the weeds", "carry"), s("Harvest into the basket", "carry")],
    advanced: [s("Mow the lawn", "sweep"), s("Trim the hedge", "hammer"), s("Take produce to market", "carry"), s("Compost the clippings", "carry")],
    tiers: [["Garden Trainee", "Small beds"], ["Gardener", "Lawns"], ["Head Gardener", "Hedges and market runs"], ["Grower", "Big harvests"], ["Estate Gardener", "Straw hat"], ["Master Grower", "Prestige: prize vegetable show"]],
  },
  {
    id: "warehouse", title: "Warehouse Worker", sector: "Retail", colour: "#6c757d", done: "Order fulfilled",
    place: { label: "Distribution warehouse", mapId: null }, pay: [20, 50],
    summary: "Receive stock, scan, sort, pick the order, pack it and load the van.",
    equipment: ["Scanner gun", "Pallet truck", "Packing tape"],
    steps: [s("Receive and scan the delivery", "keyboard"), s("Sort it into the racks", "carry"), s("Pick the order", "carry"), s("Pack the box", "carry"), s("Load the van", "carry")],
    advanced: [s("Move a pallet with the truck", "carry"), s("Stock-check a rack", "clipboard"), s("Print the labels", "keyboard"), s("Wrap a pallet", "carry")],
    tiers: [["Picker Trainee", "Small orders"], ["Picker Packer", "Pallet truck"], ["Warehouse Operative", "Stock checks"], ["Inventory Specialist", "Big orders"], ["Team Leader", "Lead hi-vis"], ["Warehouse Master", "Prestige: fastest-picker board"]],
  },
  {
    id: "waiter", title: "Restaurant Waiter", sector: "Food", colour: "#bc6c25", done: "Table served",
    place: { label: "Pizzazz Pizza dining room", mapId: "workplace-pizzazz" }, pay: [15, 40],
    summary: "Seat the guests, take the order, carry the food, clear the table and take payment.",
    equipment: ["Menus", "Order pad", "Tray"],
    steps: [s("Welcome and seat the table", "serve"), s("Take the order", "clipboard"), s("Carry the meals over", "carry"), s("Clear the plates", "carry"), s("Take payment", "keyboard")],
    advanced: [s("Recommend a special", "serve"), s("Note the allergies", "clipboard"), s("Carry a three-plate tray", "carry"), s("Wipe and reset the table", "sweep")],
    tiers: [["Server Trainee", "Two-seat tables"], ["Waiter", "Specials and allergies"], ["Senior Waiter", "Big trays"], ["Section Lead", "Large parties"], ["Head Waiter", "Waistcoat"], ["Maître d'", "Prestige: chef's table"]],
  },
  {
    id: "fisher", title: "Fisher", sector: "Outdoors", colour: "#0077b6", done: "Catch sold",
    place: { label: "Thames embankment", mapId: null }, pay: [15, 70],
    summary: "Pick your spot, cast, wait for the bite, reel it in with skill and sell the catch.",
    equipment: ["Rod", "Bait box", "Keep net"],
    steps: [s("Bait the hook and cast", "direct"), s("Wait for the bite", "clipboard"), s("Reel in the fish", "hammer"), s("Sell the catch at the market", "serve")],
    advanced: [s("Cast to the far bank", "direct"), s("Land a big one", "hammer"), s("Measure and log the catch", "clipboard"), s("Release the tiddlers", "carry")],
    tiers: [["Angler Trainee", "Small fish"], ["Angler", "Far casts"], ["Skilled Angler", "Big catches"], ["Specimen Hunter", "Rare fish"], ["Expert Angler", "Golden rod"], ["Master Angler", "Prestige: record board"]],
  },
  {
    id: "security", title: "Security Guard", sector: "Services", colour: "#343a40", done: "Shift objective completed",
    place: { label: "Offices and venues", mapId: null }, pay: [20, 60],
    summary: "Patrol the area, check passes, investigate alarms, help visitors and secure the doors.",
    equipment: ["Radio", "Torch", "Pass scanner"],
    steps: [s("Radio in for your patrol", "keyboard"), s("Walk the patrol route", "direct"), s("Check a visitor's pass", "clipboard"), s("Investigate the alarm", "clipboard"), s("Secure the door and log it", "keyboard")],
    advanced: [s("Help a lost visitor", "serve"), s("Check the CCTV", "laptop"), s("Write the incident log", "keyboard"), s("Lock up at close", "carry")],
    tiers: [["Security Trainee", "Pass checks"], ["Security Officer", "Helping visitors"], ["Patrol Officer", "CCTV"], ["Control Room Specialist", "Alarms and logs"], ["Security Supervisor", "Supervisor jacket"], ["Head of Security", "Prestige: master keys"]],
  },
];

/** Free roles: local jobs and everything automotive. */
export const isFreeRole = (role: PracticalRole) => !role.plus;

export const roleById = (id: string) => ROLES.find((r) => r.id === id) ?? null;

/** The steps of a job at a given level: Trainee steps, plus one advanced step per tier above Trainee (up to four). */
export function jobSteps(role: PracticalRole, level: number): RoleStep[] {
  const extra = Math.min(role.advanced.length, tierIndex(level));
  return [...role.steps, ...role.advanced.slice(0, extra)].slice(0, 12);
}

/** Pay preview, matching private.role_job_finish. */
export function payFor(role: PracticalRole, steps: number, accuracy: number) {
  const acc = Math.max(0, Math.min(1, accuracy));
  const size = Math.min(1, Math.max(0, (steps - 3) / 9));
  const [lo, hi] = role.pay;
  return acc < 0.4 ? Math.round(lo * acc) : Math.round(lo + (hi - lo) * acc * (0.45 + 0.55 * size));
}

/** Score one skill check: how close the marker stopped to the centre of the green zone (0–1). */
export function skillScore(marker: number, zoneCentre: number, zoneWidth: number) {
  const off = Math.abs(marker - zoneCentre);
  if (off <= zoneWidth / 2) return 1 - (off / (zoneWidth / 2)) * 0.25;
  return Math.max(0, 0.75 - (off - zoneWidth / 2) * 3);
}

/** Work spots for a job: spread across the map near where you start, each a short walk apart. */
export function jobSpots(map: WorldMap, start: { x: number; y: number }, count: number, seed: number): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  let a = seed % 360;
  for (let i = 0; spots.length < count && i < count * 12; i++) {
    a = (a * 1103515245 + 12345) % 2147483647;
    const angle = (a % 360) * (Math.PI / 180);
    const radius = (indoorish(map) ? 3 : 5) + ((a >> 8) % 6);
    const prev = spots[spots.length - 1] ?? start;
    const p = safeSpot(map, prev.x + Math.cos(angle) * radius * TILE, prev.y + Math.sin(angle) * radius * TILE);
    if (spots.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > TILE * 2.5) && Math.hypot(p.x - start.x, p.y - start.y) > TILE * 1.5) spots.push(p);
  }
  while (spots.length < count) spots.push(safeSpot(map, start.x + (spots.length + 1) * TILE * 2, start.y));
  return spots;
}
const indoorish = (map: WorldMap) => map.cols < 60 && map.rows < 60;
