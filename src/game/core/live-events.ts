/**
 * Live events: a new themed week every Monday, the same for every player on
 * every server. Each event has its own game, world decorations and rewards.
 * Themes are inspired by genres (superheroes, space, detectives, sport), never by
 * real shows or brands.
 */
import { seasonalEvent } from "./seasonal-events";

export interface LiveEvent {
  id: string;
  name: string;
  blurb: string;
  /** Where the event's game lives. */
  href: string;
  game: string;
  colours: [string, string];
  /** Season XP multiplier while the event runs. */
  xpBoost: number;
}

export const EVENTS: LiveEvent[] = [
  { id: "hero-week", name: "Hero Week", blurb: "The Fog is wiping London's memory. Suit up as the Lumen League and answer to fight back.", href: "/games/heroes", game: "Hero Rush", colours: ["#2b5fd9", "#ffd23f"], xpBoost: 2 },
  { id: "space-week", name: "Mission to Orbit", blurb: "Launch a rocket a stage at a time: each correct answer fuels the next burn.", href: "/games/heroes?mode=space", game: "Orbit Rush", colours: ["#14123a", "#7cc4ff"], xpBoost: 1.5 },
  { id: "detective-week", name: "Case Files", blurb: "A mystery on the Thames. Every answer is a clue; solve the case before the tide turns.", href: "/games/heroes?mode=case", game: "Case Rush", colours: ["#3a2d1c", "#f2c14e"], xpBoost: 1.5 },
  { id: "sports-week", name: "Championship Week", blurb: "Knockout quiz matches: win your group, then the final.", href: "/games/heroes?mode=cup", game: "Cup Rush", colours: ["#0f7a52", "#ffffff"], xpBoost: 1.5 },
];

const WEEK = 7 * 24 * 60 * 60 * 1000;
/** Weeks since Monday 5 January 2026 (UTC). */
const weekIndex = (now: number) => Math.floor((now - Date.UTC(2026, 0, 5)) / WEEK);

/**
 * The event running now. Seasonal events (every season and the big holidays,
 * all 2× XP) take priority; otherwise Hero Week runs every other week and the
 * other genres rotate in between.
 */
export function currentEvent(now = Date.now()): { event: LiveEvent; endsAt: number } {
  const seasonal = seasonalEvent(now);
  if (seasonal) return seasonal;
  const w = weekIndex(now);
  const event = w % 2 === 0 ? EVENTS[0] : EVENTS[1 + (Math.floor(w / 2) % (EVENTS.length - 1))];
  return { event, endsAt: Date.UTC(2026, 0, 5) + (w + 1) * WEEK };
}

export const timeLeft = (endsAt: number, now = Date.now()) => {
  const h = Math.max(0, Math.floor((endsAt - now) / 3_600_000));
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h left`;
};
