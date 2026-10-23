/**
 * Maths Racing: answer questions to drive. Correct answers give a boost,
 * wrong ones a short slow-down, so accuracy beats button-mashing.
 *
 * Everything here is pure and seeded. A race is fully described by its track,
 * seed and the timeline of the player's inputs, so the server can replay a
 * submitted run and work out the real finishing time itself.
 */
import { type Rng, createRng, pick, randInt, shuffle } from "./rng";

/* ---------------- Questions ---------------- */
export interface RaceQuestion { prompt: string; options: string[]; answer: number; explain: string }
type Gen = (r: Rng, d: number) => { prompt: string; answer: string; wrong: string[]; explain: string };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n: number, d: number) => { const g = gcd(n, d); const a = n / g, b = d / g; return b === 1 ? `${a}` : `${a}/${b}`; };
const near = (n: number, r: Rng, spread = 3) => {
  const out = new Set<number>();
  const tries = [n + 1, n - 1, n + 10, n - 10, n * 2, Math.round(n / 2), n + spread, n - spread, -n];
  for (const t of shuffle(r, tries)) { if (t !== n && out.size < 3 && Number.isFinite(t)) out.add(t); }
  while (out.size < 3) out.add(n + randInt(r, 2, 20));
  return [...out].map(String);
};
const dp = (n: number) => String(Math.round(n * 1000) / 1000);

const W1: Gen[] = [
  (r, d) => { const a = randInt(r, 10, 40 * d), b = randInt(r, 10, 40 * d); return { prompt: `${a} + ${b}`, answer: `${a + b}`, wrong: near(a + b, r), explain: `${a} + ${b} = ${a + b}` }; },
  (r, d) => { const a = randInt(r, 30, 60 * d), b = randInt(r, 5, a - 1); return { prompt: `${a} − ${b}`, answer: `${a - b}`, wrong: near(a - b, r), explain: `${a} − ${b} = ${a - b}` }; },
  (r, d) => { const a = randInt(r, 2, 6 + 2 * d), b = randInt(r, 2, 12); return { prompt: `${a} × ${b}`, answer: `${a * b}`, wrong: near(a * b, r, a), explain: `${a} lots of ${b} is ${a * b}` }; },
  (r, d) => { const b = randInt(r, 2, 12), q = randInt(r, 2, 5 + 2 * d); return { prompt: `${b * q} ÷ ${b}`, answer: `${q}`, wrong: near(q, r), explain: `${b} × ${q} = ${b * q}` }; },
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, 2, 9), c = randInt(r, 2, 9); return { prompt: `${a} + ${b} × ${c}`, answer: `${a + b * c}`, wrong: [`${(a + b) * c}`, ...near(a + b * c, r).slice(0, 2)], explain: `Multiply first: ${b} × ${c} = ${b * c}, then add ${a}.` }; },
  (r) => { const a = randInt(r, -12, -2), b = randInt(r, 3, 15); return { prompt: `${a} + ${b}`, answer: `${a + b}`, wrong: [`${a - b}`, `${-a + b}`, `${-(a + b)}`].filter((x) => x !== `${a + b}`).concat(near(a + b, r)).slice(0, 3), explain: `Start at ${a} and count up ${b}.` }; },
];
const W2: Gen[] = [
  (r, d) => { const p = pick(r, d < 3 ? [10, 20, 25, 50] : [5, 15, 30, 35, 40, 75]); const n = randInt(r, 2, 20) * 20; const a = (p * n) / 100; return { prompt: `${p}% of ${n}`, answer: dp(a), wrong: near(a, r, 5).map((x) => dp(Number(x))), explain: `${p}% = ${p}/100, so ${p}/100 × ${n} = ${a}` }; },
  (r) => { const dd = pick(r, [2, 3, 4, 5, 8, 10]), nn = randInt(r, 1, dd - 1), m = randInt(r, 2, 12) * dd; const a = (m / dd) * nn; return { prompt: `${nn}/${dd} of ${m}`, answer: `${a}`, wrong: near(a, r), explain: `${m} ÷ ${dd} = ${m / dd}, × ${nn} = ${a}` }; },
  (r) => { const p = randInt(r, 1, 99); return { prompt: `${p}% as a decimal`, answer: dp(p / 100), wrong: [dp(p / 10), dp(p), dp(p / 1000)], explain: `Divide by 100: ${p} ÷ 100 = ${dp(p / 100)}` }; },
  (r) => { const g = randInt(r, 2, 6), a = randInt(r, 1, 7), b = a + randInt(r, 1, 7); const s = frac(a, b); return { prompt: `Simplify ${a * g}/${b * g}`, answer: s, wrong: [`${a * g}/${b}`, `${a}/${b * g}`, frac(a + 1, b)].filter((x) => x !== s), explain: `Divide top and bottom by ${g * gcd(a, b)}.` }; },
  (r) => { const a = randInt(r, 1, 9) / 10, b = randInt(r, 1, 9) / 10; return { prompt: `${a} + ${b}`, answer: dp(a + b), wrong: [dp(a + b + 0.1), dp(a + b - 0.1), dp((a + b) * 10)], explain: `${a} + ${b} = ${dp(a + b)}` }; },
];
const W3: Gen[] = [
  (r, d) => { const x = randInt(r, -5, 12), a = randInt(r, 2, 3 + d), b = randInt(r, -10, 15); const c = a * x + b; return { prompt: `Solve ${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${c}`, answer: `x = ${x}`, wrong: near(x, r).map((v) => `x = ${v}`), explain: `Subtract ${b}: ${a}x = ${c - b}, then ÷ ${a}: x = ${x}` }; },
  (r) => { const x = randInt(r, -4, 6), a = randInt(r, 2, 5), b = randInt(r, 1, 9); const v = a * x * x + b; return { prompt: `If x = ${x}, find ${a}x² + ${b}`, answer: `${v}`, wrong: [`${a * x * 2 + b}`, `${(a * x) ** 2 + b}`, `${v + a}`].filter((s) => s !== `${v}`), explain: `x² = ${x * x}, × ${a} = ${a * x * x}, + ${b} = ${v}` }; },
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, 2, 9); return { prompt: `Expand ${a}(x + ${b})`, answer: `${a}x + ${a * b}`, wrong: [`${a}x + ${b}`, `x + ${a * b}`, `${a}x + ${a + b}`], explain: `Multiply both terms by ${a}.` }; },
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, -5, 10); const seq = [1, 2, 3, 4].map((n) => a * n + b).join(", "); return { prompt: `nth term of ${seq}, …`, answer: `${a}n ${b < 0 ? "−" : "+"} ${Math.abs(b)}`, wrong: [`${a}n`, `n + ${a}`, `${a + b}n ${b < 0 ? "+" : "−"} ${Math.abs(b)}`], explain: `Goes up by ${a}, so ${a}n; then adjust by ${b}.` }; },
];
const TRIPLES = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15]];
const W4: Gen[] = [
  (r, d) => { const w = randInt(r, 2, 6 + d * 2), h = randInt(r, 2, 12); return { prompt: `Area of a ${w} cm × ${h} cm rectangle`, answer: `${w * h} cm²`, wrong: [`${2 * (w + h)} cm²`, `${w * h + w} cm²`, `${w + h} cm²`], explain: `Area = length × width = ${w * h}` }; },
  (r) => { const b = randInt(r, 2, 12) * 2, h = randInt(r, 2, 12); return { prompt: `Area of a triangle: base ${b}, height ${h}`, answer: `${(b * h) / 2}`, wrong: [`${b * h}`, `${b + h}`, `${(b * h) / 2 + h}`], explain: `½ × base × height = ${(b * h) / 2}` }; },
  (r) => { const a = randInt(r, 30, 80), b = randInt(r, 20, 150 - a - 10); return { prompt: `Triangle angles ${a}° and ${b}°. The third?`, answer: `${180 - a - b}°`, wrong: [`${360 - a - b}°`, `${90 - Math.min(a, 89)}°`, `${180 - a - b + 10}°`], explain: `Angles in a triangle add to 180°.` }; },
  (r) => { const [a, b, c] = pick(r, TRIPLES); const k = randInt(r, 1, 2); return { prompt: `Right-angled triangle, legs ${a * k} and ${b * k}. Hypotenuse?`, answer: `${c * k}`, wrong: [`${(a + b) * k}`, `${(c + 1) * k}`, `${c * k - 2}`], explain: `√(${a * k}² + ${b * k}²) = ${c * k}` }; },
  (r) => { const rad = randInt(r, 2, 10); return { prompt: `Area of a circle, radius ${rad} (in terms of π)`, answer: `${rad * rad}π`, wrong: [`${2 * rad}π`, `${rad}π`, `${rad * rad * 2}π`], explain: `πr² = π × ${rad}² = ${rad * rad}π` }; },
];
const W5: Gen[] = [
  (r) => { const a = randInt(r, 1, 5), b = randInt(r, 1, 5), k = randInt(r, 2, 12); const t = (a + b) * k; return { prompt: `Share ${t} in the ratio ${a}:${b}. Bigger share?`, answer: `${Math.max(a, b) * k}`, wrong: [`${Math.min(a, b) * k}`, `${t / 2}`, `${Math.max(a, b) * k + k}`].filter((x) => x !== `${Math.max(a, b) * k}`), explain: `${a + b} parts, each ${k}.` }; },
  (r) => { const n = randInt(r, 2, 6), p = randInt(r, 2, 9) * n; const m = randInt(r, 2, 9); return { prompt: `${n} pens cost £${p}. Cost of ${m}?`, answer: `£${(p / n) * m}`, wrong: [`£${p * m}`, `£${p + m}`, `£${(p / n) * (m + 1)}`], explain: `One pen £${p / n}, × ${m}.` }; },
  (r) => { const s = randInt(r, 2, 10), real = randInt(r, 2, 9); return { prompt: `Map scale 1:${s * 1000}. ${real} cm on the map is…`, answer: `${(real * s * 1000) / 100} m`, wrong: [`${real * s} m`, `${real * s * 1000} m`, `${(real * s * 1000) / 1000} m`], explain: `${real} × ${s * 1000} cm = ${(real * s * 1000) / 100} m` }; },
];
const W6: Gen[] = [
  (r, d) => { const xs = Array.from({ length: 3 + d }, () => randInt(r, 1, 20)); const fix = xs.length - (xs.reduce((a, b) => a + b, 0) % xs.length); xs[0] += fix === xs.length ? 0 : fix; const m = xs.reduce((a, b) => a + b, 0) / xs.length; return { prompt: `Mean of ${xs.join(", ")}`, answer: `${m}`, wrong: near(m, r), explain: `Total ${xs.reduce((a, b) => a + b, 0)} ÷ ${xs.length}.` }; },
  (r) => { const xs = Array.from({ length: 5 }, () => randInt(r, 1, 30)); const s = [...xs].sort((a, b) => a - b); return { prompt: `Range of ${xs.join(", ")}`, answer: `${s[4] - s[0]}`, wrong: [`${s[4]}`, `${s[2]}`, `${s[4] + s[0]}`].filter((x) => x !== `${s[4] - s[0]}`), explain: `Largest − smallest = ${s[4]} − ${s[0]}` }; },
  (r) => { const xs = Array.from({ length: 5 }, () => randInt(r, 1, 30)); const s = [...xs].sort((a, b) => a - b); return { prompt: `Median of ${xs.join(", ")}`, answer: `${s[2]}`, wrong: [`${xs[2]}`, `${s[1]}`, `${s[3]}`].filter((x) => x !== `${s[2]}`).concat([`${s[2] + 1}`]).slice(0, 3), explain: `In order: ${s.join(", ")}. Middle is ${s[2]}.` }; },
  (r) => { const red = randInt(r, 1, 8), blue = randInt(r, 1, 8); return { prompt: `${red} red and ${blue} blue counters. P(red)?`, answer: frac(red, red + blue), wrong: [frac(blue, red + blue), `${red}/${blue}`, frac(1, 2)].filter((x) => x !== frac(red, red + blue)).concat([frac(red + 1, red + blue + 1)]).slice(0, 3), explain: `${red} out of ${red + blue}.` }; },
];
const W7: Gen[] = [
  (r) => { const a = randInt(r, 1, 9), b = randInt(r, 1, 9); return { prompt: `Solve x² ${a + b > 0 ? "−" : "+"} ${a + b}x + ${a * b} = 0`, answer: `x = ${a} or ${b}`, wrong: [`x = −${a} or −${b}`, `x = ${a + b} or ${a * b}`, `x = ${a} or −${b}`], explain: `(x − ${a})(x − ${b}) = 0` }; },
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, 2, 9); return { prompt: `Simplify x^${a} × x^${b}`, answer: `x^${a + b}`, wrong: [`x^${a * b}`, `x^${Math.abs(a - b)}`, `2x^${a + b}`], explain: `Add the powers.` }; },
  (r) => { const k = randInt(r, 2, 6), n = pick(r, [2, 3, 5, 6, 7]); return { prompt: `Simplify √${k * k * n}`, answer: `${k}√${n}`, wrong: [`${n}√${k}`, `${k * n}√${k}`, `${k}√${n * 2}`], explain: `√${k * k * n} = √${k * k} × √${n}` }; },
  (r) => { const x = randInt(r, 1, 6), y = randInt(r, 1, 6); return { prompt: `x + y = ${x + y}, x − y = ${x - y}. Find x.`, answer: `${x}`, wrong: near(x, r), explain: `Add the equations: 2x = ${2 * x}.` }; },
];
const W8: Gen[] = [
  (r) => { const a = randInt(r, 2, 6), n = randInt(r, 2, 4), x = randInt(r, 1, 3); const v = a * n * x ** (n - 1); return { prompt: `y = ${a}x^${n}. dy/dx at x = ${x}?`, answer: `${v}`, wrong: [`${a * x ** n}`, `${a * n * x ** n}`, `${v + a}`].filter((s) => s !== `${v}`), explain: `dy/dx = ${a * n}x^${n - 1}` }; },
  (r) => { const a = randInt(r, 1, 4) * 3, b = randInt(r, 1, 3); return { prompt: `∫₀^${b} ${a}x² dx`, answer: `${(a / 3) * b ** 3}`, wrong: [`${a * b ** 3}`, `${a * b ** 2}`, `${(a / 3) * b ** 2}`], explain: `[${a / 3}x³] from 0 to ${b}.` }; },
  (r) => { const b = pick(r, [2, 3, 5, 10]), k = randInt(r, 2, 4); return { prompt: `log base ${b} of ${b ** k}`, answer: `${k}`, wrong: [`${b ** k / b}`, `${k + 1}`, `${b * k}`].filter((s) => s !== `${k}`), explain: `${b}^${k} = ${b ** k}` }; },
  (r) => { const n = randInt(r, 4, 8), k = randInt(r, 2, 3); let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return { prompt: `${n}C${k}`, answer: `${c}`, wrong: near(c, r), explain: `${n}! ÷ (${k}! × ${n - k}!)` }; },
  (r) => { const a = randInt(r, 1, 9), d = randInt(r, 1, 6), n = randInt(r, 5, 12); const s = (n / 2) * (2 * a + (n - 1) * d); return { prompt: `Sum of first ${n} terms: a = ${a}, d = ${d}`, answer: `${s}`, wrong: near(s, r, d), explain: `Sₙ = n/2 (2a + (n − 1)d)` }; },
];

export interface World { id: number; name: string; topic: string; sky: [string, string]; ground: string; road: string; gens: Gen[]; level: "GCSE" | "A level" }
export const WORLDS: World[] = [
  { id: 1, name: "Number Nebula", topic: "Number and arithmetic", sky: ["#5bc0ff", "#c9ecff"], ground: "#5fbf4f", road: "#5a5f6e", gens: W1, level: "GCSE" },
  { id: 2, name: "Fraction Falls", topic: "Fractions, decimals and percentages", sky: ["#ff9a6b", "#ffe0b8"], ground: "#e8c05a", road: "#6a5a52", gens: W2, level: "GCSE" },
  { id: 3, name: "Algebra Alps", topic: "Algebra", sky: ["#8ab4ff", "#eef4ff"], ground: "#e9f1f7", road: "#4f5866", gens: W3, level: "GCSE" },
  { id: 4, name: "Geometry Gorge", topic: "Geometry and measures", sky: ["#f6a35b", "#ffd9a8"], ground: "#c9733f", road: "#5d4636", gens: W4, level: "GCSE" },
  { id: 5, name: "Ratio Reef", topic: "Ratio and proportion", sky: ["#2ec4d6", "#bff3f7"], ground: "#f1dfa5", road: "#53636b", gens: W5, level: "GCSE" },
  { id: 6, name: "Probability Park", topic: "Probability and statistics", sky: ["#9a7bff", "#e6dcff"], ground: "#6fcf6a", road: "#4e4a63", gens: W6, level: "GCSE" },
  { id: 7, name: "Higher Highway", topic: "Advanced GCSE challenges", sky: ["#1b2a5a", "#5162a8"], ground: "#28385f", road: "#2b2f3d", gens: W7, level: "GCSE" },
  { id: 8, name: "Calculus Circuit", topic: "A level Maths challenges", sky: ["#0d0b24", "#3b2a6b"], ground: "#1d1940", road: "#24203d", gens: W8, level: "A level" },
];

export function question(world: World, seed: number, index: number, difficulty: number): RaceQuestion {
  const r = createRng((seed ^ (index * 2654435761)) >>> 0);
  for (let tries = 0; tries < 10; tries++) {
    const q = pick(r, world.gens)(r, difficulty);
    const wrong = [...new Set(q.wrong.filter((w) => w !== q.answer))].slice(0, 3);
    if (wrong.length < 3) continue;
    const options = shuffle(r, [q.answer, ...wrong]);
    return { prompt: q.prompt, options, answer: options.indexOf(q.answer), explain: q.explain };
  }
  return { prompt: "2 + 2", options: ["4", "3", "5", "22"], answer: 0, explain: "2 + 2 = 4" };
}

/* ---------------- Tracks ---------------- */
export const TRACKS_PER_WORLD = 4; // three tracks then a boss race
export interface Track { id: string; world: number; index: number; name: string; boss: boolean; length: number; difficulty: number; racers: number }
export function trackOf(world: number, index: number): Track {
  const boss = index === TRACKS_PER_WORLD - 1;
  const names = ["Sprint", "Loop", "Rally", "Boss race"];
  return { id: `w${world}-t${index + 1}`, world, index, name: `${WORLDS[world - 1].name} ${names[index]}`, boss, length: 900 + index * 150 + (boss ? 150 : 0), difficulty: Math.min(4, 1 + index + (world > 6 ? 1 : 0)), racers: 5 };
}
export const trackById = (id: string) => { const m = /^w([1-8])-t([1-4])$/.exec(id); return m ? trackOf(Number(m[1]), Number(m[2]) - 1) : null; };

/* ---------------- Physics ---------------- */
export const BASE_SPEED = 12; // m/s
export const BOOST = 14; // m/s extra right after a correct answer
export const BOOST_SECONDS = 3;
export const SLOW_SECONDS = 1.6;
export const MIN_THINK_MS = 900; // answers faster than this are ignored (no guessing spam)
export const LANES = 3;
export const STEP_MS = 50;
const HIT_SECONDS = 1;

/** A player input: an answer (option index) or a lane change (−1/+1). */
export type RaceEvent = { t: number; kind: "answer"; choice: number } | { t: number; kind: "lane"; dir: -1 | 1 };
export interface RaceState { t: number; distance: number; speed: number; lane: number; boostUntil: number; slowUntil: number; hitUntil: number; q: number; right: number; wrong: number; lastAnswerAt: number; streak: number; finishedAt: number | null; hits: number }

/** Cones on the road for a track: distance and lane. */
export function obstacles(track: Track, seed: number) {
  const r = createRng((seed * 7 + track.world * 101 + track.index) >>> 0);
  const out: { d: number; lane: number }[] = [];
  for (let d = 120; d < track.length - 60; d += randInt(r, 70, 130)) out.push({ d, lane: randInt(r, 0, LANES - 1) });
  return out;
}

export function startState(): RaceState {
  return { t: 0, distance: 0, speed: 0, lane: 1, boostUntil: 0, slowUntil: 0, hitUntil: 0, q: 0, right: 0, wrong: 0, lastAnswerAt: -MIN_THINK_MS, streak: 0, finishedAt: null, hits: 0 };
}

/** Apply one input. Returns whether the answer (if any) was right. */
export function applyEvent(s: RaceState, e: RaceEvent, track: Track, seed: number): boolean | null {
  if (s.finishedAt !== null) return null;
  if (e.kind === "lane") { s.lane = Math.max(0, Math.min(LANES - 1, s.lane + e.dir)); return null; }
  if (e.t - s.lastAnswerAt < MIN_THINK_MS) return null;
  const q = question(WORLDS[track.world - 1], seed, s.q, track.difficulty);
  const ok = e.choice === q.answer;
  s.q++;
  s.lastAnswerAt = e.t;
  if (ok) { s.right++; s.streak++; s.boostUntil = e.t + BOOST_SECONDS * 1000 * (s.streak >= 3 ? 1.3 : 1); }
  else { s.wrong++; s.streak = 0; s.slowUntil = e.t + SLOW_SECONDS * 1000; s.boostUntil = 0; }
  return ok;
}

/** Advance the car by `ms`. */
export function advance(s: RaceState, ms: number, track: Track, cones: { d: number; lane: number }[]) {
  const steps = Math.max(1, Math.round(ms / STEP_MS));
  for (let i = 0; i < steps && s.finishedAt === null; i++) {
    s.t += STEP_MS;
    let target = BASE_SPEED;
    if (s.t < s.boostUntil) target += BOOST * Math.min(1, (s.boostUntil - s.t) / 1000);
    if (s.t < s.slowUntil) target *= 0.45;
    if (s.t < s.hitUntil) target *= 0.35;
    s.speed += (target - s.speed) * 0.08;
    const before = s.distance;
    s.distance += (s.speed * STEP_MS) / 1000;
    for (const c of cones) if (c.lane === s.lane && before < c.d && s.distance >= c.d && s.t >= s.hitUntil) { s.hitUntil = s.t + HIT_SECONDS * 1000; s.hits++; }
    if (s.distance >= track.length) s.finishedAt = s.t;
  }
}

/** Replay a whole run from its inputs (the server uses this to verify a time). */
export function replay(track: Track, seed: number, events: RaceEvent[], limitMs = 600_000) {
  const s = startState();
  const cones = obstacles(track, seed);
  const sorted = [...events].sort((a, b) => a.t - b.t);
  let i = 0;
  while (s.finishedAt === null && s.t < limitMs) {
    while (i < sorted.length && sorted[i].t <= s.t) applyEvent(s, sorted[i++], track, seed);
    advance(s, STEP_MS, track, cones);
  }
  return s;
}

/* ---------------- Computer racers ---------------- */
export interface Rival { name: string; colour: string; accuracy: number; pace: number }
const RIVAL_NAMES = ["Turbo Tess", "Max Velocity", "Captain Carry", "Dr Divide", "Lady Lemma", "Sir Cosine", "Pi-Rate Pete", "Vector Vee", "Hypo Tenuse", "Mo Mentum"];
const RIVAL_COLOURS = ["#e5484d", "#f5a524", "#7a5ce6", "#15987f", "#1aa3c4", "#d1468f"];
export function rivals(track: Track, seed: number): Rival[] {
  const r = createRng((seed ^ 0x9e3779b9 ^ track.world * 31 + track.index) >>> 0);
  const names = shuffle(r, RIVAL_NAMES);
  const skill = 0.55 + track.world * 0.03 + track.index * 0.04 + (track.boss ? 0.06 : 0);
  return Array.from({ length: track.racers - 1 }, (_, i) => ({
    name: track.boss && i === 0 ? `Boss: ${names[i]}` : names[i],
    colour: RIVAL_COLOURS[i % RIVAL_COLOURS.length],
    accuracy: Math.min(0.95, skill - 0.12 + r() * 0.24 + (track.boss && i === 0 ? 0.08 : 0)),
    pace: 2900 + r() * 2000 + track.world * 260 - (track.boss && i === 0 ? 500 : 0),
  }));
}
/** A rival's inputs: they answer every `pace` ms, right with probability `accuracy`, and dodge most cones. */
export function rivalEvents(track: Track, seed: number, rival: Rival, index: number): RaceEvent[] {
  const r = createRng((seed + index * 977 + 13) >>> 0);
  const events: RaceEvent[] = [];
  for (let t = 1200 + r() * 800, q = 0; t < 400_000 && q < 400; t += rival.pace * (0.7 + r() * 0.6), q++) {
    const right = question(WORLDS[track.world - 1], seed, q, track.difficulty).answer;
    events.push({ t: Math.round(t), kind: "answer", choice: r() < rival.accuracy ? right : (right + 1 + Math.floor(r() * 3)) % 4 });
  }
  // Rivals steer around cones three times out of four.
  const cones = obstacles(track, seed);
  let lane = 1;
  for (const c of cones) {
    if (c.lane !== lane || r() > 0.75) continue;
    const dir: -1 | 1 = lane === 0 ? 1 : lane === LANES - 1 ? -1 : r() < 0.5 ? -1 : 1;
    lane += dir;
    // Approximate when they reach the cone at cruising speed.
    events.push({ t: Math.max(0, Math.round((c.d / (BASE_SPEED * 1.4)) * 1000) - 600), kind: "lane", dir });
  }
  return events.sort((a, b) => a.t - b.t);
}

/* ---------------- Results ---------------- */
export function starsFor(place: number, right: number, wrong: number) {
  const acc = right + wrong ? right / (right + wrong) : 0;
  if (place === 1 && acc >= 0.8) return 3;
  if (place <= 3) return 2;
  return 1;
}
export const accuracy = (right: number, wrong: number) => (right + wrong ? Math.round((100 * right) / (right + wrong)) : 0);

/* ---------------- Garage ---------------- */
export interface Kart { id: string; name: string; body: string; trim: string; stars: number }
export const KARTS: Kart[] = [
  { id: "starter", name: "Starter Kart", body: "#2b5fd9", trim: "#f2d9a6", stars: 0 },
  { id: "sunburst", name: "Sunburst", body: "#f5a524", trim: "#ffffff", stars: 6 },
  { id: "mint", name: "Mint Machine", body: "#15987f", trim: "#c8fff0", stars: 12 },
  { id: "volt", name: "Volt Viper", body: "#7a5ce6", trim: "#ffe066", stars: 20 },
  { id: "ruby", name: "Ruby Rocket", body: "#e5484d", trim: "#ffd1d1", stars: 30 },
  { id: "midnight", name: "Midnight Integral", body: "#13203a", trim: "#9ec5ff", stars: 45 },
  { id: "gold", name: "Golden Ratio", body: "#d6a21b", trim: "#fff3c4", stars: 70 },
];
/** Stars needed to open each world. */
export const WORLD_STARS = [0, 4, 10, 16, 24, 32, 42, 54];
