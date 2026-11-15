import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

import { projectData } from "../scripts/lib/project-data.mjs";

const component = "src/components/game/world/voice-chat.tsx";
const compiled = ts.transpileModule(readFileSync(component, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
const catalogue = projectData("src/lib/illum-world/role-contracts.ts");
const roles = projectData("src/game/core/roles.ts");
const meId = "learner";
const friend = { id: "friend", username: "sana" };
const nearby = [];
const settle = () => new Promise(setImmediate);
const jsx = (type, props) => ({ type, props });
const nodes = (tree) =>
  Array.isArray(tree)
    ? tree.flatMap(nodes)
    : tree && typeof tree === "object"
      ? [tree, ...nodes(tree.props.children)]
      : [];

function mount({ permission, trainingRole = null } = {}) {
  const hooks = [],
    effects = [],
    cleanups = new Map(),
    openChannels = new Map();
  const requests = [],
    sent = [],
    allTracks = [],
    peers = [];
  let cursor = 0;
  class Track extends EventTarget {
    constructor(kind) {
      super();
      this.kind = kind;
      this.enabled = true;
      this.readyState = "live";
      allTracks.push(this);
    }
    stop() {
      this.readyState = "ended";
    }
  }
  class Stream {
    constructor(tracks = []) {
      this.tracks = [...tracks];
    }
    getTracks() {
      return this.tracks;
    }
    getAudioTracks() {
      return this.tracks.filter((track) => track.kind === "audio");
    }
    getVideoTracks() {
      return this.tracks.filter((track) => track.kind === "video");
    }
    addTrack(track) {
      this.tracks.push(track);
    }
    removeTrack(track) {
      this.tracks = this.tracks.filter((value) => value !== track);
    }
  }
  class Peer extends EventTarget {
    constructor() {
      super();
      this.connectionState = "new";
      this.signalingState = "stable";
      this.transceivers = [];
      peers.push(this);
    }
    addTransceiver(kind, options) {
      const sender = {
        track: typeof kind === "string" ? null : kind,
        replaceTrack(track) {
          this.track = track;
          return Promise.resolve();
        },
      };
      this.transceivers.push({
        sender,
        receiver: {
          track: { kind: typeof kind === "string" ? kind : kind.kind },
        },
        direction: options.direction,
      });
      return this.transceivers.at(-1);
    }
    getTransceivers() {
      return this.transceivers;
    }
    addTrack(track) {
      return this.addTransceiver(track, { direction: "sendrecv" }).sender;
    }
    getSenders() {
      return this.transceivers.map(({ sender }) => sender);
    }
    close() {
      this.connectionState = "closed";
    }
  }
  const signaller = {
    async open(topic) {
      const listeners = new Map();
      const channel = {
        on(event, fn) {
          listeners.set(event, fn);
          return this;
        },
        subscribe(ready) {
          ready?.();
        },
        send(event, payload) {
          sent.push({ topic, event, payload });
        },
        close() {
          openChannels.delete(topic);
        },
        receive(event, payload) {
          return listeners.get(event)?.(payload);
        },
      };
      openChannels.set(topic, channel);
      return channel;
    },
    async post(topic, event, payload) {
      sent.push({ topic, event, payload });
    },
  };
  function memo(value, deps) {
    const index = cursor++;
    if (
      !hooks[index] ||
      deps.some((item, i) => !Object.is(item, hooks[index].deps[i]))
    )
      hooks[index] = { deps, value };
    return hooks[index].value;
  }
  const react = {
    useRef(value) {
      const i = cursor++;
      return (hooks[i] ??= { current: value });
    },
    useState(init) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = typeof init === "function" ? init() : init;
      return [
        hooks[i],
        (value) => {
          hooks[i] = typeof value === "function" ? value(hooks[i]) : value;
        },
      ];
    },
    useCallback: memo,
    useMemo(fn, deps) {
      return memo(fn, deps)();
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (
        !hooks[index] ||
        deps.some((item, i) => !Object.is(item, hooks[index][i]))
      ) {
        hooks[index] = deps;
        effects.push(() => {
          cleanups.get(index)?.();
          cleanups.set(index, fn());
        });
      }
    },
  };
  const exports = {};
  const modules = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "lucide-react": new Proxy({}, { get: (_, name) => name }),
    "./hud": { HudSlot: "hud" },
    "@/lib/supabase-browser": { browserSupabase: () => null },
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "@/lib/illum-world/role-contracts": catalogue,
    "@/game/core/roles": roles,
  };
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => modules[name],
    EventTarget,
    MediaStream: Stream,
    RTCPeerConnection: Peer,
    setTimeout,
    clearTimeout,
    process: { env: { NODE_ENV: "test" } },
    window: {
      isSecureContext: true,
      addEventListener() {},
      removeEventListener() {},
      setTimeout,
      clearTimeout,
    },
    navigator: {
      mediaDevices: {
        async getUserMedia(constraints) {
          requests.push(constraints);
          await permission?.();
          return new Stream([
            ...(constraints.audio ? [new Track("audio")] : []),
            ...(constraints.video ? [new Track("video")] : []),
          ]);
        },
      },
    },
  });
  const friends = [friend];
  const render = () => {
    cursor = 0;
    const tree = exports.VoiceChat({
      meId,
      nearby,
      signaller,
      friendList: friends,
      trainingRole,
    });
    for (const effect of effects.splice(0)) effect();
    return tree;
  };
  return {
    render,
    requests,
    sent,
    tracks: allTracks,
    peers,
    openChannels,
    async click(label) {
      const el = nodes(render()).find(
        (item) => item.type === "button" && item.props["aria-label"] === label,
      );
      assert.ok(el, `missing button ${label}`);
      return el.props.onClick();
    },
    setRole(role) {
      trainingRole = role;
      render();
    },
    unmount() {
      for (const cleanup of cleanups.values()) cleanup?.();
    },
  };
}

test("unmute starts microphone capture explicitly, mute silences it immediately, and camera asks for video only", async () => {
  const app = mount();
  app.render();
  assert.equal(app.requests.length, 0);
  await app.click("Unmute microphone");
  await settle();
  assert.equal(app.requests[0].video, false);
  assert.equal(app.tracks[0].enabled, true);
  await app.click("Mute microphone");
  assert.equal(app.tracks[0].enabled, false);
  await app.click("Turn camera on");
  await settle();
  assert.equal(app.requests[1].audio, false);
  assert.equal(app.tracks.filter((track) => track.kind === "audio").length, 1);
  app.unmount();
});

test("a permission prompt that resolves after leaving the scene releases the device", async () => {
  let grant;
  const permission = new Promise((resolve) => {
    grant = resolve;
  });
  const app = mount({ permission: () => permission });
  const pending = app.click("Unmute microphone");
  app.unmount();
  grant();
  await pending;
  await settle();
  assert.equal(app.tracks.length, 1);
  assert.equal(app.tracks[0].readyState, "ended");
});

test("permission errors are visible beside the microphone even with the friends panel closed", async () => {
  const app = mount({
    permission: async () => {
      throw { name: "NotAllowedError" };
    },
  });
  await app.click("Unmute microphone");
  await settle();
  const alert = nodes(app.render()).find((item) => item.props.role === "alert");
  assert.match(alert?.props.children, /microphone/i);
  app.unmount();
});

test("a friend can answer muted, explicitly unmute, and update the role on the private pair", async () => {
  const app = mount({ trainingRole: "data-analyst" });
  app.render();
  await settle();
  await app.openChannels
    .get(`ring:${meId}`)
    .receive("ring", { from: "stranger" });
  assert.equal(
    nodes(app.render()).some((item) => item.props["aria-label"] === "Accept"),
    false,
  );
  await app.openChannels
    .get(`ring:${meId}`)
    .receive("ring", { from: friend.id });
  await app.click("Accept");
  await settle();
  assert.equal(app.requests.length, 0, "accepting a call never opens the mic");
  await app.click("Unmute microphone");
  await settle();
  assert.equal(
    app.peers[0].getSenders().some((sender) => sender.track?.kind === "audio"),
    true,
  );
  app.setRole("business-analyst");
  const state = app.sent.filter((item) => item.payload.t === "state").at(-1);
  assert.equal(state?.topic, "call:friend:learner");
  assert.equal(state?.payload.trainingRole, "business-analyst");
  app.setRole(null);
  assert.equal(
    app.sent.filter((item) => item.payload.t === "state").at(-1)?.payload
      .trainingRole,
    null,
  );
  await app.click("Mute microphone");
  assert.equal(
    app.peers[0].connectionState,
    "new",
    "muting keeps the direct call alive",
  );
  const pair = app.openChannels.get("call:friend:learner");
  await pair.receive("sig", {
    from: friend.id,
    t: "state",
    trainingRole: "cybersecurity-analyst",
  });
  assert.ok(
    nodes(app.render()).some(
      (node) => node.props.trainingRole === "Cybersecurity Analyst",
    ),
  );
  await pair.receive("sig", {
    from: "stranger",
    t: "state",
    trainingRole: "business-analyst",
  });
  assert.ok(
    nodes(app.render()).some(
      (node) => node.props.trainingRole === "Cybersecurity Analyst",
    ),
  );
  await pair.receive("sig", {
    from: friend.id,
    t: "state",
    trainingRole: "unknown-display-name",
  });
  assert.ok(
    !nodes(app.render()).some(
      (node) => node.props.trainingRole === "Cybersecurity Analyst",
    ),
  );
  app.unmount();
});
