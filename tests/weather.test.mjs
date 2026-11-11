import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const G = projectData("src/game/core/weather-gear.ts");
const N = projectData("src/game/core/needs.ts");

test("you put a coat on outdoors in rain, snow and cold, and keep your own colours", () => {
  const me = { top: "top-blocky-casual-teal", hat: "hat-none" };
  assert.equal(G.weatherGear(me, "Sunny", 14), null);
  assert.deepEqual({ ...G.weatherGear(me, "Light rain", 10) }, { top: "top-blocky-raincoat-teal", shoes: "shoes-blocky-raincoat-teal" });
  assert.equal(G.weatherGear(me, "Thunderstorm", 15).top, "top-blocky-raincoat-teal");
  assert.equal(G.weatherGear(me, "Snow", 0).hat, "hat-beanie");
  assert.equal(G.weatherGear(me, "Cloudy", 2).hat, "hat-beanie", "a cold snap needs a hat too");
  assert.equal(G.weatherGear({ ...me, hat: "hat-crown" }, "Snow", 0).hat, undefined, "a hat you chose stays on");
  assert.equal(G.weatherGear({ top: "top-hoodie" }, "Drizzle", 9).top, "top-blocky-raincoat-navy");
  for (const why of ["rain", "snow", "cold"]) assert.ok(G.GEAR_MESSAGE[why]);
});

test("the shared forecast includes storms and heavy snow, and snow is always freezing", () => {
  const seen = new Set();
  for (let i = 0; i < 400; i++) { const w = N.weatherAt(new Date(Date.UTC(2026, 0, 1) + i * 180_000)); seen.add(w.kind); if (/snow/i.test(w.kind)) assert.ok(w.temp <= 1); }
  for (const k of ["Thunderstorm", "Heavy rain", "Heavy snow", "Snow", "Sunny", "Fog"]) assert.ok(seen.has(k), k);
});
