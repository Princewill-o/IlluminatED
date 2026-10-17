import type { Avatar } from "./cosmetics";
import type { GeneratorKind } from "./generators";

/**
 * Unofficial educational workplace simulations with cartoon brand badges.
 * Real companies do not sponsor or endorse these activities. Each company maps to real
 * courses (by existing course id) so a shift is genuine revision in disguise.
 */
export interface Company {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  /** What you're revising, in plain words, shown on the building. */
  revises: string;
  boss: { name: string; title: string; look: Partial<Avatar> };
  /** Existing course ids from src/lib/data/courses.ts. */
  courseIds: string[];
  generators: GeneratorKind[];
  /** Flat accent colour for the building. Purple and black do the rest. */
  accent: string;
  building: BuildingShape;
  /** Shown when you get one right. {boss} is replaced with the boss's name. */
  wins: string[];
  /** Comic workplace disasters for a wrong answer. Never mean about the player. */
  fails: string[];
  /** Cosmetic unlocked the first time you reach CEO here. */
  ceoReward: string;
}

export type BuildingShape =
  | "tower"
  | "dome"
  | "barn"
  | "hospital"
  | "factory"
  | "courthouse"
  | "cinema"
  | "bakery"
  | "crane"
  | "stadium"
  | "nursery"
  | "globe";

export const COMPANIES: Company[] = [
  {
    id: "goggle",
    name: "Google",
    tagline: "We know what you'll search before you do.",
    sector: "Tech",
    revises: "Computer Science",
    boss: { name: "Gigi Byte", title: "Chief Vibes Officer", look: { skin: "skin-2", hair: "hair-bob", hairColor: "haircol-purple", face: "face-vr", top: "top-hoodie", bottom: "bottom-joggers", shoes: "shoes-hightops", mouth: "mouth-grin", held: "held-phone" } },
    courseIds: [
      "gcse-computer-science",
      "alevel-computer-science",
      "tlevel-digital-production",
    ],
    generators: ["binary", "denary", "hex", "data-units"],
    accent: "#6bc6ff",
    building: "tower",
    wins: [
      "Gigi Byte gives you a thumbs up from the nap pod.",
      "Your code compiled first time. Nobody believes you.",
      "You've been added to the cool Slack channel.",
      "The algorithm has noticed you. Respect.",
    ],
    fails: [
      "You pushed straight to production. The website is now in Comic Sans.",
      "You searched 'how to do my job' on the company computer.",
      "You unplugged the main server to charge your phone.",
      "Your password was 'password'. It was everyone's password.",
    ],
    ceoReward: "pet-robot",
  },
  {
    id: "macrosoft",
    name: "Microsoft",
    tagline: "Have you tried turning it off and on again?",
    sector: "IT support",
    revises: "IT and Digital Support",
    boss: {
      name: "Kevin From IT",
      title: "Head of Turning It Off and On", look: { skin: "skin-1", hair: "hair-bald", face: "face-round", top: "top-polo", bottom: "bottom-cargo", shoes: "shoes-sliders", held: "held-coffee", eyes: "eyes-sleepy", brows: "brows-bold", mouth: "mouth-small" } },
    courseIds: ["btec-it", "tlevel-digital-support", "gcse-computer-science"],
    generators: ["data-units", "binary", "denary"],
    accent: "#5fd3a5",
    building: "factory",
    wins: [
      "Kevin From IT slow-claps. It takes eleven minutes.",
      "Ticket closed. The user said 'thanks', which never happens.",
      "You fixed the printer. Legends will be told.",
      "Your update installed without a single restart. Witchcraft.",
    ],
    fails: [
      "You told the CEO to 'just restart it'. It was a coffee machine.",
      "You opened an email called 'FREE PIZZA.exe'.",
      "The printer has jammed. It has also achieved self-awareness.",
      "You replied-all to 4,000 people with 'ok'.",
    ],
    ceoReward: "held-laptop",
  },
  {
    id: "barklays",
    name: "Barclays",
    tagline: "Make your money skills count.",
    sector: "Banking",
    revises: "Maths and money",
    boss: {
      name: "Sir Woofington III",
      title: "Chief Treat Officer", look: { head: "head-dog", top: "top-suit", bottom: "bottom-smart", shoes: "shoes-smart", hat: "hat-crown", held: "held-briefcase", eyes: "eyes-sparkle", mouth: "mouth-cheeky", face: "face-monocle" } },
    courseIds: [
      "gcse-maths",
      "alevel-maths",
      "core-maths",
      "functional-skills-maths",
      "alevel-further-maths",
    ],
    generators: ["percent", "percent-change", "interest", "ratio", "times"],
    accent: "#ffd166",
    building: "dome",
    wins: [
      "Sir Woofington III wags approvingly. The vault shakes.",
      "Interest calculated perfectly. The dogs howl in celebration.",
      "You balanced the books. And a biscuit on your nose.",
      "Promotion to Good Boy (honorary) is under review.",
    ],
    fails: [
      "You paid a customer in dog biscuits. They were not a dog.",
      "Sir Woofington III buried the cash again. You helped.",
      "You lent £1,000,000 to a squirrel. It has not paid it back.",
      "You chased the postman instead of the deadline.",
    ],
    ceoReward: "pet-dog",
  },
  {
    id: "tescow",
    name: "Tesco",
    tagline: "Big ideas, everyday essentials.",
    sector: "Retail",
    revises: "Business and Economics",
    boss: { name: "Daisy", title: "Regional Manager (Dairy)", look: { head: "head-cow", top: "top-apron", bottom: "bottom-skirt", shoes: "shoes-boots", eyes: "eyes-sparkle", mouth: "mouth-smile", held: "held-phone" } },
    courseIds: ["btec-business", "alevel-economics", "tlevel-accounting"],
    generators: ["best-buy", "profit", "percent", "ratio"],
    accent: "#ff8fd1",
    building: "barn",
    wins: [
      "Daisy moos. In cow, that's 'employee of the month'.",
      "Profits are up. So is morale. So is a cow, somehow.",
      "You found the best deal in the shop. Shoppers weep.",
      "Self-checkout said 'thank you'. It never says that.",
    ],
    fails: [
      "Unexpected item in the bagging area. It's you.",
      "You priced every banana at £400.",
      "You stacked the eggs at the bottom. RIP eggs.",
      "A cow escaped from head office. It was the CFO.",
    ],
    ceoReward: "pet-cow",
  },
  {
    id: "st-plasters",
    name: "St Plaster's Hospital",
    tagline: "Now with 40% fewer 'oops'.",
    sector: "Health",
    revises: "Biology and Health",
    boss: { name: "Dr Ow", title: "Head of Ouchology", look: { skin: "skin-5", hair: "hair-short", hairColor: "haircol-silver", top: "top-labcoat", bottom: "bottom-smart", shoes: "shoes-smart", extras: "extras-plaster", eyes: "eyes-focused", brows: "brows-raised", mouth: "mouth-smirk" } },
    courseIds: [
      "gcse-biology",
      "alevel-biology",
      "btec-health-social-care",
      "tlevel-health",
      "tlevel-healthcare-science",
      "gcse-combined-science",
    ],
    generators: ["magnification", "micro-units"],
    accent: "#ff7a6b",
    building: "hospital",
    wins: [
      "Dr Ow nods. It's the most emotion anyone has seen from Dr Ow.",
      "Diagnosis correct. The patient high-fives you (carefully).",
      "You found the cells. Under the microscope, not the sofa.",
      "The ward round went perfectly. Suspiciously perfectly.",
    ],
    fails: [
      "You put the plaster on the wrong leg. And the wrong patient.",
      "You prescribed 'a nice sit down'. It almost worked.",
      "You mistook the stethoscope for headphones. Bad playlist.",
      "The skeleton in the classroom quit after your explanation.",
    ],
    ceoReward: "top-labcoat",
  },
  {
    id: "tesler",
    name: "Tesla",
    tagline: "Self-driving, self-parking, self-esteem issues.",
    sector: "Engineering",
    revises: "Physics and Engineering",
    boss: { name: "Volt Ramirez", title: "Chief Zoom Officer", look: { skin: "skin-4", hair: "hair-mohawk", hairColor: "haircol-green", hat: "hat-hardhat", top: "top-hivis", bottom: "bottom-cargo", shoes: "shoes-boots", mouth: "mouth-laugh", eyes: "eyes-sparkle" } },
    courseIds: ["gcse-physics", "alevel-physics", "btec-engineering"],
    generators: ["speed", "ohm", "power", "weight", "density"],
    accent: "#f2d9a6",
    building: "factory",
    wins: [
      "Volt Ramirez revs approvingly. Indoors.",
      "Your car drove itself to the right answer.",
      "Circuit complete. The lights came on. So did your career.",
      "Physics: obeyed. Engineers: impressed.",
    ],
    fails: [
      "The self-driving car drove itself to Greggs for a sausage roll.",
      "You plugged the car into the toaster.",
      "The prototype is now in orbit. That wasn't the plan.",
      "You confused volts with vibes. Easy mistake.",
    ],
    ceoReward: "hat-hardhat",
  },
  {
    id: "gregz",
    name: "Greggs",
    tagline: "Sausage rolls and chemical bonds since forever.",
    sector: "Food science",
    revises: "Chemistry and Applied Science",
    boss: { name: "Pastry Pete", title: "Head of Flaky Things", look: { skin: "skin-1", hair: "hair-curly", hairColor: "haircol-ginger", hat: "hat-chef", top: "top-apron", bottom: "bottom-tartan", shoes: "shoes-boots", held: "held-croissant", extras: "extras-freckles", mouth: "mouth-grin" } },
    courseIds: [
      "gcse-chemistry",
      "alevel-chemistry",
      "btec-applied-science",
      "tlevel-science",
    ],
    generators: ["formula-mass", "moles"],
    accent: "#ffb26b",
    building: "bakery",
    wins: [
      "Pastry Pete gives you a warm sausage roll of approval.",
      "Reaction balanced. Pastry risen. Life complete.",
      "The oven is at exactly the right temperature. Science.",
      "Your molecules are as tight as the queue at 8am.",
    ],
    fails: [
      "You added baking soda to the vinegar dressing. Kitchen: foamed.",
      "You set fire to the water. Somehow.",
      "You labelled salt as sugar. Doughnuts are now a crime scene.",
      "The steak bake is now a steak volcano.",
    ],
    ceoReward: "hat-chef",
  },
  {
    id: "lawz",
    name: "Lawz & Order LLP",
    tagline: "Objection! (to Mondays).",
    sector: "Law",
    revises: "Law, English, History and Psychology",
    boss: {
      name: "Judge Mental",
      title: "Senior Partner of Opinions", look: { skin: "skin-3", hair: "hair-afro", hairColor: "haircol-silver", top: "top-tux", bottom: "bottom-smart", shoes: "shoes-smart", face: "face-monocle", brows: "brows-fierce", mouth: "mouth-smirk", eyes: "eyes-focused" } },
    courseIds: [
      "tlevel-legal-services",
      "gcse-english-language",
      "gcse-english-literature",
      "alevel-english-literature",
      "gcse-history",
      "alevel-history",
      "alevel-psychology",
    ],
    generators: ["grammar"],
    accent: "#8fb4ff",
    building: "courthouse",
    wins: [
      "Judge Mental bangs the gavel. On the table this time.",
      "Case closed. Briefcase also closed. Very professional.",
      "The jury is impressed. The jury is also a pigeon.",
      "Sustained! Nobody knows what that means but it sounds good.",
    ],
    fails: [
      "You said 'your honour' to the vending machine.",
      "You read the shopping list out in court.",
      "Your closing argument was just the word 'vibes'.",
      "You objected to your own question.",
    ],
    ceoReward: "face-monocle",
  },
  {
    id: "netflics",
    name: "Netflix",
    tagline: "Are you still revising?",
    sector: "Media",
    revises: "Creative Media and English",
    boss: { name: "Binge McWatch", title: "Head of Next Episode", look: { skin: "skin-7", hair: "hair-long", hairColor: "haircol-pink", face: "face-shades", top: "top-hoodie", bottom: "bottom-joggers", shoes: "shoes-sliders", mouth: "mouth-cheeky", held: "held-phone" } },
    courseIds: [
      "btec-creative-media",
      "gcse-english-language",
      "functional-skills-english",
    ],
    generators: ["grammar"],
    accent: "#ff7a6b",
    building: "cinema",
    wins: [
      "Binge McWatch skips the intro to applaud you.",
      "Your show got renewed for 47 seasons.",
      "Plot twist: you're brilliant at this.",
      "That answer had main character energy.",
    ],
    fails: [
      "You spoiled the finale for the whole office.",
      "You hit 'play next episode' on the company presentation.",
      "The trailer you edited is just 2 minutes of a cat.",
      "You fell asleep during the meeting. It was a film. Still counts.",
    ],
    ceoReward: "face-shades",
  },
  {
    id: "bodge",
    name: "Bodge & Sons Builders",
    tagline: "Measure twice, cut once, panic thrice.",
    sector: "Construction",
    revises: "Construction and Maths",
    boss: { name: "Big Sue", title: "Foreman of Fabulousness", look: { skin: "skin-6", hair: "hair-braids", hairColor: "haircol-black", hat: "hat-hardhat", top: "top-hivis", bottom: "bottom-jeans", shoes: "shoes-boots", brows: "brows-bold", mouth: "mouth-grin", eyes: "eyes-focused" } },
    courseIds: [
      "tlevel-construction-design",
      "tlevel-onsite-construction",
      "btec-engineering",
      "functional-skills-maths",
    ],
    generators: ["area", "volume", "scale", "perimeter"],
    accent: "#ffd166",
    building: "crane",
    wins: [
      "Big Sue gives you the nod. The rarest nod.",
      "The wall is straight. The spirit level cried.",
      "Measured perfectly. Cut perfectly. Tea break earned.",
      "The building is still standing. Great sign.",
    ],
    fails: [
      "You built the stairs going down from the roof.",
      "You used jelly instead of cement. It wobbles beautifully.",
      "The house is lovely. It has no door.",
      "You measured in bananas. The client wanted metres.",
    ],
    ceoReward: "top-hivis",
  },
  {
    id: "psyke",
    name: "Nike",
    tagline: "Just do it. Eventually.",
    sector: "Sport",
    revises: "Sport and Physical Education",
    boss: {
      name: "Coach Sweats",
      title: "Head of Cardio and Chaos", look: { skin: "skin-8", hair: "hair-buzz", hat: "hat-cap", top: "top-tracksuit", bottom: "bottom-joggers", shoes: "shoes-trainers", extras: "extras-paint", mouth: "mouth-laugh", brows: "brows-raised" } },
    courseIds: ["btec-sport", "gcse-biology"],
    generators: ["pace", "speed", "percent"],
    accent: "#f2d9a6",
    building: "stadium",
    wins: [
      "Coach Sweats blows the whistle. A happy whistle.",
      "Personal best! Your trainers are proud.",
      "That answer did 20 press-ups on its own.",
      "Crowd goes wild. The crowd is three pigeons. Still wild.",
    ],
    fails: [
      "You tied your laces together. Before the race.",
      "You ran the marathon in the wrong direction.",
      "You warmed up for three hours and missed the match.",
      "You passed the ball to the referee. Twice.",
    ],
    ceoReward: "top-tracksuit",
  },
  {
    id: "tiny-humans",
    name: "Tiny Humans Nursery",
    tagline: "Small people. Big feelings. Glitter everywhere.",
    sector: "Education",
    revises: "Early Years and Education",
    boss: { name: "Miss Crayola", title: "Head of Snack Time", look: { skin: "skin-2", hair: "hair-buns", hairColor: "haircol-blue", hat: "hat-party", top: "top-stripes", bottom: "bottom-skirt", shoes: "shoes-skates", extras: "extras-star", eyes: "eyes-sparkle", mouth: "mouth-laugh" } },
    courseIds: [
      "tlevel-education-early-years",
      "btec-health-social-care",
      "epq",
    ],
    generators: ["times", "percent"],
    accent: "#ff8fd1",
    building: "nursery",
    wins: [
      "Miss Crayola gives you a gold star sticker. On your forehead.",
      "Everybody shared nicely. A historic day.",
      "Nap time went to plan. Truly the impossible.",
      "You got a hand-drawn card. It's a horse. Or you.",
    ],
    fails: [
      "You let the class choose lunch. It was 100% biscuits.",
      "The glitter is out. The glitter will never be gone.",
      "You read the bedtime story. You fell asleep first.",
      "The hamster is in charge now.",
    ],
    ceoReward: "held-trophy",
  },
  {
    id: "atlas",
    name: "Atlas & Co. Travel",
    tagline: "We've never lost a tourist on purpose.",
    sector: "Travel",
    revises: "Geography and History",
    boss: {
      name: "Captain Compass",
      title: "Director of Getting Lost", look: { skin: "skin-4", hair: "hair-quiff", hairColor: "haircol-brown", hat: "hat-explorer", top: "top-denim", bottom: "bottom-cargo", shoes: "shoes-boots", held: "held-compass", eyes: "eyes-wink", mouth: "mouth-grin" } },
    courseIds: ["gcse-geography", "gcse-history", "alevel-history"],
    generators: ["scale", "speed", "percent-change"],
    accent: "#6bc6ff",
    building: "globe",
    wins: [
      "Captain Compass points at you. Finally, a direction.",
      "You found the right country. On the first go!",
      "Map read correctly. Upside-down for style.",
      "The tour group survived. Five stars.",
    ],
    fails: [
      "You booked a beach holiday to the North Pole.",
      "You held the map upside down. Australia is now on top.",
      "You said 'it's just round the corner'. It was in France.",
      "The tour bus is on a ferry. Nobody knows how.",
    ],
    ceoReward: "hat-explorer",
  },
];

export const companyById = (id: string) => COMPANIES.find((c) => c.id === id);

/** Companies that match the learner's own courses come first. */
export function rankCompaniesFor(courseIds: string[]): Company[] {
  const mine = new Set(courseIds);
  const score = (c: Company) => c.courseIds.filter((id) => mine.has(id)).length;
  return COMPANIES.map((c, i) => ({ c, i, s: score(c) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}

export const isRecommended = (c: Company, courseIds: string[]) =>
  c.courseIds.some((id) => courseIds.includes(id));
