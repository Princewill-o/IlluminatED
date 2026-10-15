/**
 * Levels, XP and Clout. The database (game_finish_run) is the source of truth;
 * these mirror its formulas so the UI can preview rewards instantly. Keep the
 * two in step: tests/game-core.test.mjs checks the SQL uses the same numbers.
 */

/** Total XP needed to reach a level: 0, 100, 300, 600, 1000, … */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export const levelForXp = (xp: number) =>
  Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.08 * Math.max(0, xp))) / 2));

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  return {
    level,
    into: xp - from,
    needed: to - from,
    fraction: (xp - from) / (to - from),
  };
}

export interface RunSummary {
  correct: number;
  rank: number;
}

export const XP_PER_SHIFT = 10;
export const XP_PER_CORRECT = 20;
export const XP_PER_RANK = 10;
export const CLOUT_PER_CORRECT = 10;
export const CLOUT_PER_RANK = 15;

export function rewardsFor(run: RunSummary, dailyBonus: boolean) {
  const xp =
    XP_PER_SHIFT + run.correct * XP_PER_CORRECT + run.rank * XP_PER_RANK;
  const clout =
    (run.correct * CLOUT_PER_CORRECT + run.rank * CLOUT_PER_RANK) *
    (dailyBonus ? 2 : 1);
  return { xp, clout };
}

/** Level titles shown next to the number. Just for fun. */
export function levelTitle(level: number) {
  if (level >= 30) return "Living Legend";
  if (level >= 20) return "Industry Icon";
  if (level >= 12) return "Big Deal";
  if (level >= 8) return "Rising Star";
  if (level >= 4) return "Hard Worker";
  return "Fresh Starter";
}
