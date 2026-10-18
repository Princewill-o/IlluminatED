// Local diagnostics only. Never creates cloud accounts or connections.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import {
  worldHarness,
  playerId,
  flush,
} from "../tests/helpers/world-harness.mjs";
import { projectData } from "./lib/project-data.mjs";
const N = projectData("src/game/core/world-network.ts");
const round = (n) => Math.round(n * 1000) / 1000;
const p95 = (values) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
const rows = [];
for (const players of [5, 10, 20, 40, 100, 200, 500, 1000, 2000]) {
  // Diagnostic override, never a production admission override.
  const h = worldHarness({ total: players, capacity: players });
  await flush();
  const sync = [],
    movement = [];
  const packets = Array.from({ length: players - 1 }, (_, i) =>
    JSON.stringify({
      i: playerId(i + 1),
      x: 200,
      y: 250,
      d: 1,
      w: 1,
      car: null,
      heading: 0,
    }),
  );
  for (let sample = 0; sample < 12; sample++) {
    let start = performance.now();
    h.sync();
    await h.advance(40);
    sync.push(performance.now() - start);
    start = performance.now();
    for (let tick = 0; tick < 9; tick++)
      for (const packet of packets) h.receive(JSON.parse(packet));
    movement.push(performance.now() - start);
  }
  assert.equal(h.world.players.current.size, players - 1);
  assert.equal(h.world.players.current.get(playerId(1)).tx, 200);
  h.dispose();
  const signed = worldHarness({
    total: players,
    capacity: players,
    signed: true,
  });
  await flush();
  const start = performance.now();
  signed.sync();
  await signed.advance(40);
  const joinMs = performance.now() - start;
  assert.equal(signed.world.players.current.size, players - 1);
  assert.ok(signed.syncReads <= 3);
  rows.push({
    players,
    rawPresenceSyncP95Ms: round(p95(sync)),
    nineRawMovementTicksP95Ms: round(p95(movement)),
    batchedIdentityReconciliationMs: round(joinMs),
    identityFullScans: signed.syncReads,
    hypotheticalMovementEventsPerSecond: round(
      (players * players * 1000) / N.MOVE_INTERVAL_MS,
    ),
  });
  signed.dispose();
}
const full = worldHarness({ total: 2000, local: 1999, mapId: "office-acme" });
await flush();
full.sync();
await full.advance(40);
assert.ok(full.statuses.includes("full"));
assert.equal(full.channels[0].removed, 1);
full.world.reportMove(500, 500, 1, true);
assert.equal(full.sent.length, 0);
const bounded = worldHarness({ total: 2000 });
await flush();
bounded.sync();
await bounded.advance(40);
assert.equal(bounded.world.players.current.size, N.ROOM_CAPACITY - 1);
const refused = worldHarness({
  claim: async () => ({ accepted: false, reason: "service_busy" }),
});
await flush();
assert.equal(refused.channels.length, 0);
const report = {
  generatedAt: new Date().toISOString(),
  applicationBaseCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  environment: {
    node: process.version,
    os: os.platform(),
    cpu: os.cpus()[0]?.model,
  },
  roomCapacity: N.ROOM_CAPACITY,
  presenceIntervalMs: N.PRESENCE_INTERVAL_MS,
  method:
    "Accelerated real hook callbacks with synthetic React/Supabase transport and mocked signature outcomes. Raw rows deliberately override only the client roster cap to compare algorithm costs up to 2000; these are NOT admitted production room sizes. No GPU, browser, cloud RTT, database load, throughput or 2000-user capacity certification. Separate default-cap and refused-admission assertions use production limits. Nine movement ticks are an accelerated batch, not frame time. 12 samples per raw steady scenario including warmup.",
  rows,
  guardChecks: {
    officeOverflowChannelRemoved: true,
    overflowMovementSends: full.sent.length,
    remoteRosterAt2000: bounded.world.players.current.size,
    refusedAdmissionSubscriptions: refused.channels.length,
  },
  budget:
    "Database claim serializes project admission and reserves 9*N*(N+1) events/s per room, including acknowledgement allowance. Default event budget 60/s; default per-room ceiling five. Default budget allows two simultaneous moving players in one room; larger verified allowances require an operator change, never a client override. This is an estimate with headroom, not a provider-level abuse limiter.",
};
for (const h of [full, bounded, refused]) h.dispose();
fs.writeFileSync(
  "output/world-load-after.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.table(rows);
console.log(JSON.stringify(report.guardChecks));
console.log(
  "Saved output/world-load-after.json. Baseline retained in world-load-benchmark.json.",
);
