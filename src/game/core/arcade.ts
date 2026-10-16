/**
 * The Arcade: 60-second revision mini-games you unlock with Clout.
 * Prices must match public.arcade_games (tests check).
 */
import { type Rng, createRng, pick, randInt, shuffle } from "./rng";

export interface ArcadeQuestion {
  prompt: string;
  options: string[];
  answer: number;
}

export interface ArcadeGame {
  id: string;
  name: string;
  subject: string;
  price: number;
  blurb: string;
  colour: string;
  make: (rng: Rng) => ArcadeQuestion;
}

const choice = (rng: Rng, right: string, wrong: string[]): { options: string[]; answer: number } => {
  const opts = shuffle(rng, [right, ...shuffle(rng, [...new Set(wrong.filter((w) => w !== right))]).slice(0, 3)]);
  return { options: opts, answer: opts.indexOf(right) };
};

const ELEMENTS: [string, string][] = [
  ["H", "Hydrogen"], ["He", "Helium"], ["Li", "Lithium"], ["Be", "Beryllium"], ["B", "Boron"], ["C", "Carbon"], ["N", "Nitrogen"], ["O", "Oxygen"],
  ["F", "Fluorine"], ["Ne", "Neon"], ["Na", "Sodium"], ["Mg", "Magnesium"], ["Al", "Aluminium"], ["Si", "Silicon"], ["P", "Phosphorus"], ["S", "Sulfur"],
  ["Cl", "Chlorine"], ["Ar", "Argon"], ["K", "Potassium"], ["Ca", "Calcium"], ["Fe", "Iron"], ["Cu", "Copper"], ["Zn", "Zinc"], ["Br", "Bromine"],
  ["Ag", "Silver"], ["Sn", "Tin"], ["I", "Iodine"], ["Au", "Gold"], ["Hg", "Mercury"], ["Pb", "Lead"], ["Mn", "Manganese"], ["Ni", "Nickel"],
];

const TERMS: [string, string][] = [
  ["Photosynthesis", "Plants making glucose from carbon dioxide and water using light"],
  ["Osmosis", "Movement of water across a partially permeable membrane from dilute to concentrated solution"],
  ["Diffusion", "Net movement of particles from high to low concentration"],
  ["Enzyme", "A biological catalyst that speeds up reactions"],
  ["Mitosis", "Cell division making two genetically identical cells"],
  ["Homeostasis", "Keeping internal conditions constant"],
  ["Isotope", "Atoms of the same element with different numbers of neutrons"],
  ["Exothermic", "A reaction that gives out energy to the surroundings"],
  ["Catalyst", "Speeds up a reaction without being used up"],
  ["Electrolysis", "Splitting a compound using electricity"],
  ["Momentum", "Mass multiplied by velocity"],
  ["Acceleration", "Rate of change of velocity"],
  ["Half-life", "Time for half the radioactive nuclei in a sample to decay"],
  ["Inflation", "A general rise in prices over time"],
  ["Revenue", "Money a business takes from sales"],
  ["Profit", "Revenue minus costs"],
  ["Algorithm", "A step-by-step set of instructions to solve a problem"],
  ["Iteration", "Repeating steps in a loop"],
  ["Variable", "A named value that can change while a program runs"],
  ["Metaphor", "Describing something as if it is something else"],
  ["Onomatopoeia", "A word that sounds like what it describes"],
  ["Democracy", "Government by the people, usually through elected representatives"],
  ["Erosion", "Wearing away and removal of rock by water, wind or ice"],
  ["Prime number", "A whole number with exactly two factors: 1 and itself"],
];

const UNITS: { q: string; a: string; wrong: string[] }[] = [
  { q: "1 km = ? m", a: "1000", wrong: ["100", "10 000", "10"] },
  { q: "1 m = ? cm", a: "100", wrong: ["10", "1000", "60"] },
  { q: "1 kg = ? g", a: "1000", wrong: ["100", "10", "1 000 000"] },
  { q: "1 litre = ? ml", a: "1000", wrong: ["100", "10", "500"] },
  { q: "1 hour = ? seconds", a: "3600", wrong: ["360", "600", "6000"] },
  { q: "Unit of force", a: "newton (N)", wrong: ["joule (J)", "watt (W)", "pascal (Pa)"] },
  { q: "Unit of energy", a: "joule (J)", wrong: ["newton (N)", "watt (W)", "volt (V)"] },
  { q: "Unit of power", a: "watt (W)", wrong: ["joule (J)", "ampere (A)", "ohm (Ω)"] },
  { q: "Unit of resistance", a: "ohm (Ω)", wrong: ["volt (V)", "ampere (A)", "coulomb (C)"] },
  { q: "Unit of current", a: "ampere (A)", wrong: ["volt (V)", "ohm (Ω)", "watt (W)"] },
  { q: "Unit of pressure", a: "pascal (Pa)", wrong: ["newton (N)", "joule (J)", "hertz (Hz)"] },
  { q: "Unit of frequency", a: "hertz (Hz)", wrong: ["metre (m)", "second (s)", "pascal (Pa)"] },
  { q: "1 GB = ? MB", a: "1000", wrong: ["100", "8", "1 000 000"] },
  { q: "1 byte = ? bits", a: "8", wrong: ["4", "16", "10"] },
  { q: "Speed = distance ÷ ?", a: "time", wrong: ["mass", "force", "area"] },
  { q: "Density = mass ÷ ?", a: "volume", wrong: ["area", "time", "weight"] },
];

export const ARCADE: ArcadeGame[] = [
  {
    id: "times-tables",
    name: "Times Table Dash",
    subject: "Maths",
    price: 0,
    blurb: "Quick-fire multiplication up to 12 × 12. Free for everyone.",
    colour: "#2b5fd9",
    make: (rng) => {
      const a = randInt(rng, 2, 12);
      const b = randInt(rng, 2, 12);
      const r = a * b;
      return { prompt: `${a} × ${b}`, ...choice(rng, String(r), [r + a, r - b, r + 10, r - 1, (a + 1) * b, a * (b - 1)].map(String)) };
    },
  },
  {
    id: "element-match",
    name: "Element Match",
    subject: "Chemistry",
    price: 400,
    blurb: "Match chemical symbols to element names from the periodic table.",
    colour: "#1d8a6a",
    make: (rng) => {
      const [sym, name] = pick(rng, ELEMENTS);
      const flip = rng() < 0.5;
      return flip
        ? { prompt: `Which element is ${sym}?`, ...choice(rng, name, ELEMENTS.map((e) => e[1])) }
        : { prompt: `Symbol for ${name}?`, ...choice(rng, sym, ELEMENTS.map((e) => e[0])) };
    },
  },
  {
    id: "binary-blitz",
    name: "Binary Blitz",
    subject: "Computer Science",
    price: 600,
    blurb: "Convert between binary, denary and hex like a GCSE CS pro.",
    colour: "#13203a",
    make: (rng) => {
      const n = randInt(rng, 1, 255);
      const kind = randInt(rng, 0, 2);
      const near = [n + 1, n - 1, n + 2, n ^ 4, n ^ 16, n + 8].filter((x) => x > 0 && x < 256 && x !== n);
      if (kind === 0) return { prompt: `${n.toString(2).padStart(8, "0")} in denary?`, ...choice(rng, String(n), near.map(String)) };
      if (kind === 1) return { prompt: `${n} in binary?`, ...choice(rng, n.toString(2).padStart(8, "0"), near.map((x) => x.toString(2).padStart(8, "0"))) };
      return { prompt: `${n} in hex?`, ...choice(rng, n.toString(16).toUpperCase(), near.map((x) => x.toString(16).toUpperCase())) };
    },
  },
  {
    id: "key-terms",
    name: "Key Terms",
    subject: "All subjects",
    price: 800,
    blurb: "Science, business, English and more: pick the right definition.",
    colour: "#b7791f",
    make: (rng) => {
      const [term, def] = pick(rng, TERMS);
      return { prompt: term, ...choice(rng, def, TERMS.map((t) => t[1])) };
    },
  },
  {
    id: "unit-rush",
    name: "Unit Rush",
    subject: "Physics",
    price: 1000,
    blurb: "SI units, conversions and the formulas you must know.",
    colour: "#c2410c",
    make: (rng) => {
      const u = pick(rng, UNITS);
      return { prompt: u.q, ...choice(rng, u.a, u.wrong) };
    },
  },
];

export const arcadeById = (id: string) => ARCADE.find((g) => g.id === id) ?? null;
export const ROUND_MS = 60_000;

/** A fixed list of questions for a round (enough that nobody runs out in 60 seconds). */
export function buildRound(game: ArcadeGame, seed: number, count = 80): ArcadeQuestion[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => game.make(rng));
}

/** Score: +1 per right answer, capped at 60 (the server checks too). */
export const scoreOf = (right: number) => Math.max(0, Math.min(60, right));
export const rewardOf = (score: number) => Math.floor(score / 2);
