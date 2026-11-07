/**
 * Prison life at HMP Thames, in the spirit of a prison-escape sandbox: a daily routine you must
 * be seen at, heat that rises when you break the rules, desks to search, things to craft, a prison
 * job, stats to train, contraband detectors, cell searches and lockdowns, and four different ways
 * out that each need planning. There's no fighting: you get out by being clever, not violent.
 *
 * Everything here is pure and deterministic given its inputs, so it's easy to test.
 */

// ── The daily routine ────────────────────────────────────────────────────────
/** One prison day lasts eight real minutes, the same for everyone inside. */
export const PRISON_DAY_MS = 8 * 60_000;
export type RoomId = "landing" | "canteen" | "work" | "gym" | "yard" | "showers" | "cell" | "any";
export type Period = { id: string; name: string; from: number; to: number; rooms: RoomId[]; strict?: boolean; night?: boolean };
export const PERIODS: Period[] = [
  { id: "roll-am", name: "Morning roll call", from: 0, to: 0.07, rooms: ["landing"], strict: true },
  { id: "breakfast", name: "Breakfast", from: 0.07, to: 0.16, rooms: ["canteen"] },
  { id: "work", name: "Work period", from: 0.16, to: 0.34, rooms: ["work"] },
  { id: "free-am", name: "Free time", from: 0.34, to: 0.46, rooms: ["any"] },
  { id: "lunch", name: "Lunch", from: 0.46, to: 0.54, rooms: ["canteen"] },
  { id: "exercise", name: "Exercise", from: 0.54, to: 0.66, rooms: ["gym", "yard"] },
  { id: "free-pm", name: "Free time", from: 0.66, to: 0.77, rooms: ["any"] },
  { id: "roll-pm", name: "Evening roll call", from: 0.77, to: 0.83, rooms: ["landing"], strict: true },
  { id: "showers", name: "Showers", from: 0.83, to: 0.89, rooms: ["showers"] },
  { id: "lights-out", name: "Lights out", from: 0.89, to: 1, rooms: ["cell"], night: true },
];
export const ROOM_NAMES: Record<Exclude<RoomId, "any">, string> = {
  landing: "the cell block landing", canteen: "the canteen", work: "your job", gym: "the gym", yard: "the exercise yard", showers: "the showers", cell: "your cell",
};
export function prisonClock(now: number) {
  const day = Math.floor(now / PRISON_DAY_MS);
  const t = (now % PRISON_DAY_MS) / PRISON_DAY_MS;
  const index = PERIODS.findIndex((p) => t >= p.from && t < p.to);
  const period = PERIODS[index < 0 ? PERIODS.length - 1 : index];
  const leftMs = Math.max(0, (period.to - t) * PRISON_DAY_MS);
  const hours = 6 + t * 18; // 06:00 to midnight
  const clock = `${String(Math.floor(hours) % 24).padStart(2, "0")}:${String(Math.floor((hours % 1) * 60)).padStart(2, "0")}`;
  return { day, t, period, index: index < 0 ? PERIODS.length - 1 : index, leftMs, clock };
}

// ── Items, desks, the trader and crafting ────────────────────────────────────
export type ItemId =
  | "plastic-spoon" | "toothbrush" | "duct-tape" | "file" | "wire" | "sheet" | "pillow" | "soap" | "timber" | "magazine" | "comb" | "battery"
  | "screwdriver" | "flimsy-shovel" | "sturdy-shovel" | "cutters" | "rope" | "bed-dummy" | "poster" | "key-mould" | "staff-key" | "guard-uniform" | "pouch" | "snack";
export type Item = { name: string; contraband?: boolean; uses?: number; blurb: string; colour: string };
export const ITEMS: Record<ItemId, Item> = {
  "plastic-spoon": { name: "Plastic spoon", blurb: "From the canteen. Useful for crafting.", colour: "#e9edf2" },
  toothbrush: { name: "Toothbrush", blurb: "Bristles and a sturdy handle.", colour: "#4ec2c9" },
  "duct-tape": { name: "Duct tape", blurb: "Holds anything together.", colour: "#9aa3ad" },
  file: { name: "Metal file", contraband: true, blurb: "Smooths and sharpens metal. Guards don't like it.", colour: "#6d7480" },
  wire: { name: "Wire", blurb: "A length of thin wire.", colour: "#c8955c" },
  sheet: { name: "Bed sheet", blurb: "Hang it to block the view into your cell, or tie sheets into a rope.", colour: "#f4f1e8" },
  pillow: { name: "Pillow", blurb: "Soft. Two make a convincing sleeper.", colour: "#dfe6f2" },
  soap: { name: "Soap", blurb: "Takes an impression of a key.", colour: "#f2b7c4" },
  timber: { name: "Timber", blurb: "A short plank from the workshop.", colour: "#b27a45" },
  magazine: { name: "Magazine", blurb: "Glossy pages. Good for a poster.", colour: "#ff7a6b" },
  comb: { name: "Comb", blurb: "A hard plastic comb.", colour: "#2b2f3a" },
  battery: { name: "Battery", blurb: "Still has some charge.", colour: "#ffd166" },
  screwdriver: { name: "Makeshift screwdriver", contraband: true, uses: 4, blurb: "Undoes the screws on a vent cover.", colour: "#5d7cff" },
  "flimsy-shovel": { name: "Flimsy shovel", contraband: true, uses: 3, blurb: "Digs a little before it breaks.", colour: "#c8955c" },
  "sturdy-shovel": { name: "Sturdy shovel", contraband: true, uses: 7, blurb: "Digs for much longer.", colour: "#8a5a1f" },
  cutters: { name: "Makeshift cutters", contraband: true, uses: 3, blurb: "Snips through the yard fence, one section at a time.", colour: "#c8322d" },
  rope: { name: "Sheet rope", contraband: true, blurb: "Long enough to climb down from the roof.", colour: "#f4f1e8" },
  "bed-dummy": { name: "Bed dummy", blurb: "Leave it in your bed so night checks think you're asleep.", colour: "#dfe6f2" },
  poster: { name: "Poster", blurb: "Covers a hole in the wall or floor during cell searches.", colour: "#ff5a7a" },
  "key-mould": { name: "Key mould", contraband: true, blurb: "Soap pressed against a staff key. Craft it into a copy.", colour: "#f2b7c4" },
  "staff-key": { name: "Staff key copy", contraband: true, uses: 2, blurb: "Opens staff doors. Bends after a couple of uses.", colour: "#d9b45a" },
  "guard-uniform": { name: "Guard uniform", contraband: true, blurb: "From the laundry. Walk past guards without a second look.", colour: "#1f3f8a" },
  pouch: { name: "Contraband pouch", uses: 2, blurb: "Hides one contraband item from the detector. Wears out.", colour: "#704c47" },
  snack: { name: "Snack bar", blurb: "Restores a little energy.", colour: "#f2a541" },
};
export const isItem = (v: unknown): v is ItemId => typeof v === "string" && v in ITEMS;

/** What turns up in desks. Guard office desks are riskier but hold better things. */
export const DESK_LOOT: Record<"inmate" | "library" | "office" | "laundry" | "workshop", ItemId[]> = {
  inmate: ["plastic-spoon", "toothbrush", "comb", "magazine", "soap", "sheet", "pillow", "snack", "battery"],
  library: ["magazine", "magazine", "duct-tape", "battery", "comb"],
  office: ["duct-tape", "file", "wire", "battery", "soap"],
  laundry: ["sheet", "sheet", "pillow", "soap"],
  workshop: ["timber", "timber", "wire", "duct-tape", "file"],
};
/** Sold by Riley, the inmate trader, for prison cash. */
export const TRADER: { item: ItemId; price: number }[] = [
  { item: "duct-tape", price: 12 }, { item: "file", price: 25 }, { item: "timber", price: 10 }, { item: "wire", price: 8 }, { item: "snack", price: 4 }, { item: "pouch", price: 30 },
];
export type Recipe = { make: ItemId; needs: ItemId[]; intellect: number };
export const RECIPES: Recipe[] = [
  { make: "screwdriver", needs: ["toothbrush", "wire"], intellect: 15 },
  { make: "flimsy-shovel", needs: ["plastic-spoon", "timber", "duct-tape"], intellect: 25 },
  { make: "sturdy-shovel", needs: ["flimsy-shovel", "file", "duct-tape"], intellect: 50 },
  { make: "cutters", needs: ["file", "comb", "duct-tape"], intellect: 40 },
  { make: "rope", needs: ["sheet", "sheet", "duct-tape"], intellect: 20 },
  { make: "bed-dummy", needs: ["pillow", "pillow", "sheet"], intellect: 10 },
  { make: "poster", needs: ["magazine", "duct-tape"], intellect: 5 },
  { make: "staff-key", needs: ["key-mould", "wire"], intellect: 60 },
  { make: "pouch", needs: ["sheet", "duct-tape"], intellect: 30 },
];

// ── Your prison state ────────────────────────────────────────────────────────
export const INVENTORY_SLOTS = 6;
export type Slot = { item: ItemId; uses: number } | null;
export type Escape = "tunnel" | "vents" | "fence" | "front-gate";
export type PrisonState = {
  /** The stay this belongs to (jail start), so a new sentence starts fresh. */
  stay: number;
  heat: number;
  cash: number;
  stats: { strength: number; fitness: number; intellect: number };
  inventory: Slot[];
  job: "laundry" | "kitchen" | "library" | null;
  /** Periods you've been seen at today: "day:periodId". */
  attended: string[];
  /** Days and periods already judged, so missing one only counts once. */
  judged: string[];
  /** Escape work in progress. */
  tunnel: number; // 0 to TUNNEL_LENGTH
  ventOpen: boolean;
  fence: number; // 0 to FENCE_SECTIONS
  holeCovered: boolean;
  dummyInBed: boolean;
  sheetHung: boolean;
  solitaryUntil: number;
  /** Desks searched today (desk id → day). */
  searched: Record<string, number>;
  /** Cooldowns for training and work, by kind. */
  lastAt: Record<string, number>;
  log: string[];
};
export const TUNNEL_LENGTH = 5;
export const FENCE_SECTIONS = 3;
export function freshPrison(stay: number): PrisonState {
  return {
    stay, heat: 0, cash: 10, stats: { strength: 20, fitness: 20, intellect: 20 },
    inventory: [{ item: "toothbrush", uses: 1 }, { item: "soap", uses: 1 }, null, null, null, null],
    job: null, attended: [], judged: [], tunnel: 0, ventOpen: false, fence: 0, holeCovered: false, dummyInBed: false, sheetHung: false,
    solitaryUntil: 0, searched: {}, lastAt: {}, log: [],
  };
}
const clampHeat = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const note = (s: PrisonState, line: string): PrisonState => ({ ...s, log: [line, ...s.log].slice(0, 6) });
export const count = (s: PrisonState, item: ItemId) => s.inventory.filter((x) => x?.item === item).length;
export const has = (s: PrisonState, item: ItemId) => count(s, item) > 0;
export const freeSlots = (s: PrisonState) => s.inventory.filter((x) => !x).length;
export function addItem(s: PrisonState, item: ItemId): PrisonState | null {
  const i = s.inventory.findIndex((x) => !x);
  if (i < 0) return null;
  const inventory = [...s.inventory];
  inventory[i] = { item, uses: ITEMS[item].uses ?? 1 };
  return { ...s, inventory };
}
export function removeItem(s: PrisonState, item: ItemId): PrisonState {
  const i = s.inventory.findIndex((x) => x?.item === item);
  if (i < 0) return s;
  const inventory = [...s.inventory];
  inventory[i] = null;
  return { ...s, inventory };
}
/** Use a tool once: it wears and breaks when its uses run out. */
export function wear(s: PrisonState, item: ItemId): { state: PrisonState; broke: boolean } {
  const i = s.inventory.findIndex((x) => x?.item === item);
  if (i < 0) return { state: s, broke: false };
  const inventory = [...s.inventory];
  const left = (inventory[i]!.uses ?? 1) - 1;
  inventory[i] = left > 0 ? { item, uses: left } : null;
  return { state: { ...s, inventory }, broke: left <= 0 };
}
export const contraband = (s: PrisonState) => s.inventory.filter((x): x is NonNullable<Slot> => !!x && !!ITEMS[x.item].contraband);

// ── Being seen at the routine ────────────────────────────────────────────────
/** Mark that you're in `room` now; returns the new state and whether you just got a tick. */
export function attend(s: PrisonState, now: number, room: RoomId | null, hasJob = s.job !== null): { state: PrisonState; ticked: boolean } {
  const { day, period } = prisonClock(now);
  const key = `${day}:${period.id}`;
  if (s.attended.includes(key)) return { state: s, ticked: false };
  const ok = period.rooms.includes("any") || (room !== null && (period.rooms.includes(room) || (period.id === "work" && !hasJob)));
  if (!ok) return { state: s, ticked: false };
  return { state: { ...s, attended: [key, ...s.attended].slice(0, 30) }, ticked: true };
}
export type Judgement = { state: PrisonState; missed: Period | null; lockdown: boolean };
/**
 * When a period ends, check it. Missing an ordinary period adds heat; missing roll call
 * starts a lockdown. At lights out, being out of your cell without a bed dummy does too.
 */
export function judgePrevious(s: PrisonState, now: number): Judgement {
  const { day, index } = prisonClock(now);
  const prevIndex = (index + PERIODS.length - 1) % PERIODS.length;
  const prevDay = index === 0 ? day - 1 : day;
  const prev = PERIODS[prevIndex];
  const key = `${prevDay}:${prev.id}`;
  // Only judge a period you were here for most of: arriving mid-period doesn't count against you.
  const prevStart = (prevDay + prev.from) * PRISON_DAY_MS;
  if (s.judged.includes(key) || s.stay > prevStart + (prev.to - prev.from) * PRISON_DAY_MS * 0.3) return { state: s, missed: null, lockdown: false };
  let state: PrisonState = { ...s, judged: [key, ...s.judged].slice(0, 30) };
  const seen = s.attended.includes(key) || (prev.night && (s.dummyInBed || s.attended.includes(key)));
  if (seen || prev.rooms.includes("any")) return { state, missed: null, lockdown: false };
  if (prev.strict || prev.night) {
    state = note({ ...state, heat: 100 }, `You missed ${prev.name.toLowerCase()}. The prison is in lockdown!`);
    return { state, missed: prev, lockdown: true };
  }
  state = note({ ...state, heat: clampHeat(state.heat + 15) }, `You skipped ${prev.name.toLowerCase()}. The guards noticed.`);
  return { state, missed: prev, lockdown: false };
}
/** Heat cools off slowly while you behave: about one point every six seconds. */
export const coolHeat = (s: PrisonState, ms: number): PrisonState => ({ ...s, heat: clampHeat(s.heat - ms / 6000) });
export const SOLITARY_MS = 60_000;
/** Lockdown or too much heat: solitary, contraband confiscated and visible escape work found. */
export function sendToSolitary(s: PrisonState, now: number): PrisonState {
  const inventory = s.inventory.map((x) => (x && ITEMS[x.item].contraband ? null : x));
  return note({
    ...s, inventory, heat: 40, solitaryUntil: now + SOLITARY_MS, dummyInBed: false,
    tunnel: s.holeCovered ? s.tunnel : 0, ventOpen: s.holeCovered ? s.ventOpen : false, fence: 0, holeCovered: s.holeCovered,
  }, "Solitary confinement. The guards took your contraband.");
}

// ── Actions ──────────────────────────────────────────────────────────────────
export type Outcome = { state: PrisonState; message: string; ok: boolean; escape?: Escape };
const fail = (s: PrisonState, message: string): Outcome => ({ state: s, message, ok: false });

/** A guard is "watching" during the day near busy areas. At night only the patrols are. */
export function watchChance(now: number, restricted: boolean, uniform: boolean) {
  const { period } = prisonClock(now);
  const base = period.night ? 0.12 : period.rooms.includes("any") ? 0.2 : 0.3;
  return Math.max(0.02, (restricted ? base + 0.25 : base) * (uniform ? 0.25 : 1));
}

/** Search a desk. Once a day per desk; you might be seen, which adds heat. */
export function searchDesk(s: PrisonState, now: number, desk: string, kind: keyof typeof DESK_LOOT, roll: () => number): Outcome {
  const { day } = prisonClock(now);
  if (s.searched[desk] === day) return fail(s, "You've already been through this desk today. It'll have new things tomorrow.");
  if (!freeSlots(s)) return fail(s, "Your pockets are full. Drop or use something first.");
  let state: PrisonState = { ...s, searched: { ...s.searched, [desk]: day } };
  const loot = DESK_LOOT[kind];
  const item = loot[Math.floor(roll() * loot.length) % loot.length];
  if (roll() < watchChance(now, kind === "office", has(s, "guard-uniform"))) {
    state = note({ ...state, heat: clampHeat(state.heat + (kind === "office" ? 35 : 20)) }, "Someone saw you going through a desk.");
    return { state: addItem(state, item) ?? state, message: `A guard spotted you! Heat went up. You still grabbed: ${ITEMS[item].name}.`, ok: true };
  }
  return { state: addItem(state, item) ?? state, message: `You found: ${ITEMS[item].name}.`, ok: true };
}
export function craft(s: PrisonState, make: ItemId): Outcome {
  const r = RECIPES.find((x) => x.make === make);
  if (!r) return fail(s, "You don't know how to make that.");
  if (s.stats.intellect < r.intellect) return fail(s, `You need ${r.intellect} intellect to work out how. Study in the library.`);
  const missing = [...new Set(r.needs)].filter((n) => count(s, n) < r.needs.filter((m) => m === n).length);
  if (missing.length) return fail(s, `You're missing: ${missing.map((n) => ITEMS[n].name).join(", ")}.`);
  let state = s;
  for (const need of r.needs) state = removeItem(state, need);
  const made = addItem(state, make);
  if (!made) return fail(s, "No room to hold it.");
  return { state: note(made, `Crafted ${ITEMS[make].name}.`), message: `You made a ${ITEMS[make].name}.`, ok: true };
}
export function buy(s: PrisonState, item: ItemId): Outcome {
  const offer = TRADER.find((t) => t.item === item);
  if (!offer) return fail(s, "Riley doesn't sell that.");
  if (s.cash < offer.price) return fail(s, `You need ${offer.price} prison cash.`);
  const next = addItem(s, item);
  if (!next) return fail(s, "Your pockets are full.");
  return { state: { ...next, cash: next.cash - offer.price }, message: `Riley slips you a ${ITEMS[item].name}.`, ok: true };
}
const TRAIN_COOLDOWN = 8000;
/** Train at the gym (strength and fitness) or study in the library (intellect). */
export function train(s: PrisonState, now: number, kind: "gym" | "library"): Outcome {
  if (now - (s.lastAt[kind] ?? 0) < TRAIN_COOLDOWN) return fail(s, "Catch your breath for a moment.");
  const stats = { ...s.stats };
  if (kind === "gym") { stats.strength = Math.min(100, stats.strength + 3); stats.fitness = Math.min(100, stats.fitness + 4); }
  else stats.intellect = Math.min(100, stats.intellect + 5);
  return { state: { ...s, stats, lastAt: { ...s.lastAt, [kind]: now } }, message: kind === "gym" ? "Good set! Strength and fitness up." : "You read a crafting manual. Intellect up.", ok: true };
}
export const JOBS: Record<NonNullable<PrisonState["job"]>, { name: string; pay: number; need: Partial<PrisonState["stats"]>; perk: string }> = {
  laundry: { name: "Laundry", pay: 8, need: { strength: 25 }, perk: "Now and then a guard uniform turns up in the wash." },
  kitchen: { name: "Kitchen", pay: 10, need: { fitness: 30 }, perk: "Spoons go missing all the time." },
  library: { name: "Library", pay: 6, need: { intellect: 30 }, perk: "Read while you work: a little extra intellect." },
};
export function takeJob(s: PrisonState, job: NonNullable<PrisonState["job"]>): Outcome {
  const need = JOBS[job].need;
  for (const [stat, value] of Object.entries(need) as [keyof PrisonState["stats"], number][])
    if (s.stats[stat] < value) return fail(s, `The ${JOBS[job].name.toLowerCase()} job needs ${value} ${stat}.`);
  return { state: { ...s, job }, message: `You got the ${JOBS[job].name.toLowerCase()} job. Work there in the work period.`, ok: true };
}
/** One stint of your prison job during the work period. */
export function doJob(s: PrisonState, now: number, roll: () => number): Outcome {
  if (!s.job) return fail(s, "You don't have a prison job. Check the job board.");
  if (prisonClock(now).period.id !== "work") return fail(s, "Jobs are done in the work period.");
  if (now - (s.lastAt.job ?? 0) < 6000) return fail(s, "Keep going…");
  let state: PrisonState = { ...s, cash: s.cash + JOBS[s.job].pay, lastAt: { ...s.lastAt, job: now } };
  let extra = "";
  if (s.job === "library") state = { ...state, stats: { ...state.stats, intellect: Math.min(100, state.stats.intellect + 2) } };
  if (s.job === "laundry" && roll() < 0.25 && !has(state, "guard-uniform")) { const u = addItem(state, "guard-uniform"); if (u) { state = u; extra = " A guard uniform was in the wash. You pocket it…"; } }
  if (s.job === "kitchen" && roll() < 0.35) { const sp = addItem(state, "plastic-spoon"); if (sp) { state = sp; extra = " You pocket a spoon."; } }
  return { state, message: `+${JOBS[s.job].pay} prison cash.${extra}`, ok: true };
}

/** Lights out, or a quiet free period, is when escape work goes unnoticed. */
export const quietTime = (now: number) => { const p = prisonClock(now).period; return p.night || p.rooms.includes("any"); };

/** Dig under your bed. Needs a shovel; each dig uses it. Five digs and you're through. */
export function dig(s: PrisonState, now: number, roll: () => number): Outcome {
  const tool: ItemId | null = has(s, "sturdy-shovel") ? "sturdy-shovel" : has(s, "flimsy-shovel") ? "flimsy-shovel" : null;
  if (!tool) return fail(s, "You need a shovel to dig. Craft one: plastic spoon, timber and duct tape.");
  if (s.stats.fitness < 25) return fail(s, "You're too unfit to dig. Train at the gym.");
  if (s.tunnel >= TUNNEL_LENGTH) return { state: s, message: "The tunnel is finished. Crawl through it to escape!", ok: true, escape: "tunnel" };
  const worn = wear(s, tool), broke = worn.broke;
  const state = { ...worn.state, tunnel: worn.state.tunnel + 1, holeCovered: false };
  if (!quietTime(now) && roll() < 0.45) return { state: note({ ...state, heat: clampHeat(state.heat + 30) }, "A guard heard digging."), message: "A guard heard the digging! Heat went up. Cover the hole with a poster.", ok: true };
  const msg = state.tunnel >= TUNNEL_LENGTH ? "You broke through to the outside!" : `You dug a little further (${state.tunnel}/${TUNNEL_LENGTH}).`;
  return { state, message: `${msg}${broke ? ` Your ${ITEMS[tool].name.toLowerCase()} broke.` : ""}${state.tunnel < TUNNEL_LENGTH ? " Cover the hole before a cell search." : ""}`, ok: true };
}
export function coverHole(s: PrisonState): Outcome {
  if (s.tunnel === 0 && !s.ventOpen) return fail(s, "There's nothing to cover.");
  if (s.holeCovered) return fail(s, "It's already covered.");
  if (!has(s, "poster")) return fail(s, "You need a poster: magazine and duct tape.");
  return { state: { ...removeItem(s, "poster"), holeCovered: true }, message: "You hang the poster. Nobody would ever know.", ok: true };
}
/** Unscrew the vent in your cell, crawl to the roof, climb down with a rope. */
export function vent(s: PrisonState, now: number): Outcome {
  if (!s.ventOpen) {
    if (!has(s, "screwdriver")) return fail(s, "The vent cover is screwed shut. Craft a screwdriver: toothbrush and wire.");
    const { state } = wear(s, "screwdriver");
    return { state: { ...state, ventOpen: true, holeCovered: false }, message: "The vent cover comes off. Cover it with a poster, then crawl through at lights out.", ok: true };
  }
  if (!prisonClock(now).period.night) return fail(s, "Too many people about. Crawl through after lights out.");
  if (s.stats.fitness < 40) return fail(s, "The crawl is long and tight. You need 40 fitness.");
  if (!has(s, "rope")) return fail(s, "You reach the roof but it's a long drop. You need a sheet rope.");
  if (!s.dummyInBed) return fail(s, "Leave a bed dummy first, or the night check will see your bed is empty.");
  return { state: removeItem(s, "rope"), message: "Through the vents, onto the roof and down the rope. You're out!", ok: true, escape: "vents" };
}
/** Cut through the yard fence at night, section by section. */
export function cutFence(s: PrisonState, now: number, roll: () => number): Outcome {
  if (!prisonClock(now).period.night) return fail(s, "The yard is watched during the day. Come back after lights out.");
  if (!has(s, "cutters")) return fail(s, "You need cutters: file, comb and duct tape.");
  if (!s.dummyInBed) return fail(s, "Leave a bed dummy first, or the night check will see your bed is empty.");
  const worn = wear(s, "cutters"), broke = worn.broke;
  if (roll() < 0.25) return { state: note({ ...worn.state, heat: clampHeat(worn.state.heat + 40) }, "The searchlight swept over you."), message: "The searchlight caught you! Heat jumped. Get back to your cell.", ok: true };
  const state = { ...worn.state, fence: worn.state.fence + 1 };
  if (state.fence >= FENCE_SECTIONS) return { state, message: "The last section gives way. You slip through the fence!", ok: true, escape: "fence" };
  return { state, message: `You cut a section (${state.fence}/${FENCE_SECTIONS}).${broke ? " Your cutters broke." : ""}`, ok: true };
}
/** Press soap against the key on the guard office desk. */
export function takeKeyImpression(s: PrisonState, now: number, roll: () => number): Outcome {
  if (!has(s, "soap")) return fail(s, "You need a bar of soap to take an impression.");
  const state = removeItem(s, "soap");
  if (roll() < watchChance(now, true, has(s, "guard-uniform"))) return { state: note({ ...state, heat: clampHeat(state.heat + 45) }, "Caught at the guards' desk."), message: "A guard caught you at the desk! Heat jumped and the soap was confiscated.", ok: false };
  const next = addItem(state, "key-mould");
  return next ? { state: next, message: "You press the soap against the staff key. A perfect mould.", ok: true } : fail(s, "No room for the mould.");
}
/** Walk out of the front gate: a guard uniform and a staff key copy. */
export function frontGate(s: PrisonState): Outcome {
  if (!has(s, "guard-uniform")) return fail(s, "Inmates can't walk out of the front gate. A guard uniform might help… try the laundry job.");
  if (!has(s, "staff-key")) return fail(s, "The staff door is locked. You need a staff key copy.");
  const { state } = wear(s, "staff-key");
  return { state, message: "In a guard uniform, you nod to the gatehouse and walk straight out.", ok: true, escape: "front-gate" };
}
/** Walking through the metal detector with contraband: a pouch hides one item. */
export function detector(s: PrisonState): Outcome {
  const items = contraband(s).filter((x) => x.item !== "guard-uniform" || !has(s, "pouch"));
  if (!items.length) return { state: s, message: "", ok: true };
  if (has(s, "pouch") && items.length === 1) { const { state } = wear(s, "pouch"); return { state, message: "The detector stays quiet. Your pouch hid it.", ok: true }; }
  const inventory = s.inventory.map((x) => (x && ITEMS[x.item].contraband ? null : x));
  return { state: note({ ...s, inventory, heat: clampHeat(s.heat + 30) }, "The metal detector went off."), message: "BEEP! The metal detector went off. Guards took your contraband.", ok: false };
}
/** A random cell search at roll call when heat is high: uncovered escape work is found. */
export function cellSearch(s: PrisonState, roll: () => number): Outcome | null {
  if (s.heat < 40 || roll() > s.heat / 140) return null;
  const found = (s.tunnel > 0 || s.ventOpen) && !s.holeCovered;
  const inventory = s.inventory.map((x) => (x && ITEMS[x.item].contraband && roll() < 0.6 ? null : x));
  const state = note({ ...s, inventory, tunnel: found ? 0 : s.tunnel, ventOpen: found ? false : s.ventOpen, heat: clampHeat(s.heat + (found ? 30 : 5)) }, found ? "Cell search: they found your escape work!" : "Cell search: guards went through your things.");
  return { state, message: found ? "Cell search! The guards found your hole and filled it in." : "Cell search! The guards took some of your contraband.", ok: false };
}
export function applyItem(s: PrisonState, item: ItemId): Outcome {
  if (!has(s, item)) return fail(s, "You don't have that.");
  if (item === "bed-dummy") return { state: { ...removeItem(s, item), dummyInBed: true }, message: "You tuck the dummy into your bed. From the door, it's you, asleep.", ok: true };
  if (item === "sheet") return { state: { ...removeItem(s, item), sheetHung: true }, message: "You hang the sheet over your cell bars. Guards can't see in.", ok: true };
  if (item === "snack") return { state: removeItem(s, item), message: "Mmm. A little energy back.", ok: true };
  return fail(s, `You can't use the ${ITEMS[item].name.toLowerCase()} on its own. Try crafting with it.`);
}
export const drop = (s: PrisonState, slot: number): PrisonState => ({ ...s, inventory: s.inventory.map((x, i) => (i === slot ? null : x)) });

/** Deterministic random numbers for a seed (tests and repeatable desk loot). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
