import type { LiveEvent } from "./live-events";

/**
 * Seasonal events: one for every season plus the big UK holidays. While one is
 * running it replaces the weekly event, decorates London and doubles XP (Season
 * XP here; level XP and Clout-run XP on the server via
 * private.event_xp_multiplier, which mirrors these exact windows).
 *
 * Windows are London calendar dates, inclusive. Lunar New Year moves each year.
 */
export type Season = "winter" | "spring" | "summer" | "autumn";
export interface SeasonalEvent extends LiveEvent {
  season: Season;
  /** [month 1-12, day] start and end, inclusive. Ends may wrap past New Year. */
  from: [number, number];
  to: [number, number];
  /** World decorations to switch on. */
  decor: "snow" | "lanterns" | "blossom" | "books" | "bunting" | "leaves" | "pumpkins" | "fireworks";
}

const ev = (e: Omit<SeasonalEvent, "xpBoost">): SeasonalEvent => ({ ...e, xpBoost: 2 });

export const SEASONAL: SeasonalEvent[] = [
  ev({ id: "winter-wonderland", season: "winter", name: "Winter Wonderland", blurb: "Snow on the Thames, lights on every street and gifts for every streak. 2× XP all festive season.", href: "/games/heroes?mode=hero", game: "Snowball Rush", colours: ["#1d4e89", "#e8f4ff"], from: [12, 12], to: [1, 4], decor: "snow" }),
  ev({ id: "lunar-new-year", season: "winter", name: "Lunar New Year", blurb: "Lanterns over Chinatown and red-envelope quests. Every correct answer lights another lantern.", href: "/games/heroes?mode=hero", game: "Lantern Rush", colours: ["#b3121f", "#ffd23f"], from: [0, 0], to: [0, 0], decor: "lanterns" }),
  ev({ id: "spring-bloom", season: "spring", name: "Spring Bloom", blurb: "Blossom in the parks and golden eggs hidden around London. Find them all for a spring outfit.", href: "/games/heroes?mode=hero", game: "Bloom Rush", colours: ["#ff8fc7", "#bff0c8"], from: [3, 20], to: [4, 12], decor: "blossom" }),
  ev({ id: "exam-power-up", season: "spring", name: "Exam Power-Up", blurb: "Exam season: double XP for every question you practise. Little and often wins.", href: "/practice", game: "Mixed practice", colours: ["#2b5fd9", "#9be8c4"], from: [5, 4], to: [5, 24], decor: "books" }),
  ev({ id: "summer-festival", season: "summer", name: "Summer Festival", blurb: "Bunting, ice cream vans and a festival stage on the South Bank. Summer quiz cup all holiday.", href: "/games/heroes?mode=cup", game: "Festival Cup", colours: ["#ff9f0a", "#4fd1ff"], from: [7, 20], to: [8, 16], decor: "bunting" }),
  ev({ id: "back-to-school", season: "autumn", name: "Back to School", blurb: "New term, new goals. Set your subjects and get a head start with double XP.", href: "/practice", game: "Starter quizzes", colours: ["#13203a", "#f2d9a6"], from: [9, 1], to: [9, 14], decor: "books" }),
  ev({ id: "autumn-harvest", season: "autumn", name: "Autumn Harvest", blurb: "Golden leaves and a harvest market. Collect acorns from quizzes for autumn looks.", href: "/games/heroes?mode=case", game: "Harvest Case", colours: ["#b45309", "#fde68a"], from: [9, 22], to: [10, 12], decor: "leaves" }),
  ev({ id: "fright-night", season: "autumn", name: "Fright Night", blurb: "Scary Bots have taken over London after dark! Answer their questions to scare them off and collect candy.", href: "/games/world", game: "Scary Bot hunt", colours: ["#1a0f2e", "#ff7a1a"], from: [10, 18], to: [11, 2], decor: "pumpkins" }),
  ev({ id: "bonfire-night", season: "autumn", name: "Bonfire Night", blurb: "Remember, remember: fireworks over the river and a sparkler for every streak.", href: "/games/heroes?mode=space", game: "Firework Rush", colours: ["#0b1026", "#ff4f8b"], from: [11, 3], to: [11, 9], decor: "fireworks" }),
];

/** Lunar New Year's Day for upcoming years (UTC dates). */
const LUNAR: Record<number, [number, number]> = { 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11] };

/** London calendar month/day for a timestamp. */
export function londonDay(now: number): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(now));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

const key = (m: number, d: number) => m * 100 + d;
function inWindow(m: number, d: number, from: [number, number], to: [number, number]) {
  const k = key(m, d), a = key(...from), b = key(...to);
  return a <= b ? k >= a && k <= b : k >= a || k <= b;
}

/** The seasonal event running now, if any, and when it ends (ms). */
export function seasonalEvent(now = Date.now()): { event: SeasonalEvent; endsAt: number } | null {
  const { y, m, d } = londonDay(now);
  const lunar = LUNAR[y];
  for (const e of SEASONAL) {
    let from = e.from, to = e.to;
    if (e.id === "lunar-new-year") {
      if (!lunar) continue;
      const day = Date.UTC(y, lunar[0] - 1, lunar[1]);
      const s = new Date(day - 86_400_000), t = new Date(day + 13 * 86_400_000);
      from = [s.getUTCMonth() + 1, s.getUTCDate()]; to = [t.getUTCMonth() + 1, t.getUTCDate()];
    }
    if (!inWindow(m, d, from, to)) continue;
    const endYear = key(...to) < key(m, d) ? y + 1 : y;
    // Ends at midnight after the last day (UK time is close enough to UTC for a countdown).
    return { event: { ...e, from, to }, endsAt: Date.UTC(endYear, to[0] - 1, to[1] + 1) };
  }
  return null;
}

/** XP multiplier from seasonal events (the weekly event's own boost is separate). */
export const seasonalXp = (now = Date.now()) => (seasonalEvent(now) ? 2 : 1);
