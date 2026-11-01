import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const { NETWORKING_EVENTS, NETWORKING_VENUES, eventAt, timeLeft } = projectData("src/game/core/networking.ts");
const { venueMap } = projectData("src/game/core/venues.ts");

test("every networking guest has three replies and a valid best answer", () => {
  for (const e of NETWORKING_EVENTS) {
    assert.equal(e.guests.length, 3);
    for (const g of e.guests) {
      assert.equal(g.replies.length, 3);
      assert.ok([0, 1, 2].includes(g.best));
      assert.ok(g.why.length > 20);
    }
  }
});

test("events rotate every half hour and venues are offset", () => {
  const t = Date.UTC(2026, 9, 23, 16, 5);
  const a = eventAt("town-hall", t), b = eventAt("town-hall", t + 30 * 60_000);
  assert.notEqual(a.event.id, b.event.id);
  assert.equal(a.next.id, b.event.id);
  assert.ok(a.endsAt > t && a.endsAt - t <= 30 * 60_000);
  assert.notEqual(eventAt("starbucks", t).event.id, a.event.id);
  assert.equal(timeLeft(a.endsAt, a.endsAt - 25 * 60_000), "25 minutes left");
});

test("every networking venue has a networking portal up on its deck", () => {
  for (const id of Object.keys(NETWORKING_VENUES)) {
    const map = venueMap(`venue-${id}`);
    const portal = map.portals.find((p) => p.to.kind === "networking");
    assert.ok(portal, id);
    assert.equal(portal.level, 1);
    const x = Math.floor(portal.rect.x / 32), y = Math.floor(portal.rect.y / 32);
    assert.equal(map.deck.tiles[y][x], ".", `${id} portal tile is walkable on the deck`);
  }
});
