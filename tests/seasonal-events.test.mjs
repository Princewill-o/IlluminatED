import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectData } from "../scripts/lib/project-data.mjs";
const S = projectData("src/game/core/seasonal-events.ts");

test("every season has a 2x XP event and Halloween runs today's window", () => {
  for (const season of ["winter", "spring", "summer", "autumn"]) assert.ok(S.SEASONAL.some((e) => e.season === season && e.xpBoost === 2), season);
  assert.equal(S.seasonalEvent(Date.UTC(2026, 9, 31, 12)).event.id, "fright-night");
  assert.equal(S.seasonalEvent(Date.UTC(2026, 11, 25, 12)).event.id, "winter-wonderland");
  assert.equal(S.seasonalEvent(Date.UTC(2027, 1, 10, 12)).event.id, "lunar-new-year");
  assert.equal(S.seasonalEvent(Date.UTC(2026, 5, 1, 12)), null);
});

test("the server's double-XP calendar matches the game's, day by day", () => {
  const sql = fs.readFileSync("supabase/migrations/20261022160000_seasonal_double_xp.sql", "utf8");
  const ranges = [...sql.matchAll(/between (\d+) and (\d+)/g)].map((m) => [+m[1], +m[2]]);
  const lunar = [...sql.matchAll(/'(\d{4}-\d{2}-\d{2})'/g)].map((m) => Date.parse(m[1] + "T12:00:00Z"));
  const server = (t) => {
    const d = new Date(t), md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
    if (md >= 1212 || md <= 104) return 2;
    if (ranges.some(([a, b]) => md >= a && md <= b)) return 2;
    if (lunar.some((l) => t >= l - 86_400_000 - 1 && t <= l + 13 * 86_400_000 + 1)) return 2;
    return 1;
  };
  for (let t = Date.UTC(2026, 0, 1, 12); t < Date.UTC(2028, 0, 1); t += 86_400_000) assert.equal(S.seasonalXp(t), server(t), new Date(t).toISOString().slice(0, 10));
});
