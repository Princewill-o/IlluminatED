import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import { projectData } from "../../scripts/lib/project-data.mjs";
const W = projectData("src/game/core/world.ts");
const network = projectData("src/game/core/world-network.ts");
const { DEFAULT_AVATAR } = projectData("src/game/core/cosmetics.ts");
const compiled = ts.transpileModule(
  fs.readFileSync("src/components/game/world/use-world.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
export const playerId = (n) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const flush = () => new Promise((resolve) => setImmediate(resolve));

/** In-memory transport; no cloud traffic. Capacity override is diagnostic only. */
export function worldHarness({
  total = 2,
  local = 0,
  mapId = "city",
  capacity = W.SERVER_CAPACITY,
  signed = false,
  claim,
  verify,
} = {}) {
  const effects = [],
    statuses = [],
    sent = [],
    channels = [],
    claims = [],
    released = [],
    timers = new Map();
  let now = 1800000000000,
    serial = 0,
    syncReads = 0;
  const state = Object.fromEntries(
    Array.from({ length: total }, (_, i) => [
      playerId(i),
      [
        {
          p: `test-pass-${i}`,
          u: `Test player ${i}`,
          a: DEFAULT_AVATAR,
          x: 100 + (i % 40),
          y: 100 + Math.floor(i / 40),
          d: 1,
        },
      ],
    ]),
  );
  const navigation = { onLine: true },
    listeners = new Map();
  const setTimer = (fn, ms, repeat = false) => {
    const key = ++serial;
    timers.set(key, { fn, ms, at: now + ms, repeat });
    return key;
  };
  class ClockDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const sb = {
    channel(topic) {
      const handlers = new Map();
      const ch = {
        topic,
        state: "joining",
        tracks: [],
        removed: 0,
        on(kind, filter, fn) {
          handlers.set(`${kind}:${filter.event}`, fn);
          return this;
        },
        subscribe(fn) {
          this.state = "joined";
          this.status = fn;
          fn("SUBSCRIBED");
          return this;
        },
        presenceState() {
          syncReads++;
          return state;
        },
        track: async (meta) => {
          ch.tracks.push({ at: now, meta });
          return "ok";
        },
        send: async (message) => {
          sent.push(message);
          return "ok";
        },
        emit: (kind, event, payload) =>
          handlers.get(`${kind}:${event}`)?.(payload),
      };
      channels.push(ch);
      return ch;
    },
    removeChannel: async (ch) => {
      ch.removed++;
      ch.state = "closed";
      ch.status?.("CLOSED");
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    Date: ClockDate,
    performance: { now: () => now - 1800000000000 },
    crypto,
    queueMicrotask,
    navigator: navigation,
    setTimeout: (fn, ms) => setTimer(fn, ms),
    clearTimeout: (key) => timers.delete(key),
    window: {
      setInterval: (fn, ms) => setTimer(fn, ms, true),
      clearInterval: (key) => timers.delete(key),
      addEventListener(name, fn) {
        listeners.set(name, fn);
      },
      removeEventListener(name) {
        listeners.delete(name);
      },
    },
    require(name) {
      if (name === "react")
        return {
          useState: (value) => [value, (v) => statuses.push(v)],
          useRef: (current) => ({ current }),
          useCallback: (fn) => fn,
          useEffect: (fn) => effects.push(fn),
        };
      if (name.includes("supabase-browser"))
        return { browserSupabase: () => sb };
      if (name.includes("world-admission"))
        return {
          claimWorld: async (...args) => {
            claims.push(args);
            return claim
              ? claim(...args)
              : {
                  accepted: true,
                  topic: `world:room:${mapId}:lse-1:${Math.floor(now / 60000)}`,
                  expiresAt: now + 90000,
                  rotateAt: (Math.floor(now / 60000) + 1) * 60000,
                };
          },
          releaseWorld: async (_sb, client) => {
            released.push(client);
          },
        };
      if (name.includes("verify-pass"))
        return {
          verifyPass:
            verify ??
            (async (pass) => {
              const i = Number(pass.replace("test-pass-", ""));
              return {
                id: playerId(i),
                username: `Test player ${i}`,
                org: null,
                badge: null,
              };
            }),
        };
      if (name.includes("world-network")) return network;
      if (name.includes("core/world"))
        return { ...W, SERVER_CAPACITY: capacity };
      if (name.includes("careers"))
        return projectData("src/game/core/careers.ts");
      if (name.includes("cars")) return projectData("src/game/core/cars.ts");
      if (name.includes("realtime"))
        return {
          joinGameChannel: async (_sb, ch, _id, fn, cancelled) => {
            if (!cancelled()) ch.subscribe(fn);
          },
        };
      throw new Error(`Unexpected mock dependency ${name}`);
    },
  });
  const world = exports.useWorld({
    mapId,
    serverId: "lse-1",
    me: {
      id: playerId(local),
      avatar: DEFAULT_AVATAR,
      publicKey: signed ? "test-key" : null,
    },
    start: { x: 100, y: 100 },
  });
  const cleanups = effects.map((fn) => fn());
  return {
    world,
    state,
    statuses,
    sent,
    channels,
    claims,
    released,
    setOnline(value) {
      navigation.onLine = value;
      listeners.get(value ? "online" : "offline")?.();
    },
    timers,
    get syncReads() {
      return syncReads;
    },
    get now() {
      return now;
    },
    sync: () => channels.at(-1)?.emit("presence", "sync"),
    receive: (payload) => channels.at(-1)?.emit("broadcast", "m", { payload }),
    setNow: (value) => {
      now = 1800000000000 + value;
    },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers]
          .filter(([, t]) => t.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [key, t] = next;
        now = t.at;
        if (t.repeat) t.at += t.ms;
        else timers.delete(key);
        await t.fn();
        await flush();
      }
      now = end;
      await flush();
    },
    dispose: () => cleanups.forEach((fn) => fn?.()),
  };
}
