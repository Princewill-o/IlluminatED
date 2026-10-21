/**
 * Life in London beyond study: shops that restore your needs for Clout, getting
 * unwell and getting better, and the law. Start a scuffle and you get wanted
 * stars; the police respond, you may get a court hearing, and if
 * you're found guilty you serve time in prison. Finished homework is a
 * get-out-of-jail-free card. Pure functions; the browser keeps the state.
 */

export const SHOP = {
  drink: { name: "Energy drink", price: 3, blurb: "+35 Energy" },
  meal: { name: "Meal deal", price: 6, blurb: "+45 Hunger, +10 Energy" },
  coffee: { name: "Flat white", price: 2, blurb: "+15 Energy, +10 Focus" },
  medicine: { name: "Medicine", price: 1, blurb: "+30 Energy, helps you feel better" },
} as const;
export type ShopItem = keyof typeof SHOP;

export interface LifeState {
  stars: number;
  /** When the last star was earned (stars fade one at a time after). */
  heatAt: number;
  /** The latest driving charge, retained for a later hearing. Old saves omit it. */
  lastOffence?: string | null;
  sick: boolean;
  /** Prison release time (ms), or 0. */
  jailUntil: number;
  /** A court hearing is waiting. */
  hearing: { stars: number; charge: string } | null;
  cardsUsed: number;
  prisonWork: number;
  /** Prevents an overdue bank loan from reopening the same hearing. */
  bankCourtSeen?: boolean;
}

export const freshLife = (): LifeState => ({ stars: 0, heatAt: 0, lastOffence: null, sick: false, jailUntil: 0, hearing: null, cardsUsed: 0, prisonWork: 0, bankCourtSeen: false });

export const STAR_FADE_MS = 60_000;
export const MAX_STARS = 5;
/** Police only respond from this many stars. Below it, witnesses report you and stars fade if you behave. */
export const POLICE_STARS = 3;

/** Stars fade one every minute you keep out of trouble, until the police are involved. */
export function cooled(s: LifeState, now: number): LifeState {
  if (!s.stars || s.stars >= POLICE_STARS) return s;
  const gone = Math.floor((now - s.heatAt) / STAR_FADE_MS);
  if (gone <= 0) return s;
  const stars = Math.max(0, s.stars - gone);
  return { ...s, stars, heatAt: stars ? s.heatAt + gone * STAR_FADE_MS : 0, lastOffence: stars ? s.lastOffence : null };
}

export function addStar(s: LifeState, now: number, offence?: string): LifeState {
  const c = cooled(s, now);
  return { ...c, stars: Math.min(MAX_STARS, c.stars + 1), heatAt: now, lastOffence: offence?.slice(0, 160) ?? null };
}

/**
 * The rulebook. Every offence is fictional and has a clear consequence; nothing
 * rewards hurting people. Stars stack, so a few small offences in a row bring
 * the police at three stars.
 */
export const OFFENCES = {
  scuffle: { stars: 1, charge: "Causing a scuffle in the street" },
  "red-light": { stars: 1, charge: "Driving through a red light" },
  "wrong-way": { stars: 1, charge: "Driving against traffic" },
  collision: { stars: 1, charge: "Causing a road collision" },
  "pavement-cycling": { stars: 1, charge: "Cycling on the pavement" },
  "fare-dodging": { stars: 1, charge: "Fare dodging on the Underground" },
  littering: { stars: 1, charge: "Littering in a public park" },
  graffiti: { stars: 1, charge: "Spraying graffiti on a listed building" },
  trespass: { stars: 2, charge: "Trespassing in a closed building site" },
  shoplifting: { stars: 2, charge: "Shoplifting from a high-street shop" },
  "car-theft": { stars: 3, charge: "Taking a car without the owner's consent" },
  "resisting-arrest": { stars: 1, charge: "Resisting arrest" },
} as const;
export type Offence = keyof typeof OFFENCES;

/** Commit an offence: adds its stars (capped) and remembers the charge for court. */
export function commit(s: LifeState, now: number, offence: Offence): LifeState {
  let next = s;
  for (let i = 0; i < OFFENCES[offence].stars; i++) next = addStar(next, now, OFFENCES[offence].charge);
  return next;
}

/** What the player sees after an offence below the police threshold. */
export function warningFor(s: LifeState) {
  if (s.stars >= POLICE_STARS) return "The police are responding.";
  const left = POLICE_STARS - s.stars;
  return `Witnesses reported you. ${left} more star${left === 1 ? "" : "s"} and the police respond. Stay out of trouble for a minute and a star fades.`;
}

export const clearWanted = (s: LifeState): LifeState => ({ ...s, stars: 0, heatAt: 0, lastOffence: null });

const CHARGES = ["Causing a scuffle on Oxford Street", "Shoving a commuter at Bank", "Starting a fight by the river", "Disorderly behaviour near Big Ben", "Barging people outside the Tube"];
export const chargeFor = (stars: number) => CHARGES[(stars * 3 + new Date().getMinutes()) % CHARGES.length];
export const wantedCharge = (s: LifeState) => typeof s.lastOffence === "string" && s.lastOffence.trim() ? s.lastOffence.slice(0, 160) : chargeFor(s.stars);

/** Odds of a not-guilty verdict when you plead not guilty. */
export const acquittalChance = (stars: number) => Math.max(0.1, 0.65 - stars * 0.12);
/** Sentence length: 45 seconds per star (it's a game, not a life sentence). */
export const sentenceMs = (stars: number) => Math.max(1, stars) * 45_000;

export const cardsLeft = (homeworkDone: number, s: LifeState) => Math.max(0, homeworkDone - s.cardsUsed);

/** The orange jumpsuit while you're inside. */
export const PRISON_LOOK = { top: "top-tracksuit", topColor: "topcol-orange", bottom: "bottom-joggers", bottomColor: "botcol-orange", hat: "hat-none", held: "held-none" } as const;

/** Every prison exit starts a clean wanted record, without losing study rewards. */
export function releaseFromPrison(s: LifeState): LifeState {
  return { ...clearWanted(s), jailUntil: 0, hearing: null };
}
