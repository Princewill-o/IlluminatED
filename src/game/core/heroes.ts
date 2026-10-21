/**
 * The Lumen League: IlluminatED's own superheroes. Every hero, name, emblem and
 * power here is original (no film, comic or TV characters). Each hero is tied to
 * a subject: in Hero Rush, answering that subject's questions charges their power.
 */
export interface Hero {
  id: string;
  name: string;
  subject: string;
  /** Topic title words that count as this hero's subject. */
  topics: RegExp;
  power: string;
  tagline: string;
  /** Suit, trim, cape/accent colours. */
  colours: { suit: string; trim: string; accent: string };
  /** Head piece and emblem on the chibi kit (art/blender/chibi.py). */
  gear: "visor" | "goggles" | "mask" | "flaskhelm" | "crest" | "pixelvisor";
  emblem: "sigma" | "bolt" | "leaf" | "pixel" | "quill" | "flask";
  cape: boolean;
}

export const HEROES: Hero[] = [
  { id: "quotient", name: "Captain Quotient", subject: "Maths", topics: /algebra|number|ratio|geometry|probability|statistic|graph|equation|fraction|percent|quadratic|math/i, power: "Divide and Conquer: splits the boss's shield in two", tagline: "Every problem has a solution.", colours: { suit: "#2b5fd9", trim: "#55f0d0", accent: "#ff9f1c" }, gear: "visor", emblem: "sigma", cape: true },
  { id: "photon", name: "Photon", subject: "Physics", topics: /force|energy|electric|wave|motion|physics|atom|magnet|circuit|radiation|light/i, power: "Speed of Light: strikes first, every round", tagline: "Faster than your doubts.", colours: { suit: "#0f9a8a", trim: "#ffe14d", accent: "#14123a" }, gear: "goggles", emblem: "bolt", cape: false },
  { id: "helix", name: "Helix", subject: "Biology", topics: /cell|biolog|organ|gene|dna|ecosystem|enzyme|heart|plant|evolution|infection|photosynth/i, power: "Regenerate: heals the team after a wrong answer", tagline: "Grow stronger every day.", colours: { suit: "#2e9d55", trim: "#c9f2a6", accent: "#1d5e34" }, gear: "mask", emblem: "leaf", cape: true },
  { id: "catalyst", name: "Catalyst", subject: "Chemistry", topics: /chemi|atom|bond|reaction|acid|periodic|element|compound|mole|electroly|carbon/i, power: "Chain Reaction: each streak hit adds bonus damage", tagline: "Small sparks, big change.", colours: { suit: "#f07d1a", trim: "#fff1c4", accent: "#7a2e0a" }, gear: "flaskhelm", emblem: "flask", cape: false },
  { id: "byte", name: "Byte", subject: "Computer Science", topics: /comput|algorithm|program|data|binary|network|cyber|code|logic/i, power: "Overclock: double damage for three answers", tagline: "Debugging the impossible.", colours: { suit: "#6a4bd6", trim: "#55f0d0", accent: "#14123a" }, gear: "pixelvisor", emblem: "pixel", cape: false },
  { id: "quill", name: "Quill", subject: "English and History", topics: /english|poem|poetry|novel|shakespeare|language|history|war|empire|revolution|monarch|essay/i, power: "Plot Twist: turns one wrong answer into a hit", tagline: "Write your own ending.", colours: { suit: "#8c2f4a", trim: "#f2d9a6", accent: "#3a1626" }, gear: "crest", emblem: "quill", cape: true },
];

export const heroById = (id: string) => HEROES.find((h) => h.id === id);

/** The villain of every Hero Rush: Fog, who makes people forget what they learned. */
export const VILLAIN = { name: "The Fog", tagline: "Forget it all…", hp: 1000 } as const;
