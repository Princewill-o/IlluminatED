import { type Rng, pick, randInt, shuffle } from "./rng";

/**
 * Procedural questions (Mathletics-style): endless, always correct, and seeded
 * so a challenge replays identically. Every generator states its formula in the
 * explanation so a wrong answer still teaches something.
 */
export type GeneratorKind =
  | "binary"
  | "denary"
  | "hex"
  | "data-units"
  | "percent"
  | "percent-change"
  | "interest"
  | "ratio"
  | "times"
  | "best-buy"
  | "profit"
  | "magnification"
  | "micro-units"
  | "speed"
  | "ohm"
  | "power"
  | "weight"
  | "density"
  | "formula-mass"
  | "moles"
  | "area"
  | "volume"
  | "perimeter"
  | "scale"
  | "pace"
  | "grammar";

export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
  topic: string;
}

/** Builds a shuffled multiple-choice question with unique options. */
export function mcq(
  rng: Rng,
  correct: string,
  distractors: string[],
  rest: Omit<GeneratedQuestion, "options" | "answer">,
  count = 4,
): GeneratedQuestion {
  const unique = [...new Set(distractors.filter((d) => d !== correct))];
  const options = shuffle(rng, [correct, ...unique.slice(0, count - 1)]);
  return { ...rest, options, answer: options.indexOf(correct) };
}

const money = (n: number) =>
  Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (n: number) => String(round2(n));
const bin8 = (n: number) => n.toString(2).padStart(8, "0");
const near = (rng: Rng, n: number, spread: number, avoid: number[]) => {
  for (let i = 0; i < 20; i++) {
    const v = n + randInt(rng, -spread, spread);
    if (v > 0 && v !== n && !avoid.includes(v)) return v;
  }
  return n + spread + 1;
};

const GENERATORS: Record<GeneratorKind, (rng: Rng) => GeneratedQuestion> = {
  binary(rng) {
    const n = randInt(rng, 9, 255);
    const flip = n ^ (1 << randInt(rng, 0, 7));
    return mcq(
      rng,
      String(n),
      [String(flip), String(near(rng, n, 9, [flip])), String(n ^ 0b10000)],
      {
        prompt: `Convert the binary number ${bin8(n)} to denary.`,
        explain: `Add the place values (128, 64, 32, 16, 8, 4, 2, 1) wherever there's a 1. ${bin8(n)} = ${n}.`,
        topic: "Binary",
      },
    );
  },
  denary(rng) {
    const n = randInt(rng, 9, 255);
    const wrong = [
      n ^ (1 << randInt(rng, 0, 3)),
      n ^ (1 << randInt(rng, 4, 7)),
      (n + 1) & 255,
    ].filter((v) => v !== n);
    return mcq(rng, bin8(n), wrong.map(bin8), {
      prompt: `What is ${n} as an 8-bit binary number?`,
      explain: `Take away the biggest place values that fit (128, 64, 32 …) and write a 1 for each one you use. ${n} = ${bin8(n)}.`,
      topic: "Binary",
    });
  },
  hex(rng) {
    const n = randInt(rng, 17, 255);
    const h = n.toString(16).toUpperCase().padStart(2, "0");
    const swapped = parseInt(h.split("").reverse().join(""), 16);
    return mcq(
      rng,
      String(n),
      [String(swapped), String(n + 16), String(Math.max(1, n - 10))],
      {
        prompt: `Convert the hexadecimal number ${h} to denary.`,
        explain: `The first digit is worth 16s, the second 1s. ${h[0]} × 16 + ${h[1]} = ${n}. (A=10 … F=15)`,
        topic: "Hexadecimal",
      },
    );
  },
  "data-units"(rng) {
    if (rng() < 0.5) {
      const bytes = randInt(rng, 2, 32);
      return mcq(
        rng,
        String(bytes * 8),
        [String(bytes * 4), String(bytes * 10), String(bytes * 16)],
        {
          prompt: `How many bits are in ${bytes} bytes?`,
          explain: `1 byte = 8 bits, so ${bytes} × 8 = ${bytes * 8} bits.`,
          topic: "Units of data",
        },
      );
    }
    const nibbles = randInt(rng, 2, 20) * 2;
    return mcq(
      rng,
      String(nibbles / 2),
      [String(nibbles * 4), String(nibbles * 2), String(nibbles / 2 + 2)],
      {
        prompt: `How many bytes do ${nibbles} nibbles make?`,
        explain: `A nibble is 4 bits and a byte is 8 bits, so 2 nibbles = 1 byte. ${nibbles} ÷ 2 = ${nibbles / 2}.`,
        topic: "Units of data",
      },
    );
  },
  percent(rng) {
    const p = pick(rng, [5, 10, 15, 20, 25, 30, 40, 75]);
    const base = randInt(rng, 2, 24) * 20;
    const ans = (p * base) / 100;
    return mcq(
      rng,
      num(ans),
      [num(ans + base / 10), num(base / p), num(ans * 2)],
      {
        prompt: `What is ${p}% of ${base}?`,
        explain: `Find 10% (${base / 10}) or 1% (${base / 100}) and build up: ${p}% of ${base} = ${num(ans)}.`,
        topic: "Percentages",
      },
    );
  },
  "percent-change"(rng) {
    const price = randInt(rng, 2, 20) * 20;
    const p = pick(rng, [10, 20, 25, 50, 5]);
    const up = rng() < 0.5;
    const ans = up ? price * (1 + p / 100) : price * (1 - p / 100);
    const wrong = up ? price * (1 - p / 100) : price * (1 + p / 100);
    return mcq(
      rng,
      money(ans),
      [money(wrong), money(price + p), money((price * p) / 100)],
      {
        prompt: `A £${price} jacket ${up ? "goes up" : "is reduced"} by ${p}%. What is the new price?`,
        explain: `Use a multiplier: ${up ? "1 +" : "1 −"} ${p / 100} = ${1 + (up ? p : -p) / 100}. £${price} × ${1 + (up ? p : -p) / 100} = ${money(ans)}.`,
        topic: "Percentage change",
      },
    );
  },
  interest(rng) {
    const p = randInt(rng, 1, 10) * 100;
    const r = pick(rng, [2, 3, 4, 5, 10]);
    const y = randInt(rng, 2, 3);
    const ans = round2(p * Math.pow(1 + r / 100, y));
    const simple = p + (p * r * y) / 100;
    return mcq(
      rng,
      money(ans),
      [money(simple), money(round2(ans + p / 20)), money(p + (p * r) / 100)],
      {
        prompt: `You save £${p} at ${r}% compound interest per year. How much after ${y} years?`,
        explain: `Compound interest: £${p} × ${1 + r / 100}^${y} = ${money(ans)}. (Simple interest would give ${money(simple)}.)`,
        topic: "Compound interest",
      },
    );
  },
  ratio(rng) {
    const a = randInt(rng, 1, 4);
    let b = randInt(rng, 2, 5);
    if (b === a) b++;
    const unit = randInt(rng, 2, 12) * 5;
    const total = (a + b) * unit;
    const big = Math.max(a, b) * unit;
    return mcq(
      rng,
      money(big),
      [money(Math.min(a, b) * unit), money(total / 2), money(big + unit)],
      {
        prompt: `Share £${total} in the ratio ${a}:${b}. How much is the bigger share?`,
        explain: `${a} + ${b} = ${a + b} parts. £${total} ÷ ${a + b} = £${unit} per part. Bigger share = ${Math.max(a, b)} × £${unit} = ${money(big)}.`,
        topic: "Ratio",
      },
    );
  },
  times(rng) {
    const a = randInt(rng, 3, 12);
    const b = randInt(rng, 6, 12);
    if (rng() < 0.4) {
      return mcq(
        rng,
        String(a),
        [String(a + 1), String(a - 1 || 13), String(b)],
        {
          prompt: `${a * b} ÷ ${b} = ?`,
          explain: `${a} × ${b} = ${a * b}, so ${a * b} ÷ ${b} = ${a}.`,
          topic: "Mental maths",
        },
      );
    }
    return mcq(
      rng,
      String(a * b),
      [String(a * b + a), String(a * b - b), String(a * (b + 2))],
      {
        prompt: `${a} × ${b} = ?`,
        explain: `${a} × ${b} = ${a * b}. Tip: ${a} × ${b - 1} = ${a * (b - 1)}, then add one more ${a}.`,
        topic: "Mental maths",
      },
    );
  },
  "best-buy"(rng) {
    const unitPrices = shuffle(rng, [40, 45, 50, 55, 60, 65]).slice(0, 3);
    const packs = unitPrices.map((u, i) => {
      const count = [2, 3, 4, 5, 6][randInt(rng, 0, 4)];
      return {
        label: `Pack ${"ABC"[i]}`,
        count,
        unit: u,
        price: (u * count) / 100,
      };
    });
    const best = packs.reduce((m, p) => (p.unit < m.unit ? p : m));
    const opts = packs.map(
      (p) => `${p.label}: ${p.count} for ${money(p.price)}`,
    );
    const correct = opts[packs.indexOf(best)];
    return mcq(
      rng,
      correct,
      [...opts.filter((o) => o !== correct), "They're all the same"],
      {
        prompt:
          "Daisy needs milkshakes for the staff party. Which pack is the best value?",
        explain: `Work out the price of one: ${packs.map((p) => `${p.label} ${p.unit}p`).join(", ")}. ${best.label} is cheapest per milkshake.`,
        topic: "Best buys",
      },
    );
  },
  profit(rng) {
    const cost = randInt(rng, 2, 15) * 4;
    const margin = pick(rng, [20, 25, 40, 50]);
    const price = cost / (1 - margin / 100);
    const markup = Math.round(((price - cost) / cost) * 100);
    return mcq(
      rng,
      `${margin}%`,
      [`${markup}%`, `${100 - margin}%`, `${margin / 2}%`],
      {
        prompt: `Tesco buys a hamper for ${money(cost)} and sells it for ${money(price)}. What is the gross profit margin?`,
        explain: `Gross profit margin = profit ÷ selling price × 100. (${money(price)} − ${money(cost)}) ÷ ${money(price)} × 100 = ${margin}%. (Markup on cost would be ${markup}%.)`,
        topic: "Profit margin",
      },
    );
  },
  magnification(rng) {
    const actual = pick(rng, [0.01, 0.02, 0.025, 0.04, 0.05, 0.1]);
    const mag = pick(rng, [100, 200, 400, 500, 1000]);
    const image = round2(actual * mag);
    return mcq(
      rng,
      `×${mag}`,
      [`×${mag * 10}`, `×${mag / 10}`, `×${mag * 2}`],
      {
        prompt: `Under Dr Ow's microscope, a cell image is ${image} mm wide. The real cell is ${actual} mm wide. What is the magnification?`,
        explain: `Magnification = image size ÷ actual size = ${image} ÷ ${actual} = ×${mag}. Check both are in the same units first.`,
        topic: "Magnification",
      },
    );
  },
  "micro-units"(rng) {
    const mm = pick(rng, [0.5, 1.5, 2, 2.5, 3, 0.25, 0.1]);
    const um = round2(mm * 1000);
    return mcq(
      rng,
      `${um} µm`,
      [
        `${round2(mm * 100)} µm`,
        `${round2(mm * 10000)} µm`,
        `${round2(mm / 1000)} µm`,
      ],
      {
        prompt: `How many micrometres (µm) is ${mm} mm?`,
        explain: `1 mm = 1000 µm, so ${mm} × 1000 = ${um} µm.`,
        topic: "Units in microscopy",
      },
    );
  },
  speed(rng) {
    const s = randInt(rng, 3, 30);
    const t = randInt(rng, 2, 12);
    const d = s * t;
    return mcq(
      rng,
      `${s} m/s`,
      [`${d * t} m/s`, `${round2(t / d)} m/s`, `${d + t} m/s`],
      {
        prompt: `A self-driving Tesla travels ${d} m in ${t} s. What is its average speed?`,
        explain: `Speed = distance ÷ time = ${d} ÷ ${t} = ${s} m/s.`,
        topic: "Speed",
      },
    );
  },
  ohm(rng) {
    const i = randInt(rng, 2, 6);
    const r = randInt(rng, 2, 12) * 5;
    if (rng() < 0.5) {
      return mcq(
        rng,
        `${i * r} V`,
        [`${r / i} V`, `${i + r} V`, `${i * r * 2} V`],
        {
          prompt: `A current of ${i} A flows through a ${r} Ω resistor. What is the potential difference?`,
          explain: `V = I × R = ${i} × ${r} = ${i * r} V.`,
          topic: "Ohm's law",
        },
      );
    }
    return mcq(rng, `${i} A`, [`${i * r * r} A`, `${r} A`, `${i + 1} A`], {
      prompt: `${i * r} V is across a ${r} Ω resistor. What current flows?`,
      explain: `I = V ÷ R = ${i * r} ÷ ${r} = ${i} A.`,
      topic: "Ohm's law",
    });
  },
  power(rng) {
    const v = pick(rng, [6, 12, 24, 230]);
    const i = randInt(rng, 2, 10);
    return mcq(
      rng,
      `${v * i} W`,
      [`${v + i} W`, `${round2(v / i)} W`, `${v * i * 2} W`],
      {
        prompt: `A charger runs at ${v} V with a current of ${i} A. What is its power?`,
        explain: `P = I × V = ${i} × ${v} = ${v * i} W.`,
        topic: "Electrical power",
      },
    );
  },
  weight(rng) {
    const m = randInt(rng, 2, 90);
    return mcq(rng, `${m * 10} N`, [`${m} N`, `${m + 10} N`, `${m / 10} N`], {
      prompt: `What is the weight of a ${m} kg crash-test dummy? (Use g = 10 N/kg.)`,
      explain: `W = m × g = ${m} × 10 = ${m * 10} N. Mass is in kg; weight is a force in newtons.`,
      topic: "Weight",
    });
  },
  density(rng) {
    const d = randInt(rng, 2, 11) * 100;
    const v = pick(rng, [0.5, 2, 3, 4, 5]);
    const m = d * v;
    return mcq(
      rng,
      `${d} kg/m³`,
      [`${m * v} kg/m³`, `${round2(v / m)} kg/m³`, `${m} kg/m³`],
      {
        prompt: `A car part has a mass of ${m} kg and a volume of ${v} m³. What is its density?`,
        explain: `Density = mass ÷ volume = ${m} ÷ ${v} = ${d} kg/m³.`,
        topic: "Density",
      },
    );
  },
  "formula-mass"(rng) {
    const c = pick(rng, COMPOUNDS);
    return mcq(
      rng,
      num(c.mr),
      [num(c.mr + 16), num(c.mr - 1 > 0 ? c.mr - 1 : c.mr + 2), num(c.naive)],
      {
        prompt: `Pastry Pete needs the relative formula mass (Mr) of ${c.formula}. What is it?`,
        explain: `Add up the relative atomic masses: ${c.working} = ${num(c.mr)}.`,
        topic: "Relative formula mass",
      },
    );
  },
  moles(rng) {
    const c = pick(
      rng,
      COMPOUNDS.filter((x) => Number.isInteger(x.mr)),
    );
    const n = pick(rng, [0.5, 2, 3, 4, 5]);
    const mass = c.mr * n;
    return mcq(
      rng,
      `${n} mol`,
      [`${num(mass * c.mr)} mol`, `${num(c.mr / mass)} mol`, `${n + 1} mol`],
      {
        prompt: `How many moles are in ${num(mass)} g of ${c.formula}? (Mr = ${c.mr})`,
        explain: `Moles = mass ÷ Mr = ${num(mass)} ÷ ${c.mr} = ${n} mol.`,
        topic: "Moles",
      },
    );
  },
  area(rng) {
    const w = randInt(rng, 3, 12);
    const h = randInt(rng, 2, 9) * 2;
    if (rng() < 0.5) {
      return mcq(
        rng,
        `${(w * h) / 2} m²`,
        [`${w * h} m²`, `${w + h} m²`, `${2 * (w + h)} m²`],
        {
          prompt: `Big Sue needs to paint a triangular gable: base ${w} m, height ${h} m. What area is that?`,
          explain: `Area of a triangle = ½ × base × height = ½ × ${w} × ${h} = ${(w * h) / 2} m².`,
          topic: "Area",
        },
      );
    }
    return mcq(
      rng,
      `${w * h} m²`,
      [`${2 * (w + h)} m²`, `${(w * h) / 2} m²`, `${w * h + w} m²`],
      {
        prompt: `A floor is ${w} m by ${h} m. How many square metres of flooring are needed?`,
        explain: `Area of a rectangle = length × width = ${w} × ${h} = ${w * h} m².`,
        topic: "Area",
      },
    );
  },
  volume(rng) {
    const l = randInt(rng, 2, 8);
    const w = randInt(rng, 2, 6);
    const d = pick(rng, [0.5, 1, 2]);
    const v = l * w * d;
    return mcq(
      rng,
      `${num(v)} m³`,
      [
        `${num(l * w)} m³`,
        `${num(2 * (l * w + l * d + w * d))} m³`,
        `${num(l + w + d)} m³`,
      ],
      {
        prompt: `A foundation trench is ${l} m long, ${w} m wide and ${d} m deep. What volume of concrete fills it?`,
        explain: `Volume of a cuboid = length × width × depth = ${l} × ${w} × ${d} = ${num(v)} m³.`,
        topic: "Volume",
      },
    );
  },
  perimeter(rng) {
    const w = randInt(rng, 3, 15);
    const h = randInt(rng, 3, 15);
    return mcq(
      rng,
      `${2 * (w + h)} m`,
      [`${w * h} m`, `${w + h} m`, `${2 * w + h} m`],
      {
        prompt: `A garden is ${w} m by ${h} m. How much fencing goes all the way round?`,
        explain: `Perimeter = 2 × (length + width) = 2 × (${w} + ${h}) = ${2 * (w + h)} m.`,
        topic: "Perimeter",
      },
    );
  },
  scale(rng) {
    if (rng() < 0.5) {
      const cm = randInt(rng, 2, 12);
      const m = cm / 2;
      return mcq(
        rng,
        `${num(m)} m`,
        [`${cm * 50} m`, `${num(cm / 20)} m`, `${num(m * 10)} m`],
        {
          prompt: `On a 1:50 building plan, a wall measures ${cm} cm. How long is the real wall?`,
          explain: `Real = ${cm} × 50 = ${cm * 50} cm = ${num(m)} m.`,
          topic: "Scale drawings",
        },
      );
    }
    const cm = randInt(rng, 2, 12);
    const km = cm * 0.25;
    return mcq(
      rng,
      `${num(km)} km`,
      [`${num(km * 10)} km`, `${cm * 25} km`, `${num(km / 10)} km`],
      {
        prompt: `On a 1:25,000 map, two campsites are ${cm} cm apart. How far is that in real life?`,
        explain: `${cm} × 25,000 = ${cm * 25000} cm = ${num(km * 1000)} m = ${num(km)} km. (On 1:25,000, 4 cm = 1 km.)`,
        topic: "Map scale",
      },
    );
  },
  pace(rng) {
    const km = pick(rng, [2, 3, 4, 5, 10]);
    const p = randInt(rng, 4, 8);
    const mins = km * p;
    return mcq(
      rng,
      `${p} min/km`,
      [`${mins * km} min/km`, `${p + 1} min/km`, `${num(km / mins)} min/km`],
      {
        prompt: `Coach Sweats ran ${km} km in ${mins} minutes. What was the average pace?`,
        explain: `Pace = time ÷ distance = ${mins} ÷ ${km} = ${p} minutes per km.`,
        topic: "Pace",
      },
    );
  },
  grammar(rng) {
    const g = pick(rng, GRAMMAR);
    return mcq(
      rng,
      g.answer,
      g.choices,
      {
        prompt: `Fill the gap: “${g.sentence}”`,
        explain: g.why,
        topic: "Spelling and grammar",
      },
      g.choices.length + 1,
    );
  },
};

const COMPOUNDS: {
  formula: string;
  mr: number;
  naive: number;
  working: string;
}[] = [
  { formula: "H₂O", mr: 18, naive: 17, working: "(2 × 1) + 16" },
  { formula: "CO₂", mr: 44, naive: 28, working: "12 + (2 × 16)" },
  { formula: "NaCl", mr: 58.5, naive: 58, working: "23 + 35.5" },
  { formula: "CaCO₃", mr: 100, naive: 68, working: "40 + 12 + (3 × 16)" },
  { formula: "H₂SO₄", mr: 98, naive: 49, working: "(2 × 1) + 32 + (4 × 16)" },
  { formula: "NH₃", mr: 17, naive: 15, working: "14 + (3 × 1)" },
  { formula: "CH₄", mr: 16, naive: 13, working: "12 + (4 × 1)" },
  { formula: "MgO", mr: 40, naive: 41, working: "24 + 16" },
  { formula: "NaOH", mr: 40, naive: 39, working: "23 + 16 + 1" },
  { formula: "O₂", mr: 32, naive: 16, working: "2 × 16" },
];

const GRAMMAR: {
  sentence: string;
  answer: string;
  choices: string[];
  why: string;
}[] = [
  {
    sentence: "___ going to the staff party later.",
    answer: "They're",
    choices: ["Their", "There"],
    why: "“They're” is short for “they are”.",
  },
  {
    sentence: "Please put the popcorn over ___.",
    answer: "there",
    choices: ["their", "they're"],
    why: "“There” is a place.",
  },
  {
    sentence: "The interns forgot ___ lanyards again.",
    answer: "their",
    choices: ["there", "they're"],
    why: "“Their” shows something belongs to them.",
  },
  {
    sentence: "___ late for the meeting, Binge.",
    answer: "You're",
    choices: ["Your"],
    why: "“You're” is short for “you are”.",
  },
  {
    sentence: "Is this ___ script?",
    answer: "your",
    choices: ["you're"],
    why: "“Your” shows something belongs to you.",
  },
  {
    sentence: "The film studio lost ___ best camera.",
    answer: "its",
    choices: ["it's"],
    why: "“Its” (no apostrophe) shows possession.",
  },
  {
    sentence: "___ raining on the film set again.",
    answer: "It's",
    choices: ["Its"],
    why: "“It's” is short for “it is”.",
  },
  {
    sentence: "This trailer is ___ long.",
    answer: "too",
    choices: ["to", "two"],
    why: "“Too” means “more than enough” or “also”.",
  },
  {
    sentence: "The rain had a big ___ on the shoot.",
    answer: "effect",
    choices: ["affect"],
    why: "“Effect” is usually the noun (the result); “affect” is usually the verb.",
  },
  {
    sentence: "Will the rain ___ the shoot?",
    answer: "affect",
    choices: ["effect"],
    why: "“Affect” is usually the verb; “effect” is usually the noun.",
  },
  {
    sentence: "This season is better ___ the last one.",
    answer: "than",
    choices: ["then"],
    why: "“Than” compares things; “then” is about time.",
  },
  {
    sentence: "We filmed the chase, and ___ we had lunch.",
    answer: "then",
    choices: ["than"],
    why: "“Then” is about time or order; “than” compares.",
  },
  {
    sentence: "The judge ___ the case very quickly.",
    answer: "accepted",
    choices: ["excepted"],
    why: "“Accept” means to receive or agree; “except” means excluding.",
  },
  {
    sentence: "I ___ have finished the essay if the Wi-Fi worked.",
    answer: "would have",
    choices: ["would of"],
    why: "It's always “would have” (or “would've”), never “would of”.",
  },
];

export const GENERATOR_KINDS = Object.keys(GENERATORS) as GeneratorKind[];

export function generate(kind: GeneratorKind, rng: Rng): GeneratedQuestion {
  return GENERATORS[kind](rng);
}
