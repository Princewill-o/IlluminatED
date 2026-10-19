import { type Avatar } from "./cosmetics";
import { applyUniform } from "./outfits";
import { type Rng, createRng, pick, randInt, shuffle } from "./rng";

/**
 * Careers: real jobs inside IlluminatED London.
 *
 * Every workplace has roles on a ladder (entry → senior → manager). You get
 * hired through a short interview, work simulated shifts in uniform, and each
 * shift is five role-based practice tasks: giving change, booking appointments,
 * fixing a failing function, writing SQL, or spotting issues in a scenario.
 * Tasks practise skills, but do not represent real employment or accredited
 * assessment; CV wording identifies the experience as simulated.
 *
 * Pure and seeded: the same seed always produces the same shift.
 */

// ── Skills (what goes on your CV) ───────────────────────────────────────────
export const SKILLS = {
  "customer-service": "Customer service",
  numeracy: "Workplace numeracy",
  "cash-handling": "Cash handling",
  "food-safety": "Food safety and allergens",
  "order-accuracy": "Order accuracy",
  programming: "Programming (JavaScript/Python)",
  debugging: "Debugging and testing",
  sql: "SQL and databases",
  scheduling: "Scheduling and diary management",
  "written-communication": "Professional written communication",
  "data-protection": "Data protection (UK GDPR)",
  prioritisation: "Prioritisation",
  triage: "Clinical triage awareness",
  "clinical-observations": "Clinical observations",
  "fraud-awareness": "Fraud and scam awareness",
  finance: "Financial calculations",
  "legal-research": "Legal reading and terminology",
  "marketing-analytics": "Marketing analytics",
  copywriting: "Copywriting for an audience",
  "stock-control": "Stock control",
  "it-support": "IT support troubleshooting",
  "cyber-security": "Cyber security basics",
} as const;
export type SkillId = keyof typeof SKILLS;

// ── Tasks ───────────────────────────────────────────────────────────────────
export interface Task {
  kind: TaskKind;
  skill: SkillId;
  title: string;
  prompt: string;
  /** Supporting material: an order ticket, code, a table, an email. */
  doc?: { type: "code" | "ticket" | "table" | "email" | "list"; lang?: string; text?: string; rows?: string[][] };
  /** Either choose from options… */
  options?: string[];
  answer: number;
  /** …or type a number (answer then holds the expected value; tolerance in the same units). */
  numeric?: { unit?: string; prefix?: string; tolerance: number };
  /** Shown after answering: why, so every task teaches. */
  explain: string;
  lesson?: { text: string; videoId?: string };
}

type Gen = (rng: Rng) => Task;

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

/** Multiple choice with the right answer shuffled in. */
function mc(rng: Rng, right: string, wrong: string[]): { options: string[]; answer: number } {
  const options = shuffle(rng, [right, ...wrong.slice(0, 3)]);
  return { options, answer: options.indexOf(right) };
}

const GEN: Record<string, Gen> = {
  // Retail and hospitality ───────────────────────────────────────────────────
  change(rng) {
    const price = randInt(rng, 105, 4790);
    const paid = [500, 1000, 2000, 5000].find((n) => n > price)!;
    return {
      kind: "change",
      skill: "cash-handling",
      title: "Give the right change",
      prompt: `The total is ${money(price)}. The customer hands you ${money(paid)}. How much change do you give?`,
      answer: (paid - price) / 100,
      numeric: { prefix: "£", tolerance: 0.001 },
      explain: `${money(paid)} − ${money(price)} = ${money(paid - price)}. Count it back up from the price to the amount paid to double-check.`,
    };
  },
  basket(rng) {
    const items = shuffle(rng, [
      ["Milk", 135], ["Bread", 140], ["Eggs (6)", 210], ["Apples", 180], ["Pasta", 95], ["Cheese", 325], ["Rice", 160], ["Tea bags", 250],
    ] as [string, number][]).slice(0, 3);
    const qty = items.map(() => randInt(rng, 1, 3));
    const sub = items.reduce((s, [, p], i) => s + p * qty[i], 0);
    const off = pick(rng, [10, 20, 25]);
    const total = Math.round(sub * (1 - off / 100));
    return {
      kind: "basket",
      skill: "numeracy",
      title: "Ring up a basket with a discount",
      prompt: `Scan the basket and apply the ${off}% staff discount to the whole shop. What is the total to pay?`,
      doc: { type: "table", rows: [["Item", "Qty", "Each"], ...items.map(([n, p], i) => [n, String(qty[i]), money(p)])] },
      answer: total / 100,
      numeric: { prefix: "£", tolerance: 0.011 },
      explain: `Subtotal ${money(sub)}. ${off}% off means paying ${100 - off}%: ${money(sub)} × ${(100 - off) / 100} = ${money(total)} (to the nearest penny).`,
    };
  },
  pizzaOrder(rng) {
    const size = pick(rng, ["Small", "Medium", "Large"]);
    const base = pick(rng, ["classic", "thin", "gluten-free"]);
    const top = pick(rng, ["Margherita", "Pepperoni", "Veggie Supreme", "BBQ Chicken"]);
    const extra = pick(rng, ["extra basil", "extra cheese", "jalapeños", "olives"]);
    const minus = pick(rng, ["no garlic", "no onions", "no mushrooms"]);
    const right = `${size}, ${base} base, ${top}, add ${extra}, ${minus}`;
    const other = (s: string, b: string, e: string, m: string) => `${s}, ${b} base, ${top}, add ${e}, ${m}`;
    const sizes = ["Small", "Medium", "Large"].filter((s) => s !== size);
    const bases = ["classic", "thin", "gluten-free"].filter((b) => b !== base);
    const { options, answer } = mc(rng, right, [
      other(sizes[0], base, extra, minus),
      other(size, bases[0], extra, minus),
      other(size, base, extra, minus.replace("no ", "extra ")),
    ]);
    return {
      kind: "pizzaOrder",
      skill: "order-accuracy",
      title: "Make the order exactly as written",
      prompt: "Read the ticket carefully. Which pizza matches it?",
      doc: { type: "ticket", text: `TABLE ${randInt(rng, 1, 24)}\n1 × ${size.toUpperCase()} ${top.toUpperCase()}\nBase: ${base}\n+ ${extra}\n${minus.toUpperCase()}${base === "gluten-free" ? "\n!! ALLERGY: COELIAC !!" : ""}` },
      options,
      answer,
      explain:
        base === "gluten-free"
          ? "Size, base, extras and removals all have to match. A coeliac order also needs a clean board and utensils so gluten doesn't cross-contaminate it."
          : "Check every line of the ticket: size, base, extras and anything to leave off. Removals are where most mistakes happen.",
    };
  },
  foodSafety(rng) {
    const q = pick(rng, [
      ["What is the highest temperature a fridge should be at to keep food safe in the UK?", "8°C (aim for 5°C or below)", ["12°C", "15°C", "0°C exactly"], "UK law says chilled food must be kept at 8°C or below; most kitchens aim for 5°C or colder to be safe."],
      ["Cooked chicken should reach a core temperature of at least…", "75°C", ["50°C", "60°C", "40°C"], "Hot food should reach 75°C in the centre (or 70°C for 2 minutes) to kill harmful bacteria."],
      ["How many allergens must UK food businesses tell customers about?", "14", ["4", "9", "21"], "The 14 named allergens include milk, eggs, peanuts, tree nuts, gluten (cereals), fish, crustaceans, molluscs, soya, sesame, celery, mustard, lupin and sulphites."],
      ["A customer says they have a nut allergy. What should you do?", "Check the allergen info, tell the kitchen and the manager, and use clean equipment", ["Pick the nuts off before serving", "Say everything is probably fine", "Refuse to serve them without checking"], "Never guess with allergens. Check the allergen matrix, flag the order clearly and avoid cross-contact."],
      ["Raw meat should be stored in the fridge…", "On the bottom shelf, below ready-to-eat food", ["On the top shelf", "Next to salad", "Anywhere, if covered"], "Raw meat goes at the bottom so juices can't drip onto food that won't be cooked again."],
    ] as [string, string, string[], string][]);
    const { options, answer } = mc(rng, q[1], q[2]);
    return { kind: "foodSafety", skill: "food-safety", title: "Food safety check", prompt: q[0], options, answer, explain: q[3] };
  },
  stock(rng) {
    const daily = randInt(rng, 8, 40);
    const lead = randInt(rng, 2, 6);
    const safety = randInt(rng, 10, 40);
    const rop = daily * lead + safety;
    return {
      kind: "stock",
      skill: "stock-control",
      title: "Set the reorder point",
      prompt: `You sell about ${daily} packs a day. Deliveries take ${lead} days to arrive and you keep ${safety} packs as safety stock. At what stock level should you reorder?`,
      answer: rop,
      numeric: { unit: "packs", tolerance: 0 },
      explain: `Reorder point = daily sales × lead time + safety stock = ${daily} × ${lead} + ${safety} = ${rop}.`,
    };
  },
  // Office, reception and admin ──────────────────────────────────────────────
  inbox(rng) {
    const msgs = shuffle(rng, [
      ["Server down: customers can't log in (CEO copied)", 0],
      ["Client meeting moved to 2pm today, please confirm", 1],
      ["New coffee machine arriving next week", 3],
      ["Invoice due Friday, can you check the amount?", 2],
    ] as [string, number][]);
    const top = msgs.findIndex(([, p]) => p === 0);
    return {
      kind: "inbox",
      skill: "prioritisation",
      title: "Triage the inbox",
      prompt: "You've just logged on. Which message do you deal with first?",
      options: msgs.map(([m]) => m),
      answer: top,
      explain: "Urgent and important first: an outage stopping customers using the service affects everyone right now. Time-bound requests come next, nice-to-know messages last.",
    };
  },
  booking(rng) {
    const busy = new Set<number>();
    const hours = [9, 10, 11, 12, 13, 14, 15, 16];
    while (busy.size < 4) busy.add(pick(rng, hours));
    const lunch = 12;
    busy.add(lunch);
    const needAfter = pick(rng, [10, 11, 13]);
    const free = hours.filter((h) => !busy.has(h) && h >= needAfter);
    if (!free.length) return GEN.inbox(rng);
    const right = `${free[0]}:00`;
    const wrongs = [
      ...[...busy].filter((h) => h !== lunch).map((h) => `${h}:00`),
      ...hours.filter((h) => !busy.has(h) && h < needAfter).map((h) => `${h}:00`),
      `${lunch}:00`,
    ];
    const { options, answer } = mc(rng, right, shuffle(rng, wrongs));
    return {
      kind: "booking",
      skill: "scheduling",
      title: "Book the earliest slot",
      prompt: `A client wants the earliest one-hour appointment with Dr Patel, but not before ${needAfter}:00. The diary shows the booked hours below (12:00 is lunch). Which slot do you offer?`,
      doc: { type: "table", rows: [["Time", "Dr Patel"], ...hours.map((h) => [`${h}:00`, h === lunch ? "Lunch" : busy.has(h) ? "Booked" : "Free"])] },
      options,
      answer,
      explain: `The earliest free hour at or after ${needAfter}:00 is ${right}. Always check the client's constraint and the diary together before offering a time.`,
    };
  },
  email(rng) {
    const q = pick(rng, [
      [
        "A customer emails angrily: their order arrived late and damaged. Which reply is most professional?",
        "Dear Ms Green, I'm sorry your order arrived late and damaged. I've arranged a free replacement for delivery tomorrow and refunded your postage. Kind regards, Sam",
        ["hey sorry about that lol, not our fault the courier was late", "Dear Customer, Please read our terms and conditions. Regards", "Dear Ms Green, we'll look into it at some point. Thanks"],
        "Good service emails apologise, say exactly what you've done to fix it and when, and stay polite and specific.",
      ],
      [
        "Your manager asks for a quick update on a report that isn't finished. Best reply?",
        "Hi Priya, the report is 80% done: data and charts are finished, the summary is left. I'll send it by 3pm today. Sam",
        ["It's not done yet.", "Hi, been really busy, will try to get to it", "Hi Priya, sorry, sorry, sorry, I know it's late!!"],
        "A good update gives progress, what's left and a clear deadline you can keep.",
      ],
    ] as [string, string, string[], string][]);
    const { options, answer } = mc(rng, q[1], q[2]);
    return { kind: "email", skill: "written-communication", title: "Write the right reply", prompt: q[0], options, answer, explain: q[3] };
  },
  gdpr(rng) {
    const q = pick(rng, [
      ["Someone rings saying they're a patient's cousin and asks what ward she's on. What do you do?", "Don't confirm anything; explain you can't share patient information and offer to pass a message on", ["Tell them, it's family", "Give the ward but not the bed number", "Ask them to email and then send the details"], "Personal and health data can only be shared with the patient's consent or a lawful reason. Confirming someone is even a patient is a disclosure."],
      ["You find a printed list of customer phone numbers left on the printer. Best action?", "Return it securely to its owner or shred it, and report it if your policy says so", ["Bin it in the normal recycling", "Leave it for whoever printed it", "Pin it on the noticeboard so the owner sees it"], "Paper personal data needs protecting too. Secure disposal (shredding) and reporting near-misses is good practice under UK GDPR."],
      ["A colleague asks you to email them a spreadsheet of customer data to their personal Gmail to work from home. What do you do?", "Refuse politely and suggest the approved secure system instead", ["Send it, they're a colleague", "Send it with a password in the same email", "Send only half of it"], "Personal data should only go through approved, secure systems. Personal email accounts are not under the company's control."],
    ] as [string, string, string[], string][]);
    const { options, answer } = mc(rng, q[1], q[2]);
    return { kind: "gdpr", skill: "data-protection", title: "Protect personal data", prompt: q[0], options, answer, explain: q[3] };
  },
  // Technology ───────────────────────────────────────────────────────────────
  bugfix(rng) {
    const n = randInt(rng, 3, 6);
    const bugs = [
      {
        code: `function sumTo(n) {\n  let total = 0;\n  for (let i = 1; i < n; i++) {\n    total += i;\n  }\n  return total;\n}\n\n// Test: sumTo(${n}) should be ${(n * (n + 1)) / 2}`,
        right: "Line 3: change  i < n  to  i <= n",
        wrong: ["Line 2: start total at 1", "Line 4: change  +=  to  =", "Line 6: return total + 1"],
        why: `The loop stops one early (an off-by-one error), so it misses ${n}. Using i <= n includes the last number.`,
      },
      {
        code: `function isAdult(age) {\n  if (age > 18) {\n    return true;\n  }\n  return false;\n}\n\n// Test: isAdult(18) should be true`,
        right: "Line 2: change  age > 18  to  age >= 18",
        wrong: ["Line 3: return false", "Line 5: return true", "Line 2: change 18 to 17.5"],
        why: "18 itself counts as adult, so the comparison needs to include it (>=). Boundary values are where bugs hide; always test them.",
      },
      {
        code: `function average(nums) {\n  let total = 0;\n  for (const x of nums) total += x;\n  total / nums.length;\n}\n\n// Test: average([2, 4, 6]) should be 4`,
        right: "Line 4: add  return  before  total / nums.length",
        wrong: ["Line 2: start total at nums[0]", "Line 3: use  total = x", "Line 4: divide by 2"],
        why: "The function calculates the average but never returns it, so it returns undefined. Every path needs a return value.",
      },
      {
        code: `def count_vowels(word):\n    count = 0\n    for ch in word:\n        if ch in "aeiou":\n            count += 1\n    return count\n\n# Test: count_vowels("APPLE") should be 2`,
        right: "Line 3: loop over  word.lower()  instead of  word",
        wrong: ["Line 2: start count at 2", "Line 4: use  ==  instead of  in", "Line 6: return count + 2"],
        why: "Uppercase letters aren't in \"aeiou\". Normalising the input (lower-casing it) makes the check case-insensitive.",
      },
    ];
    const b = pick(rng, bugs);
    const { options, answer } = mc(rng, b.right, b.wrong);
    return {
      kind: "bugfix",
      skill: "debugging",
      title: "Fix the failing test",
      prompt: "A test is failing in production code. Which change fixes it?",
      doc: { type: "code", lang: b.code.includes("def ") ? "python" : "javascript", text: b.code },
      options,
      answer,
      explain: b.why,
    };
  },
  trace(rng) {
    const a = randInt(rng, 2, 5);
    const loops = randInt(rng, 3, 5);
    let x = a;
    for (let i = 0; i < loops; i++) x = x % 2 === 0 ? x / 2 + 3 : x * 2;
    return {
      kind: "trace",
      skill: "programming",
      title: "Trace the code",
      prompt: "What does this program print?",
      doc: { type: "code", lang: "javascript", text: `let x = ${a};\nfor (let i = 0; i < ${loops}; i++) {\n  if (x % 2 === 0) {\n    x = x / 2 + 3;\n  } else {\n    x = x * 2;\n  }\n}\nconsole.log(x);` },
      answer: x,
      numeric: { tolerance: 0 },
      explain: "Trace it line by line, writing down x after each loop. Even numbers halve then add 3; odd numbers double.",
    };
  },
  sql(rng) {
    const city = pick(rng, ["London", "Leeds", "Bristol"]);
    const right = `SELECT name FROM customers WHERE city = '${city}' ORDER BY name;`;
    const { options, answer } = mc(rng, right, [
      `SELECT * FROM customers ORDER BY city;`,
      `SELECT name FROM customers WHERE city != '${city}';`,
      `SELECT city FROM customers WHERE name = '${city}';`,
    ]);
    return {
      kind: "sql",
      skill: "sql",
      title: "Write the query",
      prompt: `Marketing needs the names of every customer in ${city}, in alphabetical order. Which query returns exactly that?`,
      doc: { type: "table", rows: [["customers"], ["id", "name", "city", "joined"]] },
      options,
      answer,
      explain: "SELECT picks the columns, WHERE filters the rows and ORDER BY sorts them. Asking for only the columns you need is good practice.",
    };
  },
  itTicket(rng) {
    const q = pick(rng, [
      ["A user says their computer can't reach any websites. What do you check first?", "Whether it's connected to the network (cable or Wi-Fi) and if other devices work", ["Reinstall the operating system", "Replace the keyboard", "Order a new laptop"], "Start with the simplest, most likely cause and work up: connection first, then settings, then hardware."],
      ["An email says: \"Your account will be closed in 1 hour, log in here: bit.ly/acc-fix\". What is it most likely to be?", "A phishing email: report it and don't click the link", ["A genuine IT notice", "A newsletter", "A calendar invite"], "Urgency, threats and shortened links are classic phishing signs. Report it through the proper channel."],
      ["Which password is strongest?", "Three random words with a number: Kettle-Orbit-Lantern-42", ["Password123", "your pet's name", "qwerty"], "Long passphrases of random words are strong and memorable. The UK's National Cyber Security Centre recommends three random words."],
    ] as [string, string, string[], string][]);
    const { options, answer } = mc(rng, q[1], q[2]);
    return { kind: "itTicket", skill: q[0].includes("password") || q[0].includes("email") ? "cyber-security" : "it-support", title: "Solve the support ticket", prompt: q[0], options, answer, explain: q[3] };
  },
  // Finance ──────────────────────────────────────────────────────────────────
  interest(rng) {
    const p = pick(rng, [1000, 2000, 5000, 2500]);
    const r = pick(rng, [2, 3, 4, 5]);
    const y = pick(rng, [2, 3]);
    const v = Math.round(p * (1 + r / 100) ** y * 100) / 100;
    return {
      kind: "interest",
      skill: "finance",
      title: "Calculate compound interest",
      prompt: `A customer saves £${p} at ${r}% interest a year, compounded yearly. How much is in the account after ${y} years (to the nearest penny)?`,
      answer: v,
      numeric: { prefix: "£", tolerance: 0.011 },
      explain: `Compound interest: £${p} × (1 + ${r / 100})^${y} = £${v.toFixed(2)}. Interest is earned on previous interest, not just the original amount.`,
    };
  },
  fraud(rng) {
    const normal = ["Tesco, Brixton £23.40", "Rent: standing order £850.00", "Coffee shop £3.10", "Netflix subscription £10.99", "Petrol £45.00"];
    const odd = pick(rng, ["Electronics, Lagos £1,950.00 at 03:12", "Gift cards ×6 £600.00 online, new device", "Crypto exchange £2,400.00, new payee"]);
    const list = shuffle(rng, [...shuffle(rng, normal).slice(0, 3), odd]);
    return {
      kind: "fraud",
      skill: "fraud-awareness",
      title: "Spot the suspicious payment",
      prompt: "This customer usually spends locally on everyday things. Which payment should be flagged and checked with them?",
      options: list,
      answer: list.indexOf(odd),
      explain: "Fraud often looks unusual for that customer: a big amount, a new device or payee, an odd time or place, or gift cards and crypto that are hard to trace.",
    };
  },
  // Health ───────────────────────────────────────────────────────────────────
  triage(rng) {
    const pts = shuffle(rng, [
      ["Chest pain spreading to the left arm, sweating", 0],
      ["Sprained ankle, walking with a limp", 2],
      ["Cough for three days, otherwise well", 3],
      ["Deep cut on hand, bleeding controlled", 1],
    ] as [string, number][]);
    return {
      kind: "triage",
      skill: "triage",
      title: "Who is seen first?",
      prompt: "Four people arrive at reception. Who should the clinical team see first?",
      options: pts.map(([p]) => p),
      answer: pts.findIndex(([, r]) => r === 0),
      explain: "Chest pain spreading to the arm with sweating can mean a heart attack, a life-threatening emergency. Triage puts the most time-critical risk first, not who arrived first. (Receptionists flag; clinicians decide.)",
    };
  },
  vitals(rng) {
    const q = pick(rng, [
      ["An adult's resting heart rate is 72 beats per minute. Is that…", "Normal (60–100 bpm)", ["Dangerously high", "Dangerously low", "Impossible"], "A normal adult resting heart rate is about 60–100 beats per minute."],
      ["An adult's temperature is 39.2°C. That is…", "A high temperature (fever): report it", ["Normal", "Low", "Normal after exercise only"], "Normal is about 36.1–37.2°C. 38°C and above is a high temperature."],
      ["Oxygen saturation (SpO₂) reads 88% in a healthy adult. What should you do?", "Report it straight away: normal is about 94–98%", ["Nothing, it's normal", "Wait an hour and recheck", "Ask them to hold their breath"], "Below about 94% in a healthy adult is low and should be escalated to a nurse or doctor."],
    ] as [string, string, string[], string][]);
    const { options, answer } = mc(rng, q[1], q[2]);
    return { kind: "vitals", skill: "clinical-observations", title: "Check the observations", prompt: q[0], options, answer, explain: q[3] };
  },
  reception(rng) {
    const q = pick(rng, [
      ["A visitor arrives for a 10am meeting with the director, who's running late. What do you do?", "Greet them, offer a seat and a drink, let the director know, and give the visitor a realistic wait time", ["Tell them to come back later", "Leave them standing until the director appears", "Send them up to find the director"], "First impressions matter: welcome, inform both sides and manage expectations honestly."],
      ["The phone rings while you're helping someone at the desk. Best approach?", "Ask the person at the desk to excuse you a moment, answer politely and take a message or call back", ["Ignore the phone", "Leave the visitor mid-sentence for a long call", "Pick up and put it straight down"], "Balance both: acknowledge the person in front of you, answer professionally and don't leave anyone hanging."],
    ] as [string, string, string[], string][]);
    const { options, answer } = mc(rng, q[1], q[2]);
    return { kind: "reception", skill: "customer-service", title: "Front desk", prompt: q[0], options, answer, explain: q[3] };
  },
  // Law ──────────────────────────────────────────────────────────────────────
  clause(rng) {
    const q = pick(rng, [
      ["Which clause in this tenancy agreement would be unfair or unlawful?", "\"The landlord may enter the flat at any time without notice.\"", ["\"Rent is due on the 1st of each month.\"", "\"The deposit will be protected in a government scheme.\"", "\"Either party may end the tenancy with notice as the law requires.\""], "Tenants have a right to quiet enjoyment; landlords normally need to give at least 24 hours' notice to visit, except in an emergency."],
      ["In a contract, what does \"force majeure\" cover?", "Events outside anyone's control (like natural disasters) that stop a party performing", ["Paying in instalments", "The price of the contract", "Who signs the contract"], "A force majeure clause excuses performance when extraordinary events beyond control make it impossible."],
      ["A client signed a contract while 16 for a car. Generally in England, that contract is…", "Usually not enforceable against them (it isn't for \"necessaries\")", ["Fully binding", "Criminal", "Automatically void for everyone"], "Contracts with under-18s are generally not enforceable against the minor, except for necessaries such as food or clothing."],
    ] as [string, string, string[], string][]);
    const { options, answer } = mc(rng, q[1], q[2]);
    return { kind: "clause", skill: "legal-research", title: "Read the contract", prompt: q[0], options, answer, explain: q[3] };
  },
  // Marketing ────────────────────────────────────────────────────────────────
  ctr(rng) {
    const imp = pick(rng, [2000, 4000, 5000, 8000, 10000]);
    const clicks = randInt(rng, 20, 400);
    const ctr = Math.round((clicks / imp) * 10000) / 100;
    return {
      kind: "ctr",
      skill: "marketing-analytics",
      title: "Report the click-through rate",
      prompt: `An ad was shown ${imp.toLocaleString("en-GB")} times and clicked ${clicks} times. What is the click-through rate (to 2 decimal places)?`,
      answer: ctr,
      numeric: { unit: "%", tolerance: 0.011 },
      explain: `CTR = clicks ÷ impressions × 100 = ${clicks} ÷ ${imp} × 100 = ${ctr}%.`,
    };
  },
  headline(rng) {
    const q = pick(rng, [
      ["You're advertising a revision app to Year 11 students. Which headline is best?", "Smash your GCSEs: 10-minute revision that actually sticks", ["Synergistic pedagogical optimisation platform", "Buy now!!!", "Our company was founded in 1998"], "Speak to the audience's goal in their language, keep it short and show the benefit."],
      ["A post for busy parents about a meal kit. Which is best?", "Dinner in 20 minutes, no planning needed", ["We have a large warehouse", "Click here", "Food items available for purchase"], "Lead with the benefit that solves the audience's problem (time)."],
    ] as [string, string, string[], string][]);
    const { options, answer } = mc(rng, q[1], q[2]);
    return { kind: "headline", skill: "copywriting", title: "Pick the headline", prompt: q[0], options, answer, explain: q[3] };
  },
};
export type TaskKind = keyof typeof GEN | string;

// ── Workplaces and roles ────────────────────────────────────────────────────
export interface Role {
  id: string;
  title: string;
  rank: 1 | 2 | 3;
  /** Clout per full-marks shift. */
  pay: number;
  tasks: string[];
  /** Outfit while on duty. */
  uniform: Partial<Avatar>;
  /** What the job involves (shown in the job centre and on the CV). */
  summary: string;
}

export interface Workplace {
  id: string;
  name: string;
  /** Parody company id (logo) or null for our own businesses. */
  companyId: string | null;
  sector: string;
  accent: string;
  roles: Role[];
}

const ladder = (base: number) => [base, Math.round(base * 1.5), Math.round(base * 2.2)];

export const WORKPLACES: Workplace[] = [
  {
    id: "pizzazz",
    name: "Pizzazz Pizza",
    companyId: null,
    sector: "Hospitality",
    accent: "#ff7a6b",
    roles: [
      { id: "crew", title: "Pizza Maker & Delivery Assistant", rank: 1, pay: 60, tasks: ["pizzaOrder", "change", "foodSafety", "pizzaOrder", "reception"], uniform: { top: "top-apron", hat: "hat-cap" }, summary: "Take orders, make pizzas exactly to ticket, handle cash and follow food safety and allergen rules." },
      { id: "shift-lead", title: "Shift Leader", rank: 2, pay: 90, tasks: ["foodSafety", "stock", "pizzaOrder", "basket", "email"], uniform: { top: "top-apron", hat: "hat-chef" }, summary: "Run the shift: stock levels, food safety checks, complaints and the till." },
      { id: "manager", title: "Restaurant Manager", rank: 3, pay: 135, tasks: ["stock", "email", "inbox", "foodSafety", "basket"], uniform: { top: "top-suit", held: "held-briefcase" }, summary: "Manage the restaurant: ordering, rotas, standards and customer issues." },
    ],
  },
  {
    id: "goggle",
    name: "Google",
    companyId: "goggle",
    sector: "Technology",
    accent: "#6bc6ff",
    roles: [
      { id: "junior-dev", title: "Junior Developer", rank: 1, pay: 80, tasks: ["trace", "bugfix", "sql", "bugfix", "trace"], uniform: { top: "top-hoodie", held: "held-laptop" }, summary: "Fix bugs, read and trace code, and write SQL queries for the product team." },
      { id: "developer", title: "Software Developer", rank: 2, pay: 120, tasks: ["bugfix", "sql", "trace", "itTicket", "bugfix"], uniform: { top: "top-hoodie", held: "held-laptop", face: "face-round" }, summary: "Own features end to end: debugging, data queries and security basics." },
      { id: "eng-manager", title: "Engineering Manager", rank: 3, pay: 175, tasks: ["inbox", "bugfix", "email", "sql", "itTicket"], uniform: { top: "top-suit", held: "held-laptop" }, summary: "Prioritise the team's work, review code and communicate with stakeholders." },
    ],
  },
  {
    id: "macrosoft",
    name: "Microsoft",
    companyId: "macrosoft",
    sector: "IT",
    accent: "#5fd3a5",
    roles: [
      { id: "it-tech", title: "IT Support Technician", rank: 1, pay: 70, tasks: ["itTicket", "itTicket", "inbox", "trace", "gdpr"], uniform: { top: "top-polo", held: "held-laptop" }, summary: "Solve support tickets, spot phishing and keep people's data safe." },
      { id: "sysadmin", title: "Systems Administrator", rank: 2, pay: 105, tasks: ["itTicket", "sql", "gdpr", "trace", "inbox"], uniform: { top: "top-polo", held: "held-laptop", face: "face-round" }, summary: "Keep systems running and secure: troubleshooting, data and access." },
      { id: "it-manager", title: "IT Manager", rank: 3, pay: 160, tasks: ["inbox", "gdpr", "email", "itTicket", "sql"], uniform: { top: "top-suit" }, summary: "Lead IT support: priorities, policy and communication." },
    ],
  },
  {
    id: "barklays",
    name: "Barclays",
    companyId: "barklays",
    sector: "Finance",
    accent: "#ffd166",
    roles: [
      { id: "teller", title: "Bank Cashier", rank: 1, pay: 70, tasks: ["change", "fraud", "interest", "reception", "gdpr"], uniform: { top: "top-polo" }, summary: "Serve customers, handle cash accurately, spot fraud and explain savings." },
      { id: "analyst", title: "Financial Analyst", rank: 2, pay: 110, tasks: ["interest", "fraud", "sql", "interest", "email"], uniform: { top: "top-suit", held: "held-briefcase" }, summary: "Analyse accounts and transactions and report clearly." },
      { id: "branch-manager", title: "Branch Manager", rank: 3, pay: 165, tasks: ["inbox", "fraud", "email", "gdpr", "interest"], uniform: { top: "top-suit", held: "held-briefcase", face: "face-monocle" }, summary: "Run the branch: risk, staff priorities and customer complaints." },
    ],
  },
  {
    id: "st-plasters",
    name: "St Plaster's Hospital",
    companyId: "st-plasters",
    sector: "Health",
    accent: "#ff7a6b",
    roles: [
      { id: "receptionist", title: "Hospital Receptionist", rank: 1, pay: 65, tasks: ["reception", "booking", "gdpr", "triage", "inbox"], uniform: { top: "top-polo" }, summary: "Welcome patients, book appointments, protect confidentiality and flag urgent cases." },
      { id: "hca", title: "Healthcare Assistant", rank: 2, pay: 95, tasks: ["vitals", "triage", "gdpr", "vitals", "reception"], uniform: { top: "top-labcoat" }, summary: "Take observations, recognise warning signs and escalate to nurses." },
      { id: "ward-manager", title: "Ward Manager", rank: 3, pay: 150, tasks: ["triage", "inbox", "email", "vitals", "gdpr"], uniform: { top: "top-labcoat", held: "held-briefcase" }, summary: "Lead the ward: priorities, safety and communication with families." },
    ],
  },
  {
    id: "tescow",
    name: "Tesco",
    companyId: "tescow",
    sector: "Retail",
    accent: "#ff8fd1",
    roles: [
      { id: "cashier", title: "Customer Assistant & Shelf Stacker", rank: 1, pay: 60, tasks: ["basket", "change", "reception", "foodSafety", "basket"], uniform: { top: "top-polo", hat: "hat-cap" }, summary: "Serve customers at the till, apply offers and keep food safe." },
      { id: "stock-controller", title: "Stock Controller", rank: 2, pay: 90, tasks: ["stock", "basket", "stock", "foodSafety", "inbox"], uniform: { top: "top-hivis" }, summary: "Plan reorders, manage waste and keep shelves full." },
      { id: "store-manager", title: "Store Manager", rank: 3, pay: 140, tasks: ["inbox", "stock", "email", "basket", "gdpr"], uniform: { top: "top-suit" }, summary: "Run the store: stock, team priorities and customer service." },
    ],
  },
  {
    id: "lawz",
    name: "Lawz & Order LLP",
    companyId: "lawz",
    sector: "Law",
    accent: "#8fb4ff",
    roles: [
      { id: "legal-admin", title: "Legal Receptionist", rank: 1, pay: 70, tasks: ["reception", "booking", "gdpr", "clause", "email"], uniform: { top: "top-suit" }, summary: "Greet clients, manage the diary and handle confidential information." },
      { id: "paralegal", title: "Paralegal", rank: 2, pay: 110, tasks: ["clause", "clause", "gdpr", "email", "inbox"], uniform: { top: "top-suit", held: "held-briefcase" }, summary: "Review contracts, research legal points and draft letters." },
      { id: "practice-manager", title: "Practice Manager", rank: 3, pay: 165, tasks: ["inbox", "clause", "email", "gdpr", "booking"], uniform: { top: "top-suit", held: "held-briefcase", face: "face-monocle" }, summary: "Manage the practice: priorities, compliance and client care." },
    ],
  },
  {
    id: "netflics",
    name: "Netflix",
    companyId: "netflics",
    sector: "Media",
    accent: "#ff7a6b",
    roles: [
      { id: "social-assistant", title: "Social Media Assistant", rank: 1, pay: 65, tasks: ["headline", "ctr", "email", "headline", "gdpr"], uniform: { top: "top-denim", held: "held-phone" }, summary: "Write posts for the audience, track results and reply to comments." },
      { id: "marketing-exec", title: "Marketing Executive", rank: 2, pay: 100, tasks: ["ctr", "headline", "sql", "email", "ctr"], uniform: { top: "top-denim", held: "held-phone", face: "face-shades" }, summary: "Run campaigns and report on what's working with data." },
      { id: "marketing-manager", title: "Marketing Manager", rank: 3, pay: 155, tasks: ["inbox", "ctr", "headline", "email", "gdpr"], uniform: { top: "top-suit", held: "held-phone" }, summary: "Set the strategy, budget priorities and brand voice." },
    ],
  },
];
// Pay ladders are kept honest: each rank pays more, managers most.
for (const w of WORKPLACES) {
  const [a, b, c] = ladder(w.roles[0].pay);
  w.roles[1].pay = Math.max(w.roles[1].pay, b);
  w.roles[2].pay = Math.max(w.roles[2].pay, c);
  void a;
}

export const workplaceById = (id: string) => WORKPLACES.find((w) => w.id === id) ?? null;
export const roleOf = (workplace: string, role: string) => workplaceById(workplace)?.roles.find((r) => r.id === role) ?? null;

// ── Shifts ──────────────────────────────────────────────────────────────────
export const SHIFT_TASKS = 5;

export function buildShift(role: Role, seed: number): Task[] {
  const rng = createRng(seed);
  return role.tasks.slice(0, SHIFT_TASKS).map((k, i) => {
    const base = (GEN[k] ?? GEN.inbox)(rng);
    const task = i % 2 === 0 || role.rank > 1 ? knowledgeTask(base, role.rank, rng) : base;
    if (task.options) {
      const options = shuffle(rng, task.options.map((text, index) => ({text, correct:index === task.answer})));
      task.options = options.map(option => option.text);
      task.answer = options.findIndex(option => option.correct);
    }
    return {...task, lesson:{text:task.explain,...(task.skill === "sql" ? {videoId:"_a4k3ssyY5E"} : {})}};
  });
}

function knowledgeTask(base: Task, rank: number, rng: Rng): Task {
  const n = randInt(rng, 4, 12) * rank;
  const numeric = (title: string, prompt: string, answer: number, explain: string): Task => ({kind:base.kind,skill:base.skill,title,prompt,answer,numeric:{tolerance:0.01},explain});
  if (base.skill === "stock-control") return numeric("Plan for lead time", `Daily demand is ${n} units. Delivery takes 3 days. Keep ${n*2} units as safety stock. There are ${n*2} usable units and ${n} confirmed incoming units. How many additional units must you order?`, n*2, "Target stock = daily demand × lead time + safety stock. Subtract usable stock and confirmed incoming stock. Do not count incoming stock twice.");
  if (base.skill === "marketing-analytics") return numeric("Campaign efficiency", `A campaign has ${n*1000} impressions, ${n*40} clicks and costs £${n*20}. What is its cost per click in pounds?`, 0.5, "Cost per click = total spend divided by clicks. Impressions measure reach; use clicks as the denominator for cost per click.");
  if (["numeracy","cash-handling","finance","order-accuracy"].includes(base.skill)) return numeric("Reconcile an invoice", `Order ${n} items at £12 each. Apply a 15% discount to the goods, then add £18 delivery. No tax applies in this simulation. What is the final total in pounds?`, Number((n*12*.85+18).toFixed(2)), "Calculate quantity × unit price, multiply by 0.85, then add delivery. A goods-only discount does not reduce delivery charges.");
  if (["programming","debugging"].includes(base.skill)) return {...base,title:"Review a boundary condition",prompt:`Count values greater than or equal to ${n}. Which change fixes this code?`,doc:{type:"code",text:`const values = [${n-1}, ${n}, ${n+1}];\nconst count = values.filter(v => v > ${n}).length;`},numeric:undefined,options:[`Use v >= ${n}`,`Use v === ${n}`,`Use v < ${n}`,"Remove the filter"],answer:0,explain:"An inclusive lower boundary uses >=. Test below, exactly at, and above the boundary. Exactly two values should pass here."};
  if (base.skill === "sql") return {...base,title:"Aggregate the right records",prompt:`Which query returns customers whose completed orders total more than £${n*100}?`,doc:undefined,numeric:undefined,options:[`SELECT customer_id FROM orders WHERE status = 'completed' GROUP BY customer_id HAVING SUM(amount) > ${n*100}`,`SELECT customer_id FROM orders WHERE amount > ${n*100}`,"SELECT customer_id FROM orders GROUP BY amount","SELECT customer_id FROM orders WHERE status = 'cancelled'"],answer:0,explain:"WHERE filters rows before aggregation. GROUP BY collects each customer's rows. HAVING filters the grouped SUM; checking individual amounts misses customers with several smaller orders."};
  if (["scheduling","prioritisation"].includes(base.skill)) return {...base,title:"Resolve competing constraints",prompt:"A 45-minute task needs a colleague and a room. The colleague is free 09:15–10:15; the room is free 09:30–10:30. Setup needs the room for 10 minutes before the task. Which plan works?",doc:undefined,numeric:undefined,options:["Setup 09:30; task 09:40–10:25","Setup 09:20; task 09:30–10:15","No plan fits; request another slot","Task 09:30–10:15; setup afterwards"],answer:2,explain:"Include setup in room availability. The earliest legal task start is 09:40; it ends at 10:25 after the colleague leaves. Request a new slot instead of breaking a constraint."};
  return base;
}

export function checkAnswer(task: Task, value: number | string): boolean {
  if (task.numeric) {
    const v = typeof value === "string" ? Number(value.replace(/[£,%\s]/g, "")) : value;
    return Number.isFinite(v) && Math.abs(v - task.answer) <= task.numeric.tolerance + 1e-9;
  }
  return Number(value) === task.answer;
}

/** Pay for a shift (the server recomputes this with the same rule). */
export function shiftPay(role: Role, correct: number, total = SHIFT_TASKS) {
  const score = total ? correct / total : 0;
  if (score < 0.4) return Math.round(role.pay * 0.25); // turned up, struggled
  return Math.round(role.pay * (score >= 1 ? 1.2 : score));
}

/** Shifts and average needed to be offered the next rank. */
export const PROMOTION = { 2: { shifts: 5, avg: 0.7 }, 3: { shifts: 12, avg: 0.8 } } as const;

export function canPromote(rank: number, shifts: number, avg: number) {
  const next = PROMOTION[(rank + 1) as 2 | 3];
  return !!next && shifts >= next.shifts && avg >= next.avg;
}

// ── Interviews ──────────────────────────────────────────────────────────────
const BEHAVIOURAL: [string, string, string[], string][] = [
  [
    "\"Tell me about a time you dealt with a problem.\" Which answer is strongest?",
    "\"Our group project was behind (situation). I was asked to get it back on track (task), so I split the work and set daily check-ins (action). We handed in on time and got a B (result).\"",
    ["\"I'm a problem solver, I don't really have problems.\"", "\"Something went wrong once but it wasn't my fault.\"", "\"I'd probably ask someone else.\""],
    "Use STAR: Situation, Task, Action, Result. Be specific about what you did and what happened.",
  ],
  [
    "\"Why do you want to work here?\" Which answer is strongest?",
    "\"I want to build my customer service skills, and I like that you train staff and promote from within.\"",
    ["\"I need money.\"", "\"My friend works here.\"", "\"I don't know, it's a job.\""],
    "Show you've thought about the role: what you'll learn and why this employer.",
  ],
  [
    "\"What's your biggest weakness?\" Which answer is strongest?",
    "\"I used to say yes to everything and get overloaded, so now I use a to-do list and agree deadlines before taking things on.\"",
    ["\"I'm a perfectionist.\"", "\"I don't have any.\"", "\"I'm always late.\""],
    "Be honest about a real weakness and show what you're doing to improve it.",
  ],
];

export function buildInterview(role: Role, seed: number): Task[] {
  const rng = createRng(seed);
  const b = pick(rng, BEHAVIOURAL);
  const { options, answer } = mc(rng, b[1], b[2]);
  const q1: Task = { kind: "interview", skill: "written-communication", title: "Interview question", prompt: b[0], options, answer, explain: b[3] };
  const job = role.tasks.map((k) => (GEN[k] ?? GEN.inbox)(rng));
  return [q1, job[0], job[2]];
}

export const INTERVIEW_PASS = 2;

// ── CV wording ──────────────────────────────────────────────────────────────
export interface CareerRecord {
  workplace: string;
  role: string;
  shifts: number;
  correct: number;
  total: number;
  startedOn: string;
}

/** Honest CV lines: simulated, specific, measurable. */
export function cvLines(records: CareerRecord[], skills: Record<string, { correct: number; total: number }>) {
  const lines: string[] = [];
  for (const r of records) {
    const w = workplaceById(r.workplace);
    const role = roleOf(r.workplace, r.role);
    if (!w || !role || r.shifts < 1) continue;
    const acc = r.total ? Math.round((r.correct / r.total) * 100) : 0;
    lines.push(
      `${role.title}, ${w.name} (simulated work experience on IlluminatED, from ${r.startedOn}): completed ${r.shifts} shift${r.shifts === 1 ? "" : "s"} of real ${w.sector.toLowerCase()} tasks with ${acc}% accuracy. ${role.summary}`,
    );
  }
  const strong = Object.entries(skills)
    .filter(([, s]) => s.total >= 5 && s.correct / s.total >= 0.7)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([k, s]) => `${SKILLS[k as SkillId] ?? k} (${s.correct}/${s.total} tasks correct)`);
  return { experience: lines, skills: strong };
}

/** Your look on duty: the role's uniform over your own avatar. */
export const uniformFor = (job: { workplace: string; role: string } | null, avatar: Avatar): Avatar => {
  const role = job ? roleOf(job.workplace, job.role) : null;
  return role ? applyUniform(avatar, role.uniform) : avatar;
};
