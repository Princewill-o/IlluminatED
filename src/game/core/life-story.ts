/**
 * What If: a whole life as a text adventure. Age up a year at a time, choose
 * what to spend your time on, react to random (funny) events, chase a dream
 * career (surgeon, pop star, astronaut, Prime Minister…) and keep the story
 * going through your children. School friendly: no crime, no dark stuff.
 *
 * Pure and seeded, so a life replays the same way and is easy to test.
 */

export type Stat = "happiness" | "health" | "smarts" | "confidence";
export type Stage = "baby" | "primary" | "secondary" | "sixth" | "adult" | "retired";
export type Route = "a-levels" | "btec" | "apprenticeship" | null;
export type Degree = "medicine" | "music" | "engineering" | "politics" | "computing" | "business" | "art" | "sport-science" | null;

export interface Person {
  first: string;
  last: string;
  age: number;
  gen: number;
  city: string;
  stats: Record<Stat, number>;
  money: number;
  /** Hobby skill levels 0..100. */
  skills: Record<Hobby, number>;
  gcse: number | null;
  route: Route;
  degree: Degree;
  career: CareerId | null;
  /** Rank in the career ladder (0 = first rung). */
  rank: number;
  fame: number;
  partner: string | null;
  children: string[];
  pets: string[];
  log: { age: number; text: string }[];
  /** Actions left this year. */
  actions: number;
  pending: LifeEvent | null;
  whatIf: string | null;
  achievements: string[];
  alive: boolean;
  seed: number;
}

export type Hobby = "music" | "sport" | "art" | "coding" | "debate";
export const HOBBIES: Record<Hobby, string> = { music: "Music", sport: "Sport", art: "Art", coding: "Coding", debate: "Debating" };

/* ---------- Seeded randomness ---------- */
export function rand(p: Person) {
  // mulberry32
  let t = (p.seed = (p.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(p: Person, list: readonly T[]) => list[Math.floor(rand(p) * list.length)];
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/* ---------- Names and places ---------- */
const FIRST = ["Amara", "Leo", "Zara", "Kai", "Maya", "Noah", "Isla", "Ethan", "Priya", "Jamal", "Freya", "Omar", "Chloe", "Tariq", "Ruby", "Daniel", "Aisha", "Finn", "Grace", "Yusuf", "Mei", "Oscar", "Layla", "Theo"];
const LAST = ["Okafor", "Smith", "Patel", "Jones", "Khan", "Williams", "Chen", "Brown", "Ahmed", "Taylor", "Murphy", "Evans", "Mensah", "Clarke", "Nowak", "Hughes"];
const CITIES = ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Cardiff", "Belfast", "Bristol", "Liverpool", "Newcastle", "Brighton", "Edinburgh"];
const PETS = ["a golden retriever called Biscuit", "a cat called Professor Whiskers", "a tortoise called Speedy", "a hamster called Nugget", "a parrot that only says 'revise!'", "two goldfish called Salt and Vinegar"];

/* ---------- Careers ---------- */
export type CareerId = "surgeon" | "popstar" | "astronaut" | "pm" | "engineer" | "teacher" | "chef" | "footballer" | "vet" | "game-dev" | "founder" | "artist";
export interface Career {
  id: CareerId;
  name: string;
  ladder: string[];
  /** Yearly pay at each rung (£). */
  pay: number[];
  dream?: boolean;
  /** Can this person apply? Returns a reason when they can't. */
  needs: (p: Person) => string | null;
  /** Base chance of being accepted (0..1) before stats. */
  odds: number;
  /** Chance per year of moving up a rung (before stats). */
  promote: number;
}
const degreeIs = (p: Person, ...d: Degree[]) => (d.includes(p.degree) ? null : `You need a degree in ${d.filter(Boolean).join(" or ")}.`);
export const CAREERS: Career[] = [
  { id: "surgeon", name: "Surgeon", dream: true, ladder: ["Junior doctor", "Surgical trainee", "Registrar", "Consultant surgeon", "Head of surgery"], pay: [32000, 43000, 56000, 105000, 140000],
    needs: (p) => degreeIs(p, "medicine"), odds: 0.85, promote: 0.3 },
  { id: "popstar", name: "Pop star", dream: true, ladder: ["Open-mic singer", "Signed artist", "Chart artist", "Arena headliner", "Global superstar"], pay: [6000, 25000, 90000, 400000, 2000000],
    needs: (p) => (p.skills.music >= 50 ? null : "Your music skill needs to be at least 50. Practise music!"), odds: 0.35, promote: 0.22 },
  { id: "astronaut", name: "Astronaut", dream: true, ladder: ["Astronaut candidate", "Mission specialist", "Space station crew", "Mission commander", "Moon mission commander"], pay: [55000, 70000, 85000, 110000, 150000],
    needs: (p) => degreeIs(p, "engineering", "medicine") ?? (p.stats.health >= 70 ? null : "Astronauts need Health of 70 or more."), odds: 0.25, promote: 0.25 },
  { id: "pm", name: "Politics (to Prime Minister)", dream: true, ladder: ["Local councillor", "Member of Parliament", "Junior minister", "Cabinet minister", "Prime Minister"], pay: [12000, 91000, 118000, 159000, 172000],
    needs: (p) => (p.skills.debate >= 40 || p.degree === "politics" ? null : "Get a politics degree or reach 40 in Debating."), odds: 0.5, promote: 0.2 },
  { id: "engineer", name: "Engineer", ladder: ["Graduate engineer", "Engineer", "Senior engineer", "Chief engineer"], pay: [30000, 42000, 60000, 90000],
    needs: (p) => (p.route === "apprenticeship" ? null : degreeIs(p, "engineering", "computing")), odds: 0.8, promote: 0.3 },
  { id: "teacher", name: "Teacher", ladder: ["Trainee teacher", "Teacher", "Head of department", "Headteacher"], pay: [28000, 38000, 50000, 85000],
    needs: (p) => (p.degree ? null : "You need any degree."), odds: 0.9, promote: 0.25 },
  { id: "chef", name: "Chef", ladder: ["Kitchen porter", "Line cook", "Sous chef", "Head chef", "Celebrity chef"], pay: [19000, 23000, 32000, 50000, 250000],
    needs: () => null, odds: 0.95, promote: 0.25 },
  { id: "footballer", name: "Footballer", ladder: ["Academy player", "League Two", "Championship", "Premier League", "England captain"], pay: [12000, 60000, 300000, 2500000, 6000000],
    needs: (p) => (p.age > 24 ? "Football academies sign players before 25." : p.skills.sport >= 60 ? null : "Your sport skill needs to be at least 60."), odds: 0.3, promote: 0.22 },
  { id: "vet", name: "Vet", ladder: ["Graduate vet", "Vet", "Senior vet", "Practice owner"], pay: [33000, 45000, 60000, 95000],
    needs: (p) => degreeIs(p, "medicine", "sport-science"), odds: 0.75, promote: 0.28 },
  { id: "game-dev", name: "Game developer", ladder: ["Junior developer", "Developer", "Lead developer", "Studio director"], pay: [28000, 45000, 70000, 120000],
    needs: (p) => (p.skills.coding >= 40 || p.degree === "computing" ? null : "Reach 40 in Coding or get a computing degree."), odds: 0.65, promote: 0.28 },
  { id: "founder", name: "Start-up founder", ladder: ["Side hustle", "Small business", "Growing company", "Unicorn start-up"], pay: [8000, 40000, 150000, 1500000],
    needs: (p) => (p.stats.confidence >= 50 ? null : "You need Confidence of 50 or more to start a business."), odds: 0.7, promote: 0.18 },
  { id: "artist", name: "Artist", ladder: ["Street artist", "Exhibited artist", "Gallery artist", "World-famous artist"], pay: [9000, 22000, 60000, 400000],
    needs: (p) => (p.skills.art >= 45 ? null : "Your art skill needs to be at least 45."), odds: 0.55, promote: 0.2 },
];
export const careerById = (id: CareerId | null) => CAREERS.find((c) => c.id === id);

export const DEGREES: { id: Exclude<Degree, null>; name: string; needs: number }[] = [
  { id: "medicine", name: "Medicine", needs: 85 }, { id: "engineering", name: "Engineering", needs: 70 },
  { id: "computing", name: "Computer Science", needs: 60 }, { id: "politics", name: "Politics", needs: 60 },
  { id: "business", name: "Business", needs: 50 }, { id: "music", name: "Music", needs: 45 },
  { id: "art", name: "Art and Design", needs: 45 }, { id: "sport-science", name: "Sport Science", needs: 50 },
];

/* ---------- What If scenarios ---------- */
export interface WhatIf { id: string; title: string; blurb: string; apply: (p: Person) => void }
export const WHAT_IFS: WhatIf[] = [
  { id: "genius", title: "What if you were a child genius?", blurb: "Start with sky-high Smarts. Can you stay humble?",
    apply: (p) => { p.stats.smarts = 95; p.stats.confidence = 40; } },
  { id: "lottery", title: "What if you won £1 million at 18?", blurb: "A huge win on your 18th birthday. Spend it wisely… or not.",
    apply: () => { /* Paid out when you turn 18. */ } },
  { id: "rhymes", title: "What if you could only speak in rhymes?", blurb: "Every year, someone is confused. Great for rap, bad for job interviews.",
    apply: (p) => { p.skills.music = 30; p.stats.confidence = 70; } },
  { id: "tiny-island", title: "What if you grew up on a tiny Scottish island?", blurb: "Twelve people, one shop, too many sheep.",
    apply: (p) => { p.city = "a tiny Scottish island"; p.stats.health = 90; p.stats.happiness = 80; } },
  { id: "famous-parents", title: "What if your parents were famous?", blurb: "Start with fame and money. Everyone expects big things.",
    apply: (p) => { p.fame = 40; p.money = 20000; p.stats.confidence = 65; } },
  { id: "animals", title: "What if animals loved you a bit too much?", blurb: "Pets follow you home. All of them.",
    apply: (p) => { p.pets.push("a very loyal pigeon called Gary"); } },
];

/* ---------- Random events ---------- */
export interface Choice { label: string; effect: (p: Person) => string }
export interface LifeEvent { id: string; text: string; choices: Choice[] }
type EventDef = { id: string; stages: Stage[]; weight?: number; when?: (p: Person) => boolean; make: (p: Person) => LifeEvent };
const bump = (p: Person, changes: Partial<Record<Stat, number>>) => { for (const [k, v] of Object.entries(changes)) p.stats[k as Stat] = clamp(p.stats[k as Stat] + (v ?? 0)); };

const EVENTS: EventDef[] = [
  { id: "seagull", stages: ["primary", "secondary", "sixth", "adult"], make: () => ({ id: "seagull", text: "A seagull swoops down and steals your entire portion of chips.", choices: [
    { label: "Chase it down the pier", effect: (p) => { bump(p, { health: 4, happiness: -2 }); return "You didn't catch it, but you did get your steps in."; } },
    { label: "Laugh it off", effect: (p) => { bump(p, { happiness: 3 }); return "The seagull looked smug. You bought more chips."; } },
  ] }) },
  { id: "reply-all", stages: ["secondary", "sixth", "adult"], make: () => ({ id: "reply-all", text: "You accidentally reply-all to an email meant for one person. It was about how much you love your cat.", choices: [
    { label: "Own it and share a cat photo", effect: (p) => { bump(p, { confidence: 6, happiness: 3 }); p.fame += 1; return "Everyone loved the cat. You're now 'the cat person'."; } },
    { label: "Pretend you were hacked", effect: (p) => { bump(p, { confidence: -3 }); return "Nobody believed you. Honesty is easier."; } },
  ] }) },
  { id: "gran-viral", stages: ["primary", "secondary", "sixth"], make: () => ({ id: "gran-viral", text: "Your gran posts a video of herself skateboarding. It gets four million views.", choices: [
    { label: "Join her next video", effect: (p) => { p.fame += 5; bump(p, { happiness: 6, confidence: 4 }); return "You and gran are now a double act. She's better at skating than you."; } },
    { label: "Hide in your room forever", effect: (p) => { bump(p, { happiness: -2 }); return "You lasted until dinner time."; } },
  ] }) },
  { id: "llama", stages: ["primary", "secondary", "sixth", "adult", "retired"], weight: 0.6, make: () => ({ id: "llama", text: "A llama escapes from a nearby farm and follows you home.", choices: [
    { label: "Walk it back to the farm", effect: (p) => { bump(p, { happiness: 4 }); p.money += 50; return "The farmer gave you £50 and a jar of honey as a thank you."; } },
    { label: "Name it Kevin", effect: (p) => { bump(p, { happiness: 6 }); return "Kevin was collected an hour later. You think about Kevin often."; } },
  ] }) },
  { id: "pie-contest", stages: ["secondary", "sixth", "adult"], make: () => ({ id: "pie-contest", text: "There's a pie-eating contest at the summer fair.", choices: [
    { label: "Enter (go big)", effect: (p) => { const win = rand(p) < 0.4; bump(p, win ? { happiness: 8, health: -2 } : { health: -3 }); if (win) p.money += 100; return win ? "You won £100 and a golden pie trophy!" : "You came fourth. The pies came back to haunt you."; } },
    { label: "Cheer from the side", effect: (p) => { bump(p, { happiness: 2 }); return "You had a lovely afternoon and kept your dignity."; } },
  ] }) },
  { id: "school-play", stages: ["primary", "secondary"], make: () => ({ id: "school-play", text: "Your school is putting on a play. The lead role is up for grabs.", choices: [
    { label: "Audition for the lead", effect: (p) => { const ok = rand(p) < 0.3 + p.stats.confidence / 200; bump(p, ok ? { confidence: 10, happiness: 6 } : { confidence: 3 }); return ok ? "You got the lead! Standing ovation." : "You were cast as Tree Number Three. You were the best tree."; } },
    { label: "Help backstage", effect: (p) => { bump(p, { happiness: 3 }); p.skills.art = clamp(p.skills.art + 6); return "You painted the scenery. It looked amazing."; } },
  ] }) },
  { id: "exam-nerves", stages: ["secondary", "sixth"], make: () => ({ id: "exam-nerves", text: "Mock exams are next week and you feel nervous.", choices: [
    { label: "Make a revision timetable", effect: (p) => { bump(p, { smarts: 6, happiness: -1 }); return "Little and often worked. Your mocks went well."; } },
    { label: "Talk to a teacher about it", effect: (p) => { bump(p, { smarts: 3, happiness: 4, confidence: 2 }); return "Your teacher gave you great tips. You felt much calmer."; } },
    { label: "Ignore it and play games", effect: (p) => { bump(p, { happiness: 3, smarts: -4 }); return "The mocks were… a learning experience."; } },
  ] }) },
  { id: "new-kid", stages: ["primary", "secondary"], make: (p) => ({ id: "new-kid", text: `A new student, ${pick(p, FIRST)}, joins your class and looks lonely at lunch.`, choices: [
    { label: "Invite them to sit with you", effect: (p) => { bump(p, { happiness: 6, confidence: 3 }); return "You became best friends. They're still your friend decades later."; } },
    { label: "Wave but stay put", effect: (p) => { bump(p, { happiness: 1 }); return "Someone else invited them over. You wonder what might have been."; } },
  ] }) },
  { id: "flat-pack", stages: ["adult"], make: () => ({ id: "flat-pack", text: "You try to build a flat-pack wardrobe. There are 400 screws and no instructions.", choices: [
    { label: "Persevere", effect: (p) => { bump(p, { smarts: 3, happiness: -2 }); return "Six hours later it stands. It wobbles. It's yours."; } },
    { label: "Call a friend", effect: (p) => { bump(p, { happiness: 4 }); return "Teamwork! You built it in an hour and ordered pizza."; } },
  ] }) },
  { id: "talent-show", stages: ["secondary", "sixth", "adult"], when: (p) => p.skills.music >= 30, make: () => ({ id: "talent-show", text: "A local talent show is looking for acts.", choices: [
    { label: "Perform your best song", effect: (p) => { const ok = rand(p) < p.skills.music / 120; p.fame += ok ? 6 : 1; bump(p, ok ? { confidence: 8, happiness: 6 } : { confidence: 2 }); return ok ? "You won! A producer took your number." : "You came second to a dog that could skateboard."; } },
    { label: "Not this year", effect: () => "Maybe next year." },
  ] }) },
  { id: "marathon", stages: ["adult"], make: () => ({ id: "marathon", text: "A friend dares you to run a charity marathon.", choices: [
    { label: "Train and run it", effect: (p) => { bump(p, { health: 8, happiness: 6, confidence: 5 }); return "You crossed the line dressed as a banana and raised £1,200 for charity."; } },
    { label: "Sponsor them instead", effect: (p) => { p.money -= 20; bump(p, { happiness: 2 }); return "You cheered from the finish line with a sign."; } },
  ] }) },
  { id: "rhyme-day", stages: ["primary", "secondary", "sixth", "adult"], weight: 3, when: (p) => p.whatIf === "rhymes", make: () => ({ id: "rhyme-day", text: "You ask for the time in a shop. It comes out as a rhyme. The shop goes quiet.", choices: [
    { label: "Turn it into a rap", effect: (p) => { p.skills.music = clamp(p.skills.music + 8); p.fame += 2; return "The whole shop joined in. Someone filmed it."; } },
    { label: "Point at your watch", effect: (p) => { bump(p, { confidence: -2 }); return "It worked. Silent communication: underrated."; } },
  ] }) },
  { id: "pets-arrive", stages: ["primary", "secondary", "sixth", "adult"], weight: 2, when: (p) => p.whatIf === "animals", make: (p) => ({ id: "pets-arrive", text: `${pick(p, ["A family of ducks", "A very confident fox", "Three hedgehogs", "A runaway pony"])} turns up at your door and refuses to leave.`, choices: [
    { label: "Find them a proper home", effect: (p) => { bump(p, { happiness: 5 }); return "The local animal rescue thanked you. Again."; } },
    { label: "Make them a little bed", effect: (p) => { bump(p, { happiness: 7 }); return "They stayed one night, then left at dawn. Majestic."; } },
  ] }) },
  { id: "lost-wallet", stages: ["sixth", "adult"], make: () => ({ id: "lost-wallet", text: "You find a wallet on the bus with £200 inside and an ID card.", choices: [
    { label: "Hand it in", effect: (p) => { bump(p, { happiness: 6 }); p.money += 30; return "The owner sent a thank-you card and £30. You feel great."; } },
    { label: "Post on the local group to find the owner", effect: (p) => { bump(p, { happiness: 6, confidence: 3 }); return "The owner turned out to be your future boss. Small world."; } },
  ] }) },
  { id: "volcano", stages: ["primary", "secondary"], make: () => ({ id: "volcano", text: "Science fair! Your baking-soda volcano could be legendary.", choices: [
    { label: "Add way too much", effect: (p) => { bump(p, { happiness: 6, smarts: 2 }); return "It erupted onto the head teacher's shoes. Third place for drama."; } },
    { label: "Measure it carefully", effect: (p) => { bump(p, { smarts: 6 }); return "A perfect eruption. First place!"; } },
  ] }) },
];

function eventFor(p: Person): LifeEvent | null {
  const stage = stageOf(p.age);
  const pool = EVENTS.filter((e) => e.stages.includes(stage) && (!e.when || e.when(p)));
  if (!pool.length || rand(p) > 0.7) return null;
  const total = pool.reduce((n, e) => n + (e.weight ?? 1), 0);
  let r = rand(p) * total;
  for (const e of pool) { r -= e.weight ?? 1; if (r <= 0) return e.make(p); }
  return pool[0].make(p);
}

/* ---------- Life ---------- */
export function stageOf(age: number): Stage {
  return age < 5 ? "baby" : age < 11 ? "primary" : age < 16 ? "secondary" : age < 18 ? "sixth" : age < 67 ? "adult" : "retired";
}
export const STAGE_NAME: Record<Stage, string> = { baby: "Early years", primary: "Primary school", secondary: "Secondary school", sixth: "Sixth form or college", adult: "Adult life", retired: "Retirement" };

export function newLife(seed: number, opts: { first?: string; last?: string; whatIf?: string | null; parent?: Person } = {}): Person {
  const p: Person = {
    first: "", last: "", age: 0, gen: (opts.parent?.gen ?? 0) + 1, city: "",
    stats: { happiness: 70, health: 75, smarts: 50, confidence: 50 }, money: 0,
    skills: { music: 0, sport: 0, art: 0, coding: 0, debate: 0 },
    gcse: null, route: null, degree: null, career: null, rank: 0, fame: 0,
    partner: null, children: [], pets: [], log: [], actions: 0, pending: null,
    whatIf: opts.whatIf ?? null, achievements: opts.parent?.achievements.slice() ?? [], alive: true, seed: seed | 0,
  };
  p.first = opts.first?.trim() || pick(p, FIRST);
  p.last = opts.last?.trim() || opts.parent?.last || pick(p, LAST);
  p.city = opts.parent?.city ?? pick(p, CITIES);
  for (const s of Object.keys(p.stats) as Stat[]) p.stats[s] = clamp(p.stats[s] + (rand(p) - 0.5) * 30);
  if (opts.parent) {
    p.money = Math.round(opts.parent.money * 0.5);
    p.fame = Math.round(opts.parent.fame * 0.3);
  }
  WHAT_IFS.find((w) => w.id === p.whatIf)?.apply(p);
  say(p, opts.parent
    ? `You are ${p.first} ${p.last}, born in ${p.city}: generation ${p.gen} of the ${p.last} family. ${opts.parent.first} is your parent.`
    : `You are ${p.first} ${p.last}, born in ${p.city}. Your story begins!`);
  return p;
}
function say(p: Person, text: string) { p.log.push({ age: p.age, text }); }

/** What you can do this year. */
export type Activity = "study" | "hobby" | "exercise" | "friends" | "volunteer" | "part-time" | "save" | "travel" | "relax";
export const ACTIVITIES: Record<Activity, { name: string; from: number; to?: number }> = {
  study: { name: "Study hard", from: 5, to: 22 },
  hobby: { name: "Practise a hobby", from: 5 },
  exercise: { name: "Exercise", from: 5 },
  friends: { name: "Hang out with friends", from: 5 },
  volunteer: { name: "Volunteer", from: 11 },
  "part-time": { name: "Part-time job", from: 16, to: 22 },
  save: { name: "Save and invest", from: 18 },
  travel: { name: "Travel somewhere new", from: 18 },
  relax: { name: "Take it easy", from: 5 },
};
export const ACTIONS_PER_YEAR = 2;
export function activitiesFor(p: Person): Activity[] {
  return (Object.keys(ACTIVITIES) as Activity[]).filter((a) => p.age >= ACTIVITIES[a].from && (ACTIVITIES[a].to === undefined || p.age <= ACTIVITIES[a].to!));
}

export function doActivity(p: Person, a: Activity, hobby: Hobby = "music"): string {
  if (!p.alive || p.actions <= 0 || p.pending) return "";
  p.actions--;
  let text = "";
  switch (a) {
    case "study": bump(p, { smarts: 5 + rand(p) * 4, happiness: -1 }); text = pick(p, ["You revised with flashcards. Things are sticking.", "You did practice papers. Your brain feels bigger.", "You joined a study group. Explaining things helped."]); break;
    case "hobby": p.skills[hobby] = clamp(p.skills[hobby] + 7 + rand(p) * 6); bump(p, { happiness: 3 }); if (hobby === "debate") bump(p, { confidence: 3 }); text = `You practised ${HOBBIES[hobby].toLowerCase()}. Skill: ${p.skills[hobby]}.`; break;
    case "exercise": bump(p, { health: 6, happiness: 2 }); p.skills.sport = clamp(p.skills.sport + 4); text = pick(p, ["You went running every morning.", "You joined a five-a-side team.", "You discovered climbing. Your arms hurt."]); break;
    case "friends": bump(p, { happiness: 7, confidence: 2 }); text = pick(p, ["You went bowling. You lost badly. Brilliant night.", "Film night at a friend's house.", "You spent the day at the beach with friends."]); break;
    case "volunteer": bump(p, { happiness: 5, confidence: 4 }); text = pick(p, ["You helped at a food bank.", "You volunteered at an animal shelter.", "You helped younger students with reading."]); break;
    case "part-time": p.money += 2500; bump(p, { confidence: 3, happiness: -1 }); text = pick(p, ["You worked weekends at a café: +£2,500.", "You stacked shelves at a supermarket: +£2,500."]); break;
    case "save": { const gain = Math.round(Math.max(0, p.money) * 0.05); p.money += gain; text = `You saved and invested sensibly: +£${gain.toLocaleString("en-GB")}.`; break; }
    case "travel": p.money -= 1500; bump(p, { happiness: 9, confidence: 3 }); text = `You travelled to ${pick(p, ["Japan", "Iceland", "Morocco", "Peru", "Italy", "Canada", "Kenya", "Norway"])}. Unforgettable. (−£1,500)`; break;
    case "relax": bump(p, { happiness: 4, health: 2 }); text = "You took it easy. Rest matters too."; break;
  }
  say(p, text);
  return text;
}

export function choose(p: Person, index: number): string {
  const ev = p.pending;
  if (!ev) return "";
  const c = ev.choices[index];
  p.pending = null;
  const text = c ? c.effect(p) : "";
  say(p, `${ev.text} → ${c?.label}. ${text}`);
  checkAchievements(p);
  return text;
}

/** Big decisions at milestone ages. */
export type Decision =
  | { kind: "route"; options: { id: Exclude<Route, null>; name: string }[] }
  | { kind: "degree"; options: { id: Exclude<Degree, null> | "none"; name: string; ok: boolean }[] };
export function decisionFor(p: Person): Decision | null {
  if (p.age === 16 && p.route === null) return { kind: "route", options: [{ id: "a-levels", name: "A levels at sixth form" }, { id: "btec", name: "BTEC at college" }, { id: "apprenticeship", name: "An apprenticeship" }] };
  if (p.age === 18 && p.degree === null && p.route !== "apprenticeship" && !p.log.some((l) => l.text.startsWith("You skipped university")))
    return { kind: "degree", options: [...DEGREES.map((d) => ({ id: d.id, name: d.name, ok: p.stats.smarts >= d.needs - (p.route === "btec" ? 5 : 0) })), { id: "none" as const, name: "Skip university", ok: true }] };
  return null;
}
export function decide(p: Person, id: string): string {
  const d = decisionFor(p);
  if (!d) return "";
  if (d.kind === "route") {
    p.route = id as Route;
    const text = p.route === "apprenticeship" ? "You started an apprenticeship: paid to learn on the job." : `You chose ${p.route === "a-levels" ? "A levels" : "a BTEC"}.`;
    if (p.route === "apprenticeship") p.money += 3000;
    say(p, text); return text;
  }
  if (id === "none") { const t = "You skipped university and went straight into the world of work."; say(p, t); p.degree = null; return t; }
  const deg = DEGREES.find((x) => x.id === id);
  const opt = d.options.find((o) => o.id === id);
  if (!deg || !opt?.ok) return "Your grades aren't high enough for that course yet.";
  p.degree = deg.id;
  p.money -= 0; // Student finance: repaid later, not upfront.
  const t = `You start a degree in ${deg.name}. Freshers' week was a blur of free pizza.`;
  say(p, t);
  return t;
}

export function applyFor(p: Person, id: CareerId): { ok: boolean; text: string } {
  const c = careerById(id);
  if (!c || p.age < 18) return { ok: false, text: "You need to be 18 or over." };
  const why = c.needs(p);
  if (why) return { ok: false, text: why };
  if (p.career === id) return { ok: false, text: `You already work as a ${c.ladder[p.rank].toLowerCase()}.` };
  if (p.actions <= 0) return { ok: false, text: "You're out of time this year. Age up first." };
  p.actions--;
  const chance = c.odds + (p.stats.confidence - 50) / 250 + (p.stats.smarts - 50) / 300;
  const ok = rand(p) < chance;
  const text = ok ? `You got the job: ${c.ladder[0]}!` : `${c.name}: not this time. Keep building your skills and try again.`;
  if (ok) { p.career = id; p.rank = 0; }
  say(p, text);
  checkAchievements(p);
  return { ok, text };
}

/** Advance a year: grow, school, careers, events and (eventually) the end of the story. */
export function ageUp(p: Person): string[] {
  if (!p.alive || p.pending) return [];
  p.age++;
  p.actions = p.age >= 5 ? ACTIONS_PER_YEAR : 0;
  const lines: string[] = [];
  const note = (t: string) => { lines.push(t); say(p, t); };
  // Natural drift.
  bump(p, { health: p.age > 55 ? -2 - rand(p) * 2 : p.age > 35 ? -0.6 : 0 });
  if (p.age === 5) note("You started primary school. Your teacher's name is Mrs Jolly. She is very jolly.");
  if (p.age === 11) note("You started secondary school. The corridors are huge.");
  if (p.age === 16) {
    p.gcse = Math.max(1, Math.min(9, Math.round(p.stats.smarts / 11)));
    note(`GCSE results day! Your average grade: ${p.gcse}.${p.gcse >= 7 ? " Amazing work!" : p.gcse >= 4 ? " Solid passes all round." : " Some resits ahead, but you've got this."}`);
  }
  if (p.age === 18) {
    note(p.route === "apprenticeship" ? "You finished your apprenticeship. You're qualified!" : "You finished sixth form. Results day: hugs and happy tears.");
    if (p.whatIf === "lottery") { p.money += 1_000_000; note("Your lottery ticket wins £1,000,000! Your phone won't stop buzzing."); }
  }
  if (p.age === 21 && p.degree) note(`You graduated with a degree in ${DEGREES.find((d) => d.id === p.degree)?.name}. Mortarboards in the air!`);
  // Careers: pay, promotions, fame.
  const c = careerById(p.career);
  if (c) {
    p.money += c.pay[p.rank];
    const stat = p.career === "popstar" ? p.skills.music : p.career === "footballer" ? p.skills.sport : p.career === "pm" ? p.skills.debate : p.career === "artist" ? p.skills.art : p.stats.smarts;
    if (p.rank < c.ladder.length - 1 && rand(p) < c.promote + stat / 400) {
      p.rank++;
      if (["popstar", "footballer", "pm", "astronaut", "artist", "chef"].includes(c.id)) p.fame += 8 + p.rank * 4;
      note(c.id === "pm" && p.rank === 4 ? "You won the leadership election. You are the Prime Minister! You move into Number 10." : `Promotion! You're now a ${c.ladder[p.rank].toLowerCase()}.`);
    }
    if (p.age >= 67) { note(`You retired after a career as a ${c.ladder[p.rank].toLowerCase()}.`); p.career = null; }
  }
  // Life milestones.
  if (!p.partner && p.age >= 24 && p.age <= 45 && rand(p) < 0.15) { p.partner = pick(p, FIRST); note(`You met ${p.partner} at a friend's birthday. You're a couple!`); bump(p, { happiness: 10 }); }
  if (p.partner && p.age >= 27 && p.age <= 44 && p.children.length < 3 && rand(p) < 0.18) { const kid = pick(p, FIRST); p.children.push(kid); note(`${kid} ${p.last} is born! You're a parent.`); bump(p, { happiness: 8 }); }
  if (p.age >= 8 && p.pets.length < 3 && rand(p) < 0.06) { const pet = pick(p, PETS); p.pets.push(pet); note(`You adopted ${pet}.`); }
  // The end: gentle, in old age.
  if (p.age >= 70) {
    const risk = (p.age - 68) * 0.012 + (100 - p.stats.health) / 1500;
    if (rand(p) < risk || p.age >= 105) {
      p.alive = false;
      note(`${p.first}'s story comes to a peaceful end at the age of ${p.age}, surrounded by family and ${p.pets.length ? "a very fluffy pet" : "lots of photos"}.`);
      checkAchievements(p);
      return lines;
    }
  }
  if (p.age >= 5) p.pending = eventFor(p);
  checkAchievements(p);
  return lines;
}

/* ---------- Achievements and weekly challenges ---------- */
export const ACHIEVEMENTS: { id: string; name: string; test: (p: Person) => boolean }[] = [
  { id: "top-grades", name: "Top of the class (GCSE grade 8+)", test: (p) => (p.gcse ?? 0) >= 8 },
  { id: "surgeon", name: "Scalpel, please (become a consultant surgeon)", test: (p) => p.career === "surgeon" && p.rank >= 3 },
  { id: "popstar", name: "Headliner (become an arena headliner)", test: (p) => p.career === "popstar" && p.rank >= 3 },
  { id: "astronaut", name: "To infinity (join the space station crew)", test: (p) => p.career === "astronaut" && p.rank >= 2 },
  { id: "pm", name: "Number 10 (become Prime Minister)", test: (p) => p.career === "pm" && p.rank >= 4 },
  { id: "footballer", name: "Captain (captain England)", test: (p) => p.career === "footballer" && p.rank >= 4 },
  { id: "millionaire", name: "Millionaire", test: (p) => p.money >= 1_000_000 },
  { id: "famous", name: "Household name (fame 60+)", test: (p) => p.fame >= 60 },
  { id: "centenarian", name: "Telegram from the King (live to 100)", test: (p) => p.age >= 100 },
  { id: "pet-lover", name: "Pet lover (three pets)", test: (p) => p.pets.length >= 3 },
  { id: "big-family", name: "Big family (three children)", test: (p) => p.children.length >= 3 },
  { id: "dynasty", name: "Dynasty (reach generation 3)", test: (p) => p.gen >= 3 },
  { id: "polymath", name: "Polymath (60+ in three hobbies)", test: (p) => Object.values(p.skills).filter((s) => s >= 60).length >= 3 },
  { id: "apprentice", name: "Earn while you learn (apprenticeship)", test: (p) => p.route === "apprenticeship" && p.age >= 18 },
  { id: "sunshine", name: "Sunshine (happiness 100)", test: (p) => p.stats.happiness >= 100 },
];
function checkAchievements(p: Person) {
  for (const a of ACHIEVEMENTS) if (!p.achievements.includes(a.id) && a.test(p)) { p.achievements.push(a.id); say(p, `Achievement unlocked: ${a.name}!`); }
}

export const WEEKLY_CHALLENGES: { id: string; title: string; test: (p: Person) => boolean }[] = [
  { id: "doctor-35", title: "Become a consultant surgeon before 40", test: (p) => p.career === "surgeon" && p.rank >= 3 && p.age < 40 },
  { id: "pm-any", title: "Become Prime Minister", test: (p) => p.career === "pm" && p.rank >= 4 },
  { id: "space-30s", title: "Reach space before you turn 40", test: (p) => p.career === "astronaut" && p.rank >= 2 && p.age < 40 },
  { id: "million-no-fame", title: "Make £1 million with fame under 20", test: (p) => p.money >= 1_000_000 && p.fame < 20 },
  { id: "happy-90", title: "Live to 90 with happiness above 80", test: (p) => p.age >= 90 && p.stats.happiness > 80 },
  { id: "chart-teen", title: "Sign a record deal before 21", test: (p) => p.career === "popstar" && p.rank >= 1 && p.age < 21 },
];
/** The challenge for the ISO week containing `date`. */
export function weeklyChallenge(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const week = Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return WEEKLY_CHALLENGES[(d.getUTCFullYear() * 53 + week) % WEEKLY_CHALLENGES.length];
}

/** Continue as one of your children. */
export function continueAs(p: Person, child: string, seed: number): Person {
  return newLife(seed, { first: child, parent: p });
}

/** JSON can't hold the event's functions; rebuild them after loading. */
export function serialise(p: Person) {
  return JSON.stringify({ ...p, pending: p.pending ? { id: p.pending.id } : null });
}
export function restore(json: string): Person | null {
  try {
    const p = JSON.parse(json) as Person & { pending: { id: string } | null };
    if (!p || typeof p.age !== "number") return null;
    const want = p.pending?.id;
    p.pending = null;
    if (want) {
      const def = EVENTS.find((e) => e.id === want);
      if (def) p.pending = def.make(p);
    }
    return p;
  } catch {
    return null;
  }
}
