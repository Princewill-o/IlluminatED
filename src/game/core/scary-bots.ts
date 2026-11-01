import { placesFor } from "./map-guide";
import { TILE, safeSpot, type WorldMap } from "./world";

/**
 * Fright Night's Scary Bots: friendly-spooky robots with pumpkin heads that
 * hover around London's busiest spots. Walk up, press E and answer their
 * question to scare them off for candy and XP. Positions are a pure function of
 * time, so every player on a server sees the same bots in the same places.
 */
export interface ScaryBot {
  id: string;
  name: string;
  /** Patrol endpoints (world px). */
  a: { x: number; y: number };
  b: { x: number; y: number };
  /** Seconds for one sweep a → b. */
  period: number;
  /** Their taunt, shown above them. */
  taunt: string;
}

const NAMES = ["Boltergeist", "Gourdon", "Spookbot 3000", "Pumpkintron", "Byte Fright", "Count Codeula", "Wraithwire", "Jack-o-Droid", "Hexacog", "Ghoulgear", "Fang Drive", "Mummybyte", "Creaky Circuit", "Nightrune"];
const TAUNTS = [
  "Boo! Bet you can't answer my question…",
  "My circuits say you skipped revision. Prove me wrong!",
  "Answer me this, or I'll haunt your homework!",
  "Trick or treat? I'm the TRICK. Question time!",
  "Bzzt… nobody gets past without a correct answer.",
  "I've eaten 400 flashcards. Your turn.",
  "Spooky question incoming. Are you brave enough?",
];

let cache: { map: WorldMap; bots: ScaryBot[] } | null = null;

/** The bots for a map (London only): one near each well-known place. */
export function scaryBotsFor(map: WorldMap): ScaryBot[] {
  if (map.art !== "london") return [];
  if (cache?.map === map) return cache.bots;
  const spots = placesFor(map).filter((p) => ["landmark", "food", "games", "study", "station", "view", "university", "job"].includes(p.kind));
  const bots: ScaryBot[] = [];
  // Spread out: skip places within 10 tiles of a bot we already placed.
  for (const p of spots) {
    if (bots.length >= NAMES.length) break;
    if (bots.some((b) => Math.hypot(b.a.x - p.x, b.a.y - p.y) < 10 * TILE)) continue;
    const i = bots.length;
    const a = safeSpot(map, p.x + 2 * TILE, p.y + 2 * TILE);
    const b = safeSpot(map, a.x + (i % 2 ? 4 : -4) * TILE, a.y + (i % 3 === 0 ? 3 : 0) * TILE);
    bots.push({ id: `bot-${i}`, name: NAMES[i], a, b, period: 7 + (i % 4) * 1.5, taunt: TAUNTS[i % TAUNTS.length] });
  }
  cache = { map, bots };
  return bots;
}

/** Where a bot is at time t (seconds): an eased back-and-forth hover, plus facing. */
export function botPose(bot: ScaryBot, t: number) {
  const ph = (t / bot.period) % 2;
  const k = ph < 1 ? ph : 2 - ph;
  const e = k * k * (3 - 2 * k);
  const dir = ph < 1 ? 1 : -1;
  return {
    x: bot.a.x + (bot.b.x - bot.a.x) * e,
    y: bot.a.y + (bot.b.y - bot.a.y) * e,
    heading: Math.atan2((bot.b.y - bot.a.y) * dir, (bot.b.x - bot.a.x) * dir),
    bob: Math.sin(t * 3 + bot.period) * 0.08,
  };
}

/** How close (px) you must be to challenge a bot. */
export const BOT_REACH = 1.8 * TILE;

/** Bots you've scared off today come back tomorrow; candy is kept for the event. */
export const CANDY_KEY = "illuminated:fright-night";
export interface FrightState { day: string; scared: string[]; candy: number }
export function frightState(raw: string | null, today: string): FrightState {
  try {
    const s = raw ? (JSON.parse(raw) as FrightState) : null;
    if (s && typeof s.candy === "number" && Array.isArray(s.scared)) return s.day === today ? s : { day: today, scared: [], candy: s.candy };
  } catch { /* fresh start */ }
  return { day: today, scared: [], candy: 0 };
}
