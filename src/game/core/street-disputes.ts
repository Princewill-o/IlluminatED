import { TILE, type WorldMap } from "./world";

/**
 * Street disagreements: two residents fall out over something everyday (a
 * queue, a parcel, loud music), get heated and wave their arms about, then a
 * community officer walks over, calms things down and helps them agree a fair
 * fix. They shake hands and go their separate ways. Nobody touches anyone.
 *
 * The player can step in first and try to calm it down themselves: a short
 * choice of what to say, with feedback on why some approaches help and others
 * make things worse.
 */
export interface Dispute {
  id: string;
  /** What it's about, for the help panel. */
  about: string;
  a: { lines: string[]; calm: string };
  b: { lines: string[]; calm: string };
  /** The fair fix the officer (or you) suggests. */
  fix: string;
  /** Choices for the second step when you step in: one fair, two that take sides or brush it off. */
  fixes: { text: string; good: boolean; why: string }[];
}

export const DISPUTES: Dispute[] = [
  {
    id: "queue", about: "who was first in the queue",
    a: { lines: ["Excuse me, I was here first!", "I've been stood here for ages!", "You can't just push in!"], calm: "Fair enough, I didn't see you there." },
    b: { lines: ["No you weren't, I was!", "I only nipped out for a second!", "Don't shout at me!"], calm: "I should've said I was coming back." },
    fix: "Whoever was first goes first, and I'll ask if they can open another till.",
    fixes: [
      { text: "Let's work out who was first, they go first, and I'll ask the shop to open another till.", good: true, why: "Fair to both, and it fixes the real problem: a long queue." },
      { text: "You're louder, so you must be right. You go first.", good: false, why: "Taking a side because someone is louder makes the other person feel ignored." },
      { text: "Just leave it, it's only a queue.", good: false, why: "Brushing it off tells them their feelings don't matter, so they stay angry." },
    ],
  },
  {
    id: "football", about: "a football that knocked a bike over",
    a: { lines: ["Your ball just knocked my bike over!", "Look, the bell's all bent now!", "Watch where you're kicking!"], calm: "Okay, it was an accident. I get it." },
    b: { lines: ["It was an accident, alright!", "I didn't mean to!", "You don't have to shout!"], calm: "Sorry about your bike. I'll be more careful." },
    fix: "Let's check the bike together, and the park is a better spot for football.",
    fixes: [
      { text: "Let's check the bike's okay together, and maybe play football in the park instead.", good: true, why: "Checks the damage calmly and stops it happening again." },
      { text: "Bikes shouldn't be left there anyway. Not your fault.", good: false, why: "Blaming the other person makes them defensive." },
      { text: "Whoever owns the ball has to pay for a new bike.", good: false, why: "Jumping to a punishment before checking what happened makes it worse." },
    ],
  },
  {
    id: "parcel", about: "a parcel left at the wrong door",
    a: { lines: ["That parcel's got my name on it!", "Give it back, it's mine!", "I've been waiting all week for that!"], calm: "Thanks. I was just worried it had gone missing." },
    b: { lines: ["It was left at MY door!", "How was I meant to know?", "Don't grab it!"], calm: "No problem, I'd want mine back too." },
    fix: "Let's read the label together. If it's addressed to you, it's yours.",
    fixes: [
      { text: "Let's read the label together. Whoever it's addressed to keeps it.", good: true, why: "Uses a fact you can both check, so nobody has to back down." },
      { text: "Finders keepers.", good: false, why: "That isn't fair, and it isn't true either: post belongs to who it's addressed to." },
      { text: "Just open it and see what's inside.", good: false, why: "Opening someone else's post isn't okay, and it would start a new argument." },
    ],
  },
  {
    id: "music", about: "music played too loud",
    a: { lines: ["Can you turn that down? I'm revising!", "I've got an exam tomorrow!", "It's been on for an hour!"], calm: "Headphones would be perfect, thank you." },
    b: { lines: ["It's not even that loud!", "I'm allowed to listen to music!", "Why are you so angry?"], calm: "I didn't know you had an exam. Good luck!" },
    fix: "Headphones for now, and you two can agree on a time when music is fine.",
    fixes: [
      { text: "How about headphones for now, and you agree on times when music's fine?", good: true, why: "Both people get what they need: quiet to revise and music to enjoy." },
      { text: "Music is annoying. Turn it off for good.", good: false, why: "Too harsh on one side: they'll feel picked on and push back." },
      { text: "Revise somewhere else then.", good: false, why: "Ignores a fair request and tells them they don't matter." },
    ],
  },
  {
    id: "drink", about: "a spilt drink",
    a: { lines: ["You just knocked my drink all over me!", "This was brand new!", "Look at my jacket!"], calm: "We both weren't looking. It's fine." },
    b: { lines: ["You walked straight into me!", "I was just standing here!", "It's only a drink!"], calm: "Sorry about your jacket. Let me get a napkin." },
    fix: "Sounds like a bump both ways. Napkins first, then maybe split a new drink?",
    fixes: [
      { text: "Sounds like you bumped into each other. Napkins first, then maybe split a new drink?", good: true, why: "Nobody is blamed, and the fix is quick and fair." },
      { text: "It's only a drink, calm down.", good: false, why: "Telling someone to calm down rarely calms them: it feels dismissive." },
      { text: "You walked into them, so you pay.", good: false, why: "You didn't see what happened, so taking a side isn't fair." },
    ],
  },
  {
    id: "scooter", about: "a scooter blocking the pavement",
    a: { lines: ["Your scooter's blocking the whole pavement!", "I can't get the buggy past!", "Move it, please!"], calm: "Thank you, that's much easier." },
    b: { lines: ["I'm only here for a minute!", "There's nowhere else to put it!", "Go round it!"], calm: "Sorry, I didn't think about buggies." },
    fix: "Could the scooter go by the wall? Then buggies and wheelchairs can get past.",
    fixes: [
      { text: "Could you park it by the wall, so buggies and wheelchairs can get past?", good: true, why: "A small change that keeps the pavement clear for everyone." },
      { text: "Just squeeze past, it's fine.", good: false, why: "It isn't fine for buggies or wheelchairs, and it ignores the problem." },
      { text: "I'm reporting your scooter.", good: false, why: "Jumping to a threat makes people dig their heels in." },
    ],
  },
];

/** First thing you say when you step in: the approach matters more than the words. */
export const APPROACHES: { text: string; good: boolean; why: string }[] = [
  { text: "Hey, is everyone okay? One at a time, I'm listening.", good: true, why: "A calm voice and asking to hear both sides lowers the temperature." },
  { text: "Oi! Pack it in, both of you!", good: false, why: "Shouting adds more heat. People copy the energy you bring." },
  { text: "Get your phone out and film it.", good: false, why: "Filming makes people feel watched and embarrassed, so they argue harder." },
];

export const OFFICER_LINES = ["Alright, let's all take a breath.", "One at a time. What happened?"];
export const MAKE_UP = ["Sorry, I got wound up.", "Me too. No harm done."];

/** Timeline of one disagreement, in seconds. */
export const T = { arrive: 3, officer: 11, mediate: 15, shake: 25, leave: 29, gone: 34, cycle: 70 } as const;

export interface DisputeSpot { x: number; z: number; officerZ: number }

const WALKABLE = "-_gf";
const walk = (map: WorldMap, x: number, y: number) => WALKABLE.includes(map.tiles[y]?.[x] ?? "#");

/** Wide stretches of pavement, away from workplace doors and from each other. */
export function disputeSpots(map: WorldMap, count = 6): DisputeSpot[] {
  const doors = map.portals.map((p) => ({ x: p.rect.x / TILE, y: p.rect.y / TILE }));
  const rows = map.tiles.length, cols = map.tiles[0]?.length ?? 0;
  const found: DisputeSpot[] = [];
  for (let y = 4; y < rows - 1; y++) {
    for (let x = 8; x < cols - 8; x++) {
      if (map.tiles[y][x] !== "-") continue;
      let clear = true;
      for (let i = -6; i <= 6 && clear; i++) clear = walk(map, x + i, y);
      if (!clear) continue;
      // The officer steps off the pavement row onto the one beside it to stand with them.
      const side = [1, -1].find((d) => { for (let i = -1; i <= 2; i++) if (!walk(map, x + i, y + d)) return false; return true; });
      if (side === undefined) continue;
      if (doors.some((d) => Math.hypot(d.x - x, d.y - y) < 5)) continue;
      found.push({ x: x + 0.5, z: y + 0.5, officerZ: y + side + 0.5 });
    }
  }
  // Closest to where people arrive first, so newcomers are likely to see one.
  const sx = map.spawn.x / TILE, sy = map.spawn.y / TILE;
  found.sort((p, q) => Math.hypot(p.x - sx, p.z - sy) - Math.hypot(q.x - sx, q.z - sy));
  const out: DisputeSpot[] = [];
  for (const f of found) {
    if (out.length >= count) break;
    // Not right where people appear, so nobody arrives in the middle of it.
    if (Math.hypot(f.x - sx, f.z - sy) < 4) continue;
    if (!out.some((s) => Math.hypot(s.x - f.x, s.z - f.z) < 14)) out.push(f);
  }
  return out;
}

export interface DisputeActor { x: number; z: number; heading: number; pose: string; walking: boolean; visible: boolean; say: string }
export interface DisputeFrame { a: DisputeActor; b: DisputeActor; officer: DisputeActor; phase: "off" | "arrive" | "argue" | "mediate" | "shake" | "leave" }

const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.max(0, Math.min(1, k));
const E = Math.PI / 2, W = -Math.PI / 2;

/**
 * Where everyone is and what they're doing `t` seconds into a disagreement.
 * `helped` means you calmed it down yourself, so the officer arrives to thank you.
 */
export function disputeFrame(t: number, spot: DisputeSpot, d: Dispute, helped = false): DisputeFrame {
  const { x, z, officerZ } = spot;
  const off: DisputeActor = { x, z, heading: 0, pose: "idle", walking: false, visible: false, say: "" };
  if (t < 0 || t >= T.gone) return { a: off, b: off, officer: off, phase: "off" };
  const phase: DisputeFrame["phase"] = t < T.arrive ? "arrive" : t < T.mediate ? "argue" : t < T.shake ? "mediate" : t < T.leave ? "shake" : "leave";
  // Two people walk in from either side and stop face to face.
  const a: DisputeActor = { x: lerp(x - 4, x - 0.6, t / T.arrive), z, heading: E, pose: "idle", walking: t < T.arrive, visible: true, say: "" };
  const b: DisputeActor = { x: lerp(x + 4, x + 0.6, t / T.arrive), z, heading: W, pose: "idle", walking: t < T.arrive, visible: true, say: "" };
  // The officer walks up the pavement, then steps round beside them.
  const k = (t - T.officer) / (T.mediate - T.officer - 1), turn = 0.7;
  const officer: DisputeActor = {
    x: k < turn ? lerp(x + 6, x + 1.8, k / turn) : lerp(x + 1.8, x, (k - turn) / (1 - turn)),
    z: k < turn ? z : lerp(z, officerZ, (k - turn) / (1 - turn)),
    heading: k < turn ? W : Math.atan2(-1.8, officerZ - z), pose: "idle", walking: t >= T.officer && t < T.mediate - 1, visible: t >= T.officer, say: "",
  };
  if (phase === "argue") {
    a.pose = b.pose = "argue";
    const turn = Math.floor((t - T.arrive) / 2.4), speaker = turn % 2 ? b : a, lines = (turn % 2 ? d.b : d.a).lines;
    if (!helped) speaker.say = lines[Math.floor(turn / 2) % lines.length];
  }
  if (t >= T.mediate - 1) officer.heading = officerZ > z ? Math.PI : 0;
  if (phase === "mediate") {
    officer.pose = "calm";
    a.heading = b.heading = Math.atan2(0, officerZ - z);
    const m = t - T.mediate;
    if (m < 2.5) officer.say = helped ? "Thanks for stepping in. Nicely done." : OFFICER_LINES[0];
    else if (m < 5) officer.say = helped ? d.fix : OFFICER_LINES[1];
    else if (m < 7.5) { a.say = d.a.calm; officer.say = helped ? "" : d.fix; }
    else b.say = d.b.calm;
  }
  if (phase === "shake") {
    a.heading = E; b.heading = W;
    a.pose = b.pose = "shake";
    officer.pose = "idle";
    if (t - T.shake < 2) a.say = MAKE_UP[0]; else b.say = MAKE_UP[1];
  }
  if (phase === "leave") {
    const q = (t - T.leave) / (T.gone - T.leave);
    a.x = lerp(x - 0.6, x - 6, q); a.heading = W; a.walking = true;
    b.x = lerp(x + 0.6, x + 6, q); b.heading = E; b.walking = true;
    officer.x = x; officer.z = officerZ; officer.pose = "idle"; if (q < 0.4) officer.say = "Have a good day, both of you!";
  }
  return { a, b, officer, phase };
}

/** Which disagreement is on and where, for a shared city clock (everyone sees the same one). */
export function disputeAt(clock: number, spots: DisputeSpot[]) {
  const n = Math.floor(clock / T.cycle);
  return { index: n, t: clock - n * T.cycle, spot: spots[n % Math.max(1, spots.length)], dispute: DISPUTES[n % DISPUTES.length] };
}
