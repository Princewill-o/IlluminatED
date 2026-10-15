import type { Company } from "./companies";
import { type Rng, pick } from "./rng";
import { RANKS } from "./shift";

export const TIMEOUT_LINES = [
  "You were in a meeting about meetings.",
  "You went to make a tea. It took a while.",
  "Your Wi-Fi chose violence.",
  "You were still reading the email signature.",
];

export const SKIP_LINES = [
  "You blamed the intern. The intern is you. Nobody noticed.",
  "Task delegated to 'future you'. Bold.",
  "The intern took the fall. Nice work, morally questionable.",
];

export function streakBanner(streak: number) {
  if (streak >= 9) return "UNSTOPPABLE · HR is scared of you";
  if (streak >= 6) return "ON FIRE · your LinkedIn is trending";
  if (streak >= 3) return "Heating up · the office is whispering";
  return null;
}

export function feedbackLine(
  rng: Rng,
  company: Company,
  r: { correct: boolean; timedOut: boolean; skipped: boolean },
) {
  if (r.skipped) return pick(rng, SKIP_LINES);
  if (r.timedOut) return pick(rng, TIMEOUT_LINES);
  return pick(rng, r.correct ? company.wins : company.fails);
}

export function promotionLine(rank: number) {
  const r = RANKS[rank];
  return { title: r.title, perk: r.perk };
}

/** The end-of-shift "performance review". */
export function reviewLine(
  company: Company,
  r: { fired: boolean; rank: number; accuracy: number },
) {
  const boss = company.boss.name;
  if (r.fired)
    return `${boss} has asked you to "take some time to reflect". Security will walk you to the lobby. Your Clout is safe, though.`;
  if (r.rank >= 7)
    return `${boss} has resigned so you can have the whole planet. Galactic.`;
  if (r.rank >= 6)
    return `${boss} is now your assistant. They're taking it surprisingly well.`;
  if (r.rank >= 4)
    return `${boss} says you're "a real asset". They've never said that before. To anyone.`;
  if (r.accuracy >= 70)
    return `${boss} says: "Solid shift. Come back tomorrow, superstar."`;
  return `${boss} says: "Everyone starts somewhere. Usually not in the stationery cupboard, but still."`;
}
