import assert from "node:assert/strict";
import test from "node:test";
import { worldHarness, flush } from "./helpers/world-harness.mjs";
import { projectData } from "../scripts/lib/project-data.mjs";

const { joinGameChannel } = projectData("src/lib/realtime.ts");

test("private rooms authenticate before subscribing and refuse missing or mismatched accounts", async () => {
  for (const user of [null, "another-player", "player"]) {
    const events = [];
    const client = {
      auth: { async getSession() { return { data: { session: user ? { user: { id: user }, access_token: "test-token" } : null } }; } },
      realtime: { async setAuth(token) { assert.equal(token, "test-token"); events.push("auth"); } },
    };
    await joinGameChannel(client, { subscribe() { events.push("subscribe"); } }, "player", status => events.push(status), () => false);
    assert.deepEqual(events, user === "player" ? ["auth", "subscribe"] : ["AUTH_ERROR"]);
  }
});

test("a room removed during authentication cannot subscribe late", async () => {
  let finish;
  let cancelled = false;
  let subscribed = false;
  const joining = joinGameChannel({ auth: { getSession: () => new Promise(resolve => { finish = resolve; }) } },
    { subscribe() { subscribed = true; } }, "player", () => {}, () => cancelled);
  cancelled = true;
  finish({ data: { session: { user: { id: "player" }, access_token: "test-token" } } });
  await joining;
  assert.equal(subscribed, false);
});

test("world movement broadcasts tiny high-frame-rate steps and vehicle changes", async () => {
  const h = worldHarness();
  await flush();
  const { world, sent } = h;
  // 0.2px per frame previously never exceeded the old 0.5px per-frame threshold.
  for (let frame = 1; frame <= 100; frame++) {
    h.setNow(frame * 5);
    world.reportMove(10 + frame * 0.2, 10, 1, true);
  }
  assert.ok(sent.length >= 3 && sent.length <= 5, "movement stays visible and rate limited");
  world.reportMove(30, 10, 1, false, "sedan", 1.2);
  assert.equal(sent.at(-1).payload.car, "sedan");
  assert.equal(sent.at(-1).payload.heading, 1.2);
  world.stopped();
  assert.equal(sent.at(-1).payload.w, 0);
  assert.equal(sent.at(-1).payload.car, "sedan");
  h.dispose();
});
