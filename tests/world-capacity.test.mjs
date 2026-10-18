import assert from "node:assert/strict";
import test from "node:test";
import { worldHarness, playerId, flush } from "./helpers/world-harness.mjs";
import { projectData } from "../scripts/lib/project-data.mjs";

test("admission refusal never opens a channel or sends movement/chat", async () => {
  for (const reason of ["room_full", "service_busy", "already_connected"]) {
    const h = worldHarness({
      claim: async () => ({ accepted: false, reason }),
    });
    await flush();
    h.world.reportMove(200, 200, 1, true);
    h.world.stopped();
    h.world.say("hi");
    await h.advance(60000);
    assert.equal(h.channels.length, 0);
    assert.equal(h.sent.length, 0);
    assert.ok(
      h.statuses.includes(
        reason === "room_full"
          ? "full"
          : reason === "already_connected"
            ? "elsewhere"
            : "busy",
      ),
    );
    h.dispose();
  }
});
test("missing admission service fails closed and late replies cannot resurrect an unmounted world", async () => {
  const h = worldHarness({
    claim: async () => {
      throw new Error("missing migration");
    },
  });
  await flush();
  assert.equal(h.channels.length, 0);
  assert.ok(h.statuses.includes("error"));
  h.dispose();
  let finish;
  const late = worldHarness({
    claim: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  late.dispose();
  finish({ accepted: true, topic: "late", expiresAt: Date.now() + 90000 });
  await flush();
  assert.equal(late.channels.length, 0);
  assert.ok(late.released.length);
});
test("overflow closes offices and city rooms entirely; admitted clients bound their remote roster", async () => {
  for (const mapId of ["city", "office-acme"]) {
    const h = worldHarness({ total: 2000, local: 1999, mapId });
    await flush();
    h.sync();
    await h.advance(40);
    assert.ok(h.statuses.includes("full"));
    assert.equal(h.channels[0].removed, 1);
    h.world.reportMove(200, 200, 1, true);
    h.world.stopped();
    h.world.say("hi");
    assert.equal(h.sent.length, 0);
    h.dispose();
  }
  const h = worldHarness({ total: 2000 });
  await flush();
  h.sync();
  await h.advance(40);
  assert.equal(h.world.players.current.size, 4);
  h.dispose();
});
test("identity resolutions are coalesced; removed peers and expired signed identities disappear", async () => {
  const h = worldHarness({ total: 2000, capacity: 2000, signed: true });
  await flush();
  h.sync();
  await h.advance(40);
  assert.equal(h.world.players.current.size, 1999);
  assert.ok(h.syncReads <= 3, `${h.syncReads} full scans for one batch`);
  delete h.state[playerId(1999)];
  h.sync();
  await h.advance(40);
  assert.equal(h.world.players.current.size, 1998);
  h.dispose();
  const expired = worldHarness({
    signed: true,
    verify: async () => ({
      id: playerId(1),
      username: "expired",
      expiresAt: 1,
    }),
  });
  await flush();
  expired.sync();
  await expired.advance(40);
  assert.equal(expired.world.players.current.size, 0);
  expired.dispose();
});
test("presence stays below five calls per thirty seconds and epoch rotation removes the old channel", async () => {
  const h = worldHarness();
  await flush();
  for (let i = 0; i < 7; i++) {
    h.world.reportMove(200 + i * 30, 100, 1, true);
    await h.advance(10000);
  }
  assert.ok(h.channels.length >= 2);
  assert.equal(h.channels[0].removed, 1);
  const times = h.channels.flatMap((c) => c.tracks.map((t) => t.at));
  for (const t of times)
    assert.ok(times.filter((at) => at >= t && at < t + 30000).length <= 5);
  assert.ok(
    h.sent.every((m) => m.event !== "p"),
    "no broadcast ping fanout",
  );
  h.dispose();
});
test("a lost lease closes the channel and stops further movement", async () => {
  let count = 0;
  const h = worldHarness({
    claim: async () =>
      ++count === 1
        ? {
            accepted: true,
            topic: "world:room:city:lse-1:test",
            expiresAt: 1800000090000,
            rotateAt: 1800000060000,
          }
        : { accepted: false, reason: "service_busy" },
  });
  await flush();
  await h.advance(31000);
  assert.equal(h.channels[0].removed, 1);
  h.world.reportMove(500, 500, 1, true);
  assert.equal(h.sent.length, 0);
  h.dispose();
});

test("a stationary client re-tracks after a rapid reconnect without exceeding presence frequency", async () => {
  const h = worldHarness();
  await flush();
  const channel = h.channels[0];
  assert.equal(channel.tracks.length, 1);
  await h.advance(500);
  channel.status("CLOSED");
  channel.status("SUBSCRIBED");
  await flush();
  assert.equal(channel.tracks.length, 1);
  await h.advance(16000);
  assert.equal(channel.tracks.length, 2);
  assert.ok(h.statuses.includes("live"));
  h.dispose();
});
test("offices are instanced and nearby avatars have a fixed visibility budget", () => {
  const W = projectData("src/game/core/world.ts"),
    N = projectData("src/game/core/world-network.ts");
  assert.notEqual(
    W.channelFor("office-acme", "lse-1"),
    W.channelFor("office-acme", "lse-2"),
  );
  const players = Array.from({ length: 2000 }, (_, i) => ({
    id: String(i),
    x: i,
    y: 0,
  }));
  const selected = N.nearbyPlayers(players, { x: 0, y: 0 }, new Set(["0"]));
  assert.equal(selected.length, 12);
  assert.equal(selected[0].id, "1");
  assert.ok(selected.every((p) => p.x <= N.VISIBLE_RADIUS));
});

test("a released lease can recover after Wi-Fi returns, using a new cleanup-safe token", async () => {
  let calls = 0;
  const h = worldHarness({
    claim: async () => {
      calls++;
      if (calls === 2) throw new Error("offline");
      return {
        accepted: true,
        topic: `world:room:city:lse-1:${calls}`,
        expiresAt: 1800000000000 + 90000 + calls * 10000,
        rotateAt: 1800000060000,
      };
    },
  });
  await flush();
  h.setOnline(false);
  await h.advance(31000);
  assert.equal(h.channels[0].removed, 1);
  const oldToken = h.claims[0][3];
  h.setOnline(true);
  await flush();
  assert.equal(h.channels.length, 2);
  assert.notEqual(h.claims.at(-1)[3], oldToken);
  assert.equal(h.channels[1].state, "joined");
  h.dispose();
});
