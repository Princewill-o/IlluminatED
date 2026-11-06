/**
 * Real decisions inside practical-role jobs. A job's steps are mostly hands-on (walk to the
 * spot, do it, timing check); the steps listed here also open a proper task in the tool that
 * job uses: the till, the kitchen ticket rail, a patient monitor, a diagnostic tablet...
 * Tasks reuse the career Task shape so the same card and interfaces render them.
 */
import { type Task, careerTask } from "./careers";
import { type Rng, pick, randInt, shuffle } from "./rng";

type Gen = (rng: Rng) => Task;
const choice = (rng: Rng, right: string, wrong: string[]) => {
  const options = shuffle(rng, [right, ...wrong.slice(0, 3)]);
  return { options, answer: options.indexOf(right) };
};
const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const ROLE_GEN: Record<string, Gen> = {
  mechFault(rng) {
    const f = pick(rng, [
      { sym: "The car pulls to the left and squeals when braking.", read: [["Front-left pads", "1 mm"], ["Front-right pads", "7 mm"], ["Tyre pressures", "32 / 32 psi"]], fix: "Replace the front brake pads (both sides)", wrong: ["Top up the screenwash", "Rotate the tyres", "Replace the battery"] },
      { sym: "It won't start in the morning: the dashboard flickers and the engine clicks.", read: [["Battery voltage", "11.2 V"], ["Alternator output", "14.1 V"], ["Starter motor", "OK"]], fix: "Replace the battery", wrong: ["Replace the alternator", "Change the oil", "Fit new wipers"] },
      { sym: "A tyre keeps going flat overnight.", read: [["Front-right pressure", "18 psi"], ["Tread", "4 mm"], ["Sidewall", "Nail in the tread"]], fix: "Remove the nail and plug the puncture, then re-inflate", wrong: ["Rebalance all four wheels", "Replace the brake discs", "Refill the coolant"] },
      { sym: "The temperature gauge climbs in traffic and there's a sweet smell.", read: [["Coolant level", "Below MIN"], ["Hose clamp", "Loose and wet"], ["Fan", "Working"]], fix: "Tighten the hose clamp and top up the coolant", wrong: ["Replace the battery", "Fit new brake pads", "Add engine oil"] },
    ]);
    const { options, answer } = choice(rng, f.fix, f.wrong);
    return { kind: "mechFault", skill: "vehicle-maintenance", title: "Diagnose the fault", prompt: `Customer: "${f.sym}" Read the diagnostic tablet and choose the repair.`, doc: { type: "table", rows: [["Check", "Reading"], ...f.read] }, options, answer, explain: `The readings point at it: ${f.read.map((r) => `${r[0]} ${r[1]}`).join(", ")}. Fix the cause the readings show, not the first thing you think of.` };
  },
  toolPick(rng) {
    const t = pick(rng, [
      { job: "Undo the wheel nuts", tool: "Wheel brace (or torque wrench to refit)", wrong: ["Screwdriver", "Hammer", "Multimeter"] },
      { job: "Check the battery voltage", tool: "Multimeter", wrong: ["Wheel brace", "Oil filter wrench", "Tyre gauge"] },
      { job: "Tighten wheel nuts to the right tightness", tool: "Torque wrench", wrong: ["Hammer", "Pliers", "Multimeter"] },
      { job: "Measure tyre pressure", tool: "Tyre pressure gauge", wrong: ["Torque wrench", "Multimeter", "Feeler gauge"] },
    ]);
    const { options, answer } = choice(rng, t.tool, t.wrong);
    return { kind: "toolPick", skill: "vehicle-maintenance", title: "Pick the right tool", prompt: `Next job: ${t.job}. Which tool do you take from the chest?`, options, answer, explain: `${t.tool}. The right tool does the job safely without damaging the car.` };
  },
  parcelAddress(rng) {
    const street = pick(rng, ["Orchard Road", "Primrose Mews", "Riverside Walk", "Station Lane"]);
    const n = randInt(rng, 3, 48);
    const post = pick(rng, ["SE1 7PB", "N1 9GU", "E14 5AB", "W2 3RT"]);
    const right = `${n} ${street}, ${post}`;
    const { options, answer } = choice(rng, right, [`${n + 2} ${street}, ${post}`, `${n} ${street}, ${post.replace(/\d/, "4")}`, `${n} ${pick(rng, ["Orchard Lane", "Primrose Road", "Riverside Road"])}, ${post}`]);
    return { kind: "parcelAddress", skill: "order-accuracy", title: "Match the parcel to the address", prompt: "Scan the label. Which door does this parcel go to?", doc: { type: "ticket", text: `PARCEL  #${randInt(rng, 10000, 99999)}\nTo: ${pick(rng, ["A. Khan", "J. Okafor", "M. Silva", "R. Patel"])}\n${n} ${street}\nLondon ${post}\nLeave with neighbour: NO` }, options, answer, explain: "House number, street and postcode must all match. One wrong digit is a different home." };
  },
  taxiFare(rng) {
    const miles = randInt(rng, 2, 9), rate = pick(rng, [180, 200, 220]), flag = 300;
    const total = flag + miles * rate;
    return { kind: "taxiFare", skill: "numeracy", title: "Work out the fare", prompt: `The meter charges a ${money(flag)} pick-up plus ${money(rate)} per mile. The trip was ${miles} miles. What's the fare?`, answer: total / 100, numeric: { prefix: "£", tolerance: 0.01 }, explain: `${money(flag)} + ${miles} × ${money(rate)} = ${money(total)}.` };
  },
  busTimetable(rng) {
    const start = randInt(rng, 7, 9), every = pick(rng, [10, 12, 15]);
    const times = Array.from({ length: 5 }, (_, i) => `${start}:${String(i * every).padStart(2, "0")}`);
    const now = randInt(rng, 1, 3);
    const nowText = `${start}:${String(now * every - randInt(rng, 1, every - 2)).padStart(2, "0")}`;
    const right = times[now];
    const { options, answer } = choice(rng, right, [times[now - 1], times[Math.min(4, now + 1)], times[0]].filter((t) => t !== right));
    return { kind: "busTimetable", skill: "scheduling", title: "Next departure", prompt: `It's ${nowText}. Which departure do you run next from this stop?`, doc: { type: "table", rows: [["Route 24 · Stop A"], ...times.map((t) => [t])] }, options, answer, explain: `The next departure after ${nowText} is ${right}. Never leave early: people plan to the timetable.` };
  },
  bricksNeeded(rng) {
    const len = randInt(rng, 3, 8), high = pick(rng, [1, 1.5, 2]);
    const area = len * high;
    return { kind: "bricksNeeded", skill: "numeracy", title: "Order the bricks", prompt: `The garden wall is ${len} m long and ${high} m high. You need 60 bricks per square metre. How many bricks?`, answer: Math.round(area * 60), numeric: { unit: "bricks", tolerance: 0.5 }, explain: `Area = ${len} × ${high} = ${area} m². ${area} × 60 = ${Math.round(area * 60)} bricks (order a few spare for cuts).` };
  },
  cleanProduct(rng) {
    const c = pick(rng, [
      { job: "A spill of milk on the café floor", right: "Put out a wet-floor sign, then mop with warm water and detergent", wrong: ["Mop it without a sign", "Mix bleach and cleaner for extra strength", "Leave it to dry"] },
      { job: "Smears on the office windows", right: "Glass cleaner and a squeegee, top to bottom", wrong: ["Floor polish", "Wire wool", "Bleach neat on a cloth"] },
      { job: "Toilets at the station", right: "Gloves on, toilet cleaner, separate colour-coded cloths", wrong: ["Use the kitchen cloths", "Mix bleach with another cleaner", "Skip gloves to save time"] },
    ]);
    const { options, answer } = choice(rng, c.right, c.wrong);
    return { kind: "cleanProduct", skill: "health-and-safety", title: "Clean it safely", prompt: `${c.job}. What do you do?`, options, answer, explain: "Safety first: signs for wet floors, the right product for the surface, colour-coded cloths, and never mix chemicals (it can make toxic gas)." };
  },
  haircutMatch(rng) {
    const r = pick(rng, [
      { ask: "Short back and sides, a bit longer on top", right: "Clipper guard 2 on the sides, scissors on top", wrong: ["Guard 8 all over", "Shave it all off", "Scissors only, leave the sides long"] },
      { ask: "Skin fade with a sharp line-up", right: "Fade from guard 0 at the bottom up to guard 2, then line up with the trimmer", wrong: ["Guard 4 all over", "Scissors only", "One length at guard 1"] },
      { ask: "Just a trim, keep the length", right: "Take 1–2 cm off with scissors and tidy the ends", wrong: ["Clipper guard 1 all over", "Bleach it", "Cut it to the chin"] },
    ]);
    const { options, answer } = choice(rng, r.right, r.wrong);
    return { kind: "haircutMatch", skill: "customer-service", title: "Match the reference", prompt: `The client shows you a photo and asks for: "${r.ask}". What's your plan?`, options, answer, explain: "Confirm what they want before cutting: lower guard numbers cut shorter, and you can always take more off but never put it back." };
  },
  extinguisher(rng) {
    const f = pick(rng, [
      { fire: "Burning paper and wood in a bin", right: "Water", wrong: ["Wet chemical", "Nothing: let it burn", "Throw flour on it"] },
      { fire: "A chip pan fire in a kitchen", right: "Fire blanket or wet chemical, never water", wrong: ["Water", "Foam from a hose", "Carry the pan outside"] },
      { fire: "A smoking computer plugged into the mains", right: "Isolate the power, then CO₂", wrong: ["Water", "Foam", "Wet chemical"] },
    ]);
    const { options, answer } = choice(rng, f.right, f.wrong);
    return { kind: "extinguisher", skill: "health-and-safety", title: "Choose the extinguisher", prompt: `On arrival: ${f.fire}. What do you use?`, options, answer, explain: "Match the agent to the fire: water for paper and wood, never on fat or live electrics; CO₂ for electrical fires once you can, isolate the power." };
  },
  plantCare(rng) {
    const p = pick(rng, [
      { q: "When do you sow runner beans outside in the UK?", right: "Late May, after the last frost", wrong: ["January", "During a frost", "Mid-winter in the dark"] },
      { q: "Best time of day to water the beds in summer?", right: "Early morning or evening", wrong: ["Midday in full sun", "Never: rain is enough", "Only at night in winter"] },
      { q: "A seedling's leaves are yellow and the soil is soaking. What's wrong?", right: "Overwatering: let it drain and water less", wrong: ["It needs much more water", "Too much sun at night", "It's ready to harvest"] },
    ]);
    const { options, answer } = choice(rng, p.right, p.wrong);
    return { kind: "plantCare", skill: "prioritisation", title: "Gardener's call", prompt: p.q, options, answer, explain: `${p.right}. Timing and the right amount of water matter more than anything else.` };
  },
  fishLimit(rng) {
    const min = pick(rng, [25, 30, 35]);
    const sizes = shuffle(rng, [min - 6, min - 2, min + 3, min + 8]);
    const keep = sizes.filter((s) => s >= min).length;
    return { kind: "fishLimit", skill: "numeracy", title: "Size limit", prompt: `The minimum keep size here is ${min} cm. You've caught fish of ${sizes.join(" cm, ")} cm. How many can you keep to sell?`, answer: keep, numeric: { tolerance: 0 }, explain: `Only fish of ${min} cm or more can be kept; the others go back to grow. That's ${keep}.` };
  },
  markWork(rng) {
    const a = randInt(rng, 3, 9), b = randInt(rng, 3, 9);
    const wrongAns = a * b + pick(rng, [-1, 1, a]);
    const theirs = pick(rng, [a * b, wrongAns]);
    const right = theirs === a * b ? "Correct: tick it and praise the method" : `Incorrect: the answer is ${a * b}, show where it went wrong`;
    const { options, answer } = choice(rng, right, theirs === a * b ? [`Incorrect: the answer is ${a * b + 1}`, "Skip it", "Give half marks"] : ["Correct: tick it", "Skip it", `Incorrect: the answer is ${theirs + 2}`]);
    return { kind: "markWork", skill: "written-communication", title: "Mark the worksheet", prompt: `Question: ${a} × ${b} = ?  The student wrote: ${theirs}. How do you mark it?`, options, answer, explain: `${a} × ${b} = ${a * b}. Good feedback says what's right or wrong and how to fix it.` };
  },
  passCheck(rng) {
    const today = randInt(rng, 3, 25);
    const rows = shuffle(rng, [
      [pick(rng, ["Sam Lee", "Ava Cole"]), "Staff", `${today + 30}/11`, "Valid"],
      [pick(rng, ["Leo Diaz", "Mia Shah"]), "Visitor", `${today - 2}/11`, "Expired"],
      [pick(rng, ["Kai Ward", "Zoe Fox"]), "Contractor", `${today + 3}/11`, "Valid"],
    ]);
    const bad = rows.find((r) => r[3] === "Expired")!;
    const { options, answer } = choice(rng, bad[0], rows.filter((r) => r !== bad).map((r) => r[0]).concat(["Nobody: all fine"]));
    return { kind: "passCheck", skill: "data-protection", title: "Check the passes", prompt: `Today is ${today}/11. Who can't come in on their pass?`, doc: { type: "table", rows: [["Name", "Type", "Expires"], ...rows.map((r) => r.slice(0, 3))] }, options, answer, explain: `${bad[0]}'s pass expired on ${bad[2]}. Politely send them to reception to get a new one.` };
  },
  witness(rng) {
    const car = pick(rng, ["red hatchback", "blue van", "white taxi"]);
    const { options, answer } = choice(rng, "The car colour changes between the two statements", ["Both say it happened in the morning", "Both mention the bus stop", "Both describe one driver"]);
    return { kind: "witness", skill: "legal-research", title: "Compare the statements", prompt: "Two witnesses describe the same bump at the junction. What doesn't add up?", doc: { type: "email", text: `Witness 1: "About 9am a ${car} reversed into the bus stop. One driver got out."\n\nWitness 2: "Around nine, a ${car.replace(/red|blue|white/, (c) => ({ red: "green", blue: "silver", white: "black" })[c] ?? c)} backed into the bus stop. The driver was on their own."` }, options, answer, explain: "Look for details that conflict, then go back and ask open questions. Don't lead the witness." };
  },
  treatment(rng) {
    const t = pick(rng, [
      { sym: "Fell off a bike. Grazed knee, bleeding a little, can walk fine.", right: "Clean the graze, apply a sterile dressing", wrong: ["Send for surgery", "Put a cast on", "Ignore it"] },
      { sym: "Twisted ankle playing football. Swollen, can't put weight on it.", right: "Rest, ice, raise it and send for an X-ray", wrong: ["Walk it off", "Clean and dress a graze", "Discharge with no checks"] },
      { sym: "High temperature and a sore throat for two days, drinking OK.", right: "Fluids, rest and fever medicine; come back if worse", wrong: ["Put a cast on", "Emergency surgery", "Bandage the throat"] },
    ]);
    const { options, answer } = choice(rng, t.right, t.wrong);
    return { kind: "treatment", skill: "clinical-observations", title: "Choose the treatment", prompt: `Patient: ${t.sym}`, options, answer, explain: `${t.right}. Match the treatment to what you found, and tell them what to do if it gets worse. (Simplified game scenario.)` };
  },
  menuAllergy(rng) {
    const allergy = pick(rng, ["nuts", "milk", "gluten"]);
    const dishes = { nuts: ["Pesto pasta", "Tomato soup"], milk: ["Four cheese pizza", "Garden salad"], gluten: ["Garlic bread", "Jacket potato"] }[allergy]!;
    const { options, answer } = choice(rng, `Recommend the ${dishes[1]} and flag the allergy to the kitchen`, [`Recommend the ${dishes[0]}`, "Say everything is fine", "Guess and don't tell the kitchen"]);
    return { kind: "menuAllergy", skill: "food-safety", title: "Allergy at the table", prompt: `A guest says they're allergic to ${allergy}. What do you do?`, options, answer, explain: "Always tell the kitchen about allergies and check the allergen chart. Never guess." };
  },
};

/** Which steps of each role open a real task, by step index, and which task. */
const ROLE_TASK_STEPS: Record<string, Record<number, string>> = {
  "pizza-chef": { 0: "pizzaOrder", 4: "foodSafety" },
  "delivery-driver": { 0: "parcelAddress" },
  cashier: { 1: "basket", 3: "change" },
  stocker: { 0: "stock" },
  mechanic: { 0: "mechFault", 3: "toolPick" },
  doctor: { 1: "vitals", 3: "treatment" },
  nurse: { 2: "vitals", 4: "triage" },
  police: { 3: "witness", 4: "gdpr" },
  firefighter: { 3: "extinguisher" },
  builder: { 0: "bricksNeeded" },
  cleaner: { 1: "cleanProduct" },
  barber: { 0: "haircutMatch" },
  teacher: { 4: "markWork" },
  "bus-driver": { 0: "busTimetable" },
  "taxi-driver": { 4: "taxiFare" },
  gardener: { 1: "plantCare" },
  warehouse: { 0: "stock", 3: "parcelAddress" },
  waiter: { 1: "menuAllergy", 4: "change" },
  fisher: { 3: "fishLimit" },
  security: { 2: "passCheck" },
};

export function roleStepTask(roleId: string, stepIndex: number, rng: Rng): Task | null {
  const kind = ROLE_TASK_STEPS[roleId]?.[stepIndex];
  if (!kind) return null;
  const task = ROLE_GEN[kind]?.(rng) ?? careerTask(kind, rng);
  return task ? { ...task, kind } : null;
}
export const roleTaskSteps = (roleId: string) => Object.keys(ROLE_TASK_STEPS[roleId] ?? {}).map(Number);
