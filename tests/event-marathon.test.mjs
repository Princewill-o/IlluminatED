import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const { marathonDates, marathonClosing, MARATHON_PRIZES } = projectData("src/game/core/event-marathon.ts");

test("first marathon gives all players a full November window", () => {
  const dates = marathonDates(new Date("2026-10-23T16:00:00Z"));
  assert.equal(new Date(dates.start).toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(new Date(dates.end).toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(dates.end - dates.start, 30 * 86400000);
  assert.match(marathonClosing(dates.end), /30 November 2026/);
  assert.deepEqual(Array.from(MARATHON_PRIZES), [50, 25, 10]);
});

test("month ending remains London midnight through daylight saving", () => {
  const dates = marathonDates(new Date("2027-03-23T12:00:00Z"));
  assert.equal(new Date(dates.end).toISOString(), "2027-03-31T23:00:00.000Z");
  assert.match(marathonClosing(dates.end), /31 March 2027/);
  assert.equal(dates.end - dates.start, 30 * 86400000);
});
