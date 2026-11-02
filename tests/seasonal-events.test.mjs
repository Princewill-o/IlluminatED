import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectData } from "../scripts/lib/project-data.mjs";
const S = projectData("src/game/core/seasonal-events.ts");
const L = projectData("src/game/core/live-events.ts");

test("every season retains learning events while Halloween is removed permanently", () => {
  for (const season of ["winter", "spring", "summer", "autumn"]) assert.ok(S.SEASONAL.some((e) => e.season === season && e.xpBoost === 2), season);
  assert.ok(S.SEASONAL.every(e=>e.id!=="fright-night"&&e.decor!=="pumpkins"));
  for(const year of[2026,2027,2028,2030])for(const [month,day]of[[9,18],[9,31],[10,1],[10,2]]){
    const now=Date.UTC(year,month,day,12);
    assert.equal(S.seasonalEvent(now),null);
    assert.ok(L.EVENTS.some(e=>e.id===L.currentEvent(now).event.id));
    assert.equal(S.seasonalXp(now),1);
  }
  assert.equal(S.seasonalEvent(Date.UTC(2026, 11, 25, 12)).event.id, "winter-wonderland");
  assert.equal(S.seasonalEvent(Date.UTC(2027, 1, 10, 12)).event.id, "lunar-new-year");
  assert.equal(S.seasonalEvent(Date.UTC(2026, 5, 1, 12)), null);
});

test("retained seasonal windows match the historical server calendar", () => {
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
  // The immutable old migration still grants the removed October event's bonus.
  // It is not replayed or edited by this presentation change.
  for (let t = Date.UTC(2026, 0, 1, 12); t < Date.UTC(2028, 0, 1); t += 86_400_000){
    const d=new Date(t),md=(d.getUTCMonth()+1)*100+d.getUTCDate();
    if(md>=1018&&md<=1102)continue;
    assert.equal(S.seasonalXp(t), server(t), new Date(t).toISOString().slice(0, 10));
  }
});
