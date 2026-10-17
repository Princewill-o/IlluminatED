/**
 * London Tycoon: our own property-trading board game set around London (in the
 * spirit of the classics, with an original board, names and rules). Roll, move,
 * buy places, charge rent, build flats, and answer Pop Quiz cards (real revision
 * questions) for cash. Last player standing, or the richest after 20 rounds, wins.
 * Pure functions over a JSON state so it can run locally or over a realtime room.
 */

export type SpaceKind = "start" | "place" | "station" | "quiz" | "tax" | "detention" | "free" | "goto";
export interface Space {
  name: string;
  kind: SpaceKind;
  price?: number;
  rent?: number;
  group?: string;
  colour?: string;
}

const G = {
  south: "#a46a45",
  east: "#6bc6ff",
  north: "#ff8fd1",
  west: "#e98a1f",
  river: "#c8322d",
  city: "#ffd166",
  park: "#4f9a46",
  prime: "#2b5fd9",
};
const place = (name: string, group: keyof typeof G, price: number): Space => ({ name, kind: "place", price, rent: Math.round(price / 8), group, colour: G[group] });
const station = (name: string): Space => ({ name, kind: "station", price: 200, rent: 25, group: "station", colour: "#13203a" });

export const BOARD: Space[] = [
  { name: "Pay day", kind: "start" },
  place("Brixton Hill", "south", 60),
  { name: "Pop Quiz", kind: "quiz" },
  place("Peckham Rye", "south", 70),
  station("Oxford Circus"),
  place("Hackney Wick", "east", 100),
  place("Stratford Broadway", "east", 110),
  place("Bethnal Green", "east", 120),
  { name: "Detention", kind: "detention" },
  place("Camden Lock", "north", 140),
  { name: "Pop Quiz", kind: "quiz" },
  place("Highgate Hill", "north", 160),
  station("Waterloo"),
  place("Notting Hill", "west", 180),
  place("Kensington Row", "west", 190),
  place("Richmond Green", "west", 200),
  { name: "Free period", kind: "free" },
  place("South Bank", "river", 220),
  { name: "Council tax", kind: "tax", price: 100 },
  place("Borough Market", "river", 240),
  station("Bank"),
  place("Shoreditch High St", "city", 260),
  place("Leadenhall", "city", 270),
  place("Canary Wharf", "city", 280),
  { name: "Go to Detention", kind: "goto" },
  place("Regent's Park", "park", 300),
  { name: "Pop Quiz", kind: "quiz" },
  place("Hampstead Heath", "park", 320),
  station("London Bridge"),
  place("Mayfair Mews", "prime", 350),
  { name: "Luxury tax", kind: "tax", price: 150 },
  place("Belgravia Square", "prime", 400),
];
export const SIDE = 8;

export interface TPlayer {
  id: string;
  name: string;
  colour: string;
  cash: number;
  pos: number;
  detention: number; // turns left in detention
  out: boolean;
  cpu: boolean;
}
export interface TState {
  players: TPlayer[];
  owner: Record<number, number>;
  flats: Record<number, number>;
  turn: number;
  phase: "roll" | "buy" | "quiz" | "over";
  dice: [number, number];
  doubles: number;
  quiz: number | null; // question index into the bank
  round: number;
  log: string[];
  winner: number | null;
}

export const TOKEN_COLOURS = ["#2b5fd9", "#c8322d", "#15987f", "#e0a100"];
export const MAX_ROUNDS = 20;

export function tycoonNew(players: { id: string; name: string; cpu: boolean }[]): TState {
  return {
    players: players.map((p, i) => ({ ...p, colour: TOKEN_COLOURS[i], cash: 1500, pos: 0, detention: 0, out: false })),
    owner: {},
    flats: {},
    turn: 0,
    phase: "roll",
    dice: [1, 1],
    doubles: 0,
    quiz: null,
    round: 1,
    log: ["Game on. Everyone starts with £1,500."],
    winner: null,
  };
}

const groupOf = (i: number) => BOARD[i].group;
export const ownsSet = (s: TState, p: number, group: string) =>
  BOARD.every((sp, i) => sp.group !== group || s.owner[i] === p);

export function rentFor(s: TState, i: number, roll: number): number {
  const sp = BOARD[i];
  const o = s.owner[i];
  if (o === undefined) return 0;
  if (sp.kind === "station") {
    const n = BOARD.filter((b, j) => b.kind === "station" && s.owner[j] === o).length;
    return 25 * 2 ** (n - 1);
  }
  const base = sp.rent ?? 0;
  const flats = s.flats[i] ?? 0;
  if (flats) return base * [1, 4, 10, 22][flats];
  return ownsSet(s, o, sp.group!) ? base * 2 : base + Math.floor(roll / 4);
}
export const flatCost = (i: number) => Math.round((BOARD[i].price ?? 0) * 0.6);

const log = (s: TState, line: string) => ({ ...s, log: [line, ...s.log].slice(0, 30) });

function nextTurn(s: TState): TState {
  const alive = s.players.filter((p) => !p.out);
  if (alive.length <= 1) return { ...s, phase: "over", winner: s.players.findIndex((p) => !p.out) };
  let t = s.turn;
  let round = s.round;
  do {
    t = (t + 1) % s.players.length;
    if (t === 0) round++;
  } while (s.players[t].out);
  if (round > MAX_ROUNDS) {
    const worth = s.players.map((p, i) => (p.out ? -1 : p.cash + Object.entries(s.owner).filter(([, o]) => o === i).reduce((a, [k]) => a + (BOARD[+k].price ?? 0) + (s.flats[+k] ?? 0) * flatCost(+k), 0)));
    const w = worth.indexOf(Math.max(...worth));
    return log({ ...s, phase: "over", winner: w }, `Time's up! ${s.players[w].name} is the richest Londoner.`);
  }
  return { ...s, turn: t, round, phase: "roll", doubles: 0 };
}

function pay(s: TState, from: number, amount: number, to: number | null): TState {
  const players = s.players.map((p) => ({ ...p }));
  players[from].cash -= amount;
  if (to !== null) players[to].cash += amount;
  let next = { ...s, players };
  if (players[from].cash < 0) {
    players[from].out = true;
    // Their places go back to the market.
    const owner = { ...s.owner };
    const flats = { ...s.flats };
    for (const k of Object.keys(owner)) if (owner[+k] === from) {
      delete owner[+k];
      delete flats[+k];
    }
    next = log({ ...next, owner, flats }, `${players[from].name} is bankrupt and out of the game.`);
  }
  return next;
}

/** Roll the dice and resolve where you land. */
export function tycoonRoll(s: TState, d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6)): TState {
  if (s.phase !== "roll") return s;
  const me = s.players[s.turn];
  let st: TState = { ...s, dice: [d1, d2] };
  if (me.detention > 0) {
    if (d1 === d2) st = log(st, `${me.name} rolls doubles and leaves Detention.`);
    else {
      const players = st.players.map((p, i) => (i === s.turn ? { ...p, detention: p.detention - 1 } : p));
      st = log({ ...st, players }, `${me.name} stays in Detention.`);
      return nextTurn(st);
    }
  }
  const doubles = d1 === d2 ? s.doubles + 1 : 0;
  if (doubles === 3) return sendToDetention({ ...st, doubles: 0 }, "rolled three doubles");
  let pos = me.pos + d1 + d2;
  const players = st.players.map((p) => ({ ...p }));
  players[s.turn].detention = 0;
  if (pos >= BOARD.length) {
    pos -= BOARD.length;
    players[s.turn].cash += 200;
    st = log({ ...st, players }, `${me.name} passes Pay day and collects £200.`);
  }
  players[s.turn].pos = pos;
  st = { ...st, players, doubles };
  return land(st, d1 + d2);
}

function sendToDetention(s: TState, why: string): TState {
  const players = s.players.map((p, i) => (i === s.turn ? { ...p, pos: BOARD.findIndex((b) => b.kind === "detention"), detention: 2 } : p));
  return nextTurn(log({ ...s, players }, `${s.players[s.turn].name} ${why}: off to Detention.`));
}

function land(s: TState, roll: number): TState {
  const me = s.players[s.turn];
  const sp = BOARD[me.pos];
  let st = log(s, `${me.name} rolls ${s.dice[0]} + ${s.dice[1]} and lands on ${sp.name}.`);
  if (sp.kind === "goto") return sendToDetention(st, "is sent");
  if (sp.kind === "tax") return endMove(pay(st, s.turn, sp.price ?? 100, null));
  if (sp.kind === "quiz") return { ...st, phase: "quiz", quiz: Math.floor(Math.random() * 100000) };
  if (sp.kind === "place" || sp.kind === "station") {
    const o = st.owner[me.pos];
    if (o === undefined) return me.cash >= (sp.price ?? 0) ? { ...st, phase: "buy" } : endMove(st);
    if (o !== s.turn && !st.players[o].out) {
      const rent = rentFor(st, me.pos, roll);
      st = log(pay(st, s.turn, rent, o), `${me.name} pays £${rent} rent to ${st.players[o].name}.`);
    }
  }
  return endMove(st);
}

/** After landing: roll again on doubles, otherwise next player. */
function endMove(s: TState): TState {
  if (s.players[s.turn].out) return nextTurn(s);
  if (s.doubles > 0 && s.phase !== "over") return log({ ...s, phase: "roll" }, `Doubles! ${s.players[s.turn].name} rolls again.`);
  return nextTurn(s);
}

export function tycoonBuy(s: TState, yes: boolean): TState {
  if (s.phase !== "buy") return s;
  const me = s.players[s.turn];
  const sp = BOARD[me.pos];
  if (!yes) return endMove(log({ ...s, phase: "roll" }, `${me.name} doesn't buy ${sp.name}.`));
  const st = pay(s, s.turn, sp.price ?? 0, null);
  return endMove(log({ ...st, owner: { ...st.owner, [me.pos]: s.turn }, phase: "roll" }, `${me.name} buys ${sp.name} for £${sp.price}.`));
}

export function tycoonQuiz(s: TState, correct: boolean): TState {
  if (s.phase !== "quiz") return s;
  const me = s.players[s.turn];
  if (correct) {
    const players = s.players.map((p, i) => (i === s.turn ? { ...p, cash: p.cash + 100 } : p));
    return endMove(log({ ...s, players, phase: "roll", quiz: null }, `${me.name} aces the Pop Quiz: +£100.`));
  }
  return endMove(log(pay({ ...s, phase: "roll", quiz: null }, s.turn, 50, null), `${me.name} gets the Pop Quiz wrong: -£50.`));
}

/** Build a flat on a place in a full set (up to 3). */
export function tycoonBuild(s: TState, i: number): TState {
  const me = s.turn;
  const sp = BOARD[i];
  if (s.phase !== "roll" || s.owner[i] !== me || sp.kind !== "place" || !ownsSet(s, me, sp.group!)) return s;
  const n = s.flats[i] ?? 0;
  if (n >= 3 || s.players[me].cash < flatCost(i)) return s;
  const st = pay(s, me, flatCost(i), null);
  return log({ ...st, flats: { ...st.flats, [i]: n + 1 } }, `${s.players[me].name} builds flats on ${sp.name}.`);
}

/** Computer players: buy when they can afford it with a cushion, build on full sets, 60% quiz luck. */
export function tycoonCpuStep(s: TState): TState {
  const me = s.players[s.turn];
  if (!me.cpu || s.phase === "over") return s;
  if (s.phase === "buy") return tycoonBuy(s, me.cash - (BOARD[me.pos].price ?? 0) > 150);
  if (s.phase === "quiz") return tycoonQuiz(s, Math.random() < 0.6);
  // Build before rolling if there's spare cash.
  for (let i = 0; i < BOARD.length; i++) {
    const sp = BOARD[i];
    if (sp.kind === "place" && s.owner[i] === s.turn && ownsSet(s, s.turn, sp.group!) && (s.flats[i] ?? 0) < 3 && me.cash - flatCost(i) > 300) return tycoonBuild(s, i);
  }
  return tycoonRoll(s);
}

/** Where a space sits around the square board (0..SIDE*4-1 → grid row/col on a (SIDE+1)×(SIDE+1) grid). */
export function spaceCell(i: number): { row: number; col: number } {
  const n = SIDE;
  if (i <= n) return { row: n, col: n - i };
  if (i <= 2 * n) return { row: n - (i - n), col: 0 };
  if (i <= 3 * n) return { row: 0, col: i - 2 * n };
  return { row: i - 3 * n, col: n };
}
export { groupOf };
