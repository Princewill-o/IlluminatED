import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

function mount({ permission, unsupported = false } = {}) {
  const slots = [],
    pending = [],
    cleanups = new Map(),
    timers = new Map(),
    listeners = new Map(),
    saved = [],
    revoked = [],
    recorders = [],
    minimised = [];
  let cursor = 0,
    serial = 0,
    requests = 0,
    stops = 0,
    urlSerial = 0;
  const stream = {
      getTracks: () => [
        {
          stop() {
            stops++;
          },
        },
      ],
    },
    canvas = { captureStream: () => stream };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value) =>
          (slots[index] =
            typeof value === "function" ? value(slots[index]) : value),
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (
        !(index in slots) ||
        deps.some((value, i) => value !== slots[index][i])
      ) {
        slots[index] = deps;
        pending.push({ index, fn });
      }
    },
  };
  const jsx = (type, props) => ({ type, props }),
    exports = {};
  const timer = (fn, ms) => {
    const id = ++serial;
    timers.set(id, { fn, ms });
    return id;
  };
  const document = {
    hidden: false,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  class Recorder {
    static isTypeSupported(type) {
      return type.startsWith("video/webm");
    }
    constructor(media, options) {
      this.media = media;
      this.mimeType = options?.mimeType ?? "video/webm";
      this.state = "inactive";
      recorders.push(this);
    }
    start() {
      this.state = "recording";
    }
    stop() {
      if (this.state !== "recording") return;
      this.state = "inactive";
      this.ondataavailable?.({
        data: new Blob(["test video"], { type: this.mimeType }),
      });
      this.onstop?.();
    }
  }
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/components/game/world/creator-studio.tsx", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    {
      exports,
      document,
      Blob,
      Date,
      crypto: { randomUUID: () => "test-clip" },
      MediaRecorder: unsupported ? undefined : Recorder,
      navigator: {
        mediaDevices: {
          getUserMedia: async (options) => {
            requests++;
            assert.equal(options.audio, false);
            return permission ? permission(stream) : stream;
          },
        },
      },
      URL: {
        createObjectURL: () => `blob:test-${++urlSerial}`,
        revokeObjectURL: (url) => revoked.push(url),
      },
      setTimeout: timer,
      setInterval: timer,
      clearTimeout: (id) => timers.delete(id),
      clearInterval: (id) => timers.delete(id),
      require(name) {
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name === "../character-3d-preview")
          return { Character3DPreview: () => null };
        if (name === "./scene-continuity")
          return {
            recordSceneCapture: () => ({
              stream,
              dispose: () =>
                stream.getTracks().forEach((track) => track.stop()),
            }),
          };
        if (name === "./clip-store")
          return {
            localClips: async () => [],
            saveClip: async (clip) => saved.push(clip),
            deleteClip: async () => {},
          };
        if (name === "@/game/core/creator-clips")
          return projectData("src/game/core/creator-clips.ts");
        throw Error(name);
      },
    },
  );
  const app = {
    stream,
    document,
    recorders,
    timers,
    listeners,
    saved,
    revoked,
    minimised,
    requests: () => requests,
    stops: () => stops,
    render() {
      cursor = 0;
      const tree = exports.CreatorStudio({
        owner: "student-a",
        avatar: {},
        onMinimisedChange: (value) => minimised.push(value),
        onClose() {},
      });
      for (const node of nodes(tree)) {
        if (node.props?.ref) {
          node.props.ref.current =
            node.type === "video"
              ? { play: async () => {}, srcObject: null }
              : { querySelector: () => canvas };
        }
      }
      for (const { index, fn } of pending.splice(0)) {
        cleanups.get(index)?.();
        const cleanup = fn();
        if (cleanup) cleanups.set(index, cleanup);
      }
      return tree;
    },
    button(label) {
      const node = nodes(app.render()).find(
        (node) => node.type === "button" && content(node).includes(label),
      );
      assert.ok(node, `button ${label}`);
      assert.ok(!node.props.disabled, `enabled ${label}`);
      return node.props.onClick();
    },
    unmount() {
      for (const cleanup of cleanups.values()) cleanup();
      cleanups.clear();
    },
  };
  return app;
}
function nodes(tree) {
  if (tree == null || typeof tree === "boolean") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== "object") return [tree];
  return [tree, ...nodes(tree.props?.children)];
}
function content(tree) {
  return nodes(tree)
    .filter((node) => typeof node === "string" || typeof node === "number")
    .join(" ");
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("studio asks for camera only on an explicit click, and stops it when hidden or unmounted", async () => {
  const app = mount();
  app.render();
  await flush();
  assert.equal(app.requests(), 0);
  app.button("Create a clip");
  app.button("Camera video");
  assert.equal(app.requests(), 0);
  await app.button("Enable camera");
  await flush();
  app.render();
  assert.equal(app.requests(), 1);
  app.document.hidden = true;
  app.listeners.get("visibilitychange")();
  assert.ok(app.stops() > 0);
  assert.ok(content(app.render()).includes("Enable camera"));
  app.unmount();
  assert.equal(app.timers.size, 0);
  assert.equal(app.listeners.size, 0);
});

test("a camera permission request resolving after switching modes or closing cannot leave a live stream", async () => {
  for (const close of [false, true]) {
    let resolve;
    const app = mount({
      permission: (stream) =>
        new Promise((done) => {
          resolve = () => done(stream);
        }),
    });
    app.render();
    app.button("Create a clip");
    app.button("Camera video");
    const pending = app.button("Enable camera");
    if (close) app.unmount();
    else app.button("Animate character");
    resolve();
    await pending;
    await flush();
    assert.ok(app.stops() > 0, "abandoned stream tracks stopped");
    if (!close) {
      assert.ok(content(app.render()).includes("Animation timeline"));
      app.unmount();
    }
    assert.equal(app.timers.size, 0);
    assert.equal(app.listeners.size, 0);
  }
});

test("an animation clip must be reviewed before publishing and is capped at thirty seconds", async () => {
  const app = mount();
  app.render();
  await flush();
  app.button("Create a clip");
  app.button("Record up to");
  assert.equal(app.saved.length, 0);
  assert.equal(app.recorders[0].state, "recording");
  const limit = [...app.timers.values()].find((timer) => timer.ms === 30000);
  assert.ok(limit);
  limit.fn();
  app.render();
  let tree = app.render();
  assert.match(content(tree), /Review before publishing/);
  assert.equal(app.saved.length, 0);
  await app.button("Publish to my channel");
  await flush();
  tree = app.render();
  assert.equal(app.saved.length, 1);
  assert.equal(app.saved[0].owner, "student-a");
  assert.equal(app.saved[0].channel, "tiktok");
  assert.ok(app.saved[0].blob.size > 0);
  assert.match(
    content(tree),
    /Published to your in-game channel on this device/,
  );
  app.unmount();
  assert.equal(app.timers.size, 0);
  assert.equal(app.listeners.size, 0);
  assert.ok(app.revoked.length > 0);
});

test("closing during a recording releases media and timers; unsupported browsers show an explanation", async () => {
  const app = mount();
  app.render();
  app.button("Create a clip");
  app.button("Record up to");
  app.unmount();
  assert.equal(app.recorders[0].state, "inactive");
  assert.ok(app.stops() > 0);
  assert.equal(app.saved.length, 0);
  assert.equal(app.timers.size, 0);
  const fallback = mount({ unsupported: true });
  fallback.render();
  fallback.button("Create a clip");
  fallback.button("Record up to");
  assert.match(content(fallback.render()), /Video recording is unavailable/);
  assert.equal(fallback.saved.length, 0);
  fallback.unmount();
});

test("city recording leaves controls available and returns to the studio for review", async () => {
  const app = mount();
  app.render();
  app.button("Create a clip");
  app.button("City camera");
  assert.match(content(app.render()), /Capture your day in the city/);
  app.button("Record up to");
  assert.equal(app.minimised.at(-1), true);
  let tree = app.render();
  assert.equal(
    nodes(tree).some((node) => node.props?.role === "dialog"),
    false,
  );
  assert.match(content(tree), /Recording city/);
  app.button("Stop & review");
  assert.equal(app.minimised.at(-1), false);
  app.render();
  tree = app.render();
  assert.match(content(tree), /Review before publishing/);
  assert.equal(app.requests(), 0);
  app.unmount();
});
