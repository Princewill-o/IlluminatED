// Local, accelerated client-handler benchmark. Never connects to Supabase.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import vm from "node:vm";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import ts from "typescript";
import { projectData } from "./lib/project-data.mjs";

const W = projectData("src/game/core/world.ts");
const careers = projectData("src/game/core/careers.ts");
const { DEFAULT_AVATAR } = projectData("src/game/core/cosmetics.ts");
const source = fs.readFileSync("src/components/game/world/use-world.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const interval = Number(source.match(/now - lastSent.current > (\d+)/)?.[1]);
assert.ok(interval > 0, "movement interval must be read from production code");
const rate = 1000 / interval; // conservative ceiling; actual frame cadence is slightly lower
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rounded = n => Math.round(n * 1000) / 1000;
const p95 = samples => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * .95) - 1];

function client(total, { local = 0, mapId = "office-benchmark", signed = false } = {}) {
  const effects = [], timers = [], events = new Map(), sent = [], statuses = [];
  let now = 0, untracks = 0, removed = 0;
  const state = Object.fromEntries(Array.from({ length: total }, (_, i) => [id(i), [{
    p: signed ? `test-pass-${i}` : null, u: `Test player ${i}`, a: DEFAULT_AVATAR,
    x: 100 + i % 40, y: 100 + Math.floor(i / 40), d: 1,
  }]]));
  const channel = {
    state: "joined",
    presenceState: () => state, // installed SDK returns this.presence.state directly
    on(kind, filter, fn) { events.set(`${kind}:${filter.event}`, fn); return this; },
    track: async () => "ok", untrack: async () => { untracks++; return "ok"; },
    send: async message => { sent.push(message); return "ok"; },
  };
  const sb = { channel: () => channel, removeChannel: async () => { removed++; } };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, performance: { now: () => now }, navigator: { onLine: true },
    window: { setInterval(fn, ms) { timers.push({ fn, ms }); return timers.length; }, clearInterval() {}, addEventListener() {}, removeEventListener() {} },
    require(name) {
      if (name === "react") return {
        useState: value => [value, v => statuses.push(v)], useRef: current => ({ current }),
        useCallback: fn => fn, useEffect: fn => effects.push(fn),
      };
      if (name.includes("supabase-browser")) return { browserSupabase: () => sb };
      if (name.includes("realtime")) return { joinGameChannel: async (_sb, _ch, _id, fn) => fn("SUBSCRIBED") };
      if (name.includes("verify-pass")) return { verifyPass: async pass => {
        const i = Number(pass.replace("test-pass-", ""));
        return { id: id(i), username: `Test player ${i}`, org: null, badge: null };
      } };
      if (name.includes("careers")) return careers;
      if (name.includes("cars")) return projectData("src/game/core/cars.ts");
      if (name.includes("core/world")) return W;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const world = exports.useWorld({ mapId, serverId: "lse-1", me: { id: id(local), avatar: DEFAULT_AVATAR, publicKey: signed ? "test-key" : null }, start: { x: 100, y: 100 } });
  effects.forEach(fn => fn());
  return {
    world, state, timers, sent, statuses,
    sync: () => events.get("presence:sync")(),
    receive: payload => events.get("broadcast:m")({ payload }),
    now: value => { now = value; },
    get untracks() { return untracks; }, get removed() { return removed; },
  };
}

const rows = [];
for (const n of [5, 6, 10, 12, 16, 20, 30, 40, 50, 100, 200, 500, 1000, 2000]) {
  const c = client(n);
  const syncTimes = [];
  for (let repeat = 0; repeat < 12; repeat++) {
    const start = performance.now(); c.sync(); syncTimes.push(performance.now() - start);
  }
  assert.equal(c.world.players.current.size, n - 1);
  const packets = Array.from({ length: n - 1 }, (_, i) => JSON.stringify({
    topic: "world:office-benchmark", event: "broadcast", payload: { type: "broadcast", event: "m", payload: {
      i: id(i + 1), x: 200 + i % 40, y: 250, d: 1, w: 1, car: null, heading: 0,
    } }, ref: null,
  }));
  const receiveTimes = [];
  for (let repeat = 0; repeat < 12; repeat++) {
    const start = performance.now();
    for (let tick = 0; tick < Math.ceil(rate); tick++)
      for (const packet of packets) c.receive(JSON.parse(packet).payload.payload);
    receiveTimes.push(performance.now() - start);
  }
  assert.equal(c.world.players.current.get(id(1)).tx, 200);
  // Exercise membership reconciliation, not just insertion into a Map.
  delete c.state[id(n - 1)]; c.sync();
  assert.equal(c.world.players.current.size, n - 2);
  const sampleBytes = Buffer.byteLength(packets[0]);
  rows.push({ players: n, movementSendsPerSecond: rounded(n * rate),
    movementDeliveriesPerSecond: rounded(n * (n - 1) * rate),
    movementEventsPerSecond: rounded(n * n * rate),
    pingEventsPerSecond: rounded(n * n / 5),
    receiveKBPerSecondPerClient: rounded((n - 1) * rate * sampleBytes / 1000),
    sampleEnvelopeBytes: sampleBytes,
    presenceSyncP95Ms: rounded(p95(syncTimes)),
    nineMovementTicksP95Ms: rounded(p95(receiveTimes)),
  });
}

// Check admission and timer behaviour using the same hook; these are findings, not capacity guarantees.
const rejected = client(2000, { local: 1999, mapId: "city" });
rejected.sync();
assert.ok(rejected.statuses.includes("full"));
rejected.now(1000); rejected.world.reportMove(120, 100, 1, true);
const admitted = client(2000, { local: 0, mapId: "city" }); admitted.sync();
const office = client(2000, { local: 1999 }); office.sync();
const heartbeat = rejected.timers.find(t => t.ms === 3000);
assert.ok(heartbeat, "presence timer changed: update this benchmark's assumptions");
const sender = client(2);
for (let frame = 1; frame <= 3600; frame++) {
  sender.now(frame * 1000 / 60);
  sender.world.reportMove(100 + frame / 10, 100, 1, true);
}
assert.ok(sender.sent.length >= 440 && sender.sent.length <= 500);
const stationary = client(2);
for (let frame = 1; frame <= 3600; frame++) {
  stationary.now(frame * 1000 / 60);
  stationary.world.reportMove(100, 100, 1, false);
}
assert.equal(stationary.sent.length, 0);

// Signed identities resolve asynchronously, each triggering a full sync. Stub only crypto here;
  // measure real Ed25519 separately below, so this exposes reconciliation amplification.
const joinRows = [];
for (const n of [40, 200, 500, 2000]) {
  const c = client(n, { signed: true });
  const start = performance.now(); c.sync();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(c.world.players.current.size, n - 1);
  joinRows.push({ players: n, asyncIdentityReconciliationMs: rounded(performance.now() - start) });
}

const keys = crypto.generateKeyPairSync("ed25519");
const publicKey = await crypto.webcrypto.subtle.importKey("spki", keys.publicKey.export({ format: "der", type: "spki" }), { name: "Ed25519" }, false, ["verify"]);
const messages = Array.from({ length: 2000 }, (_, i) => {
  const body = Buffer.from(JSON.stringify({ id: id(i), username: `Test player ${i}`, exp: Date.now() + 60000 })).toString("base64url");
  return { body: Buffer.from(body), sig: crypto.sign(null, Buffer.from(body), keys.privateKey) };
});
const cryptoStart = performance.now();
assert.ok((await Promise.all(messages.map(m => crypto.webcrypto.subtle.verify("Ed25519", publicKey, m.sig, m.body)))).every(Boolean));
const cryptoMs = performance.now() - cryptoStart;

const report = {
  generatedAt: new Date().toISOString(), applicationCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  environment: { node: process.version, os: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model, logicalCPUs: os.cpus().length },
  method: "Accelerated local hook with synthetic presence and JSON movement, real production callbacks, mocked React/Supabase transport; no cloud traffic or GPU/DOM rendering. Office path deliberately bypasses current admission to stress handlers. 12 samples per steady scenario, p95 includes warm-up. WebSocket envelope is representative, not packet capture. Movement model uses conservative 1000/120 Hz ceiling, all players moving. Nine ticks timed, not claimed as frame time or end-to-end latency.",
  configuredCapacity: W.SERVER_CAPACITY, movementCeilingHz: rate, rows, joinRows,
  populationScenarios: [5, 10, 20, 40, 2000].map(roomSize => {
    const rooms = Math.ceil(2000 / roomSize);
    const sizes = Array.from({ length: rooms }, (_, i) => Math.min(roomSize, 2000 - i * roomSize));
    return { totalPlayers: 2000, roomSize, rooms,
      movementEventsPerSecondAllMoving: rounded(sizes.reduce((n, size) => n + size * size * rate, 0)),
      movementEventsPerSecondHalfMovingExpected: rounded(sizes.reduce((n, size) => n + size * size * rate / 2, 0)),
      note: "Movement only; sharding does not remove the project-wide event quota or global lobby fanout." };
  }),
  documentedQuotaScenarios: [100, 500, 2500].map(eventsPerSecond => ({
    eventsPerSecond,
    oneRoomPlayersAt60PercentBudget: Math.floor(Math.sqrt(eventsPerSecond * .6 / (rate + 1 / 5 + 1 / 3))),
    note: "Planning estimate includes movement, ping broadcast and one presence fanout every three seconds; excludes initial snapshots/lobby/acks/chat. Not a tested deployment guarantee.",
  })),
  findings: {
    rejectedClientUntracks: rejected.untracks, rejectedClientLeavesChannel: rejected.removed > 0,
    rejectedClientStillSendsMovement: rejected.sent.some(m => m.event === "m"),
    admittedCityRemotePlayersAt2000: admitted.world.players.current.size,
    officeRemotePlayersAt2000: office.world.players.current.size,
    presenceTrackIntervalMs: heartbeat.ms,
    actualMovementSendsAt60FPSOver60SimulatedSeconds: sender.sent.length,
    stationaryMovementSendsOver60SimulatedSeconds: stationary.sent.length,
    steadyPresenceTracksPerClientPer30Seconds: 30000 / heartbeat.ms,
    signedJoinNote: "Signature result is stubbed only in joinRows to isolate per-resolution full-snapshot reconciliation. Real crypto measured separately, not added to reconciliation time.",
    realEd25519Verifications: 2000, realEd25519BatchMs: rounded(cryptoMs),
  },
  exclusions: "No real 2000-user service test; no measured cloud RTT/loss/reconnect, database load, AI/study workload, GPU FPS, mobile memory, avatar assets or browser layout. No production plan/settings assumed or changed. Presence fanout, lobby traffic, acknowledgements, reconnects, TLS and chat are excluded from movement estimates.",
};
fs.mkdirSync("output", { recursive: true });
fs.writeFileSync("output/world-load-benchmark.json", JSON.stringify(report, null, 2) + "\n");
console.table(rows.map(r => ({ players: r.players, movementEventsPerSec: r.movementEventsPerSecond, clientKBps: r.receiveKBPerSecondPerClient, syncP95ms: r.presenceSyncP95Ms, nineTicksP95ms: r.nineMovementTicksP95Ms })));
console.table(joinRows);
console.log(JSON.stringify(report.findings, null, 2));
console.log("Saved output/world-load-benchmark.json. These results are local simulation, not a certified live capacity.");
