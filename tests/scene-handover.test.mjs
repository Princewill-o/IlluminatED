import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function captureRuntime() {
  const timers = new Map(),
    events = [];
  let serial = 0,
    copies = 0,
    providerReads = 0;
  const exports = {},
    image = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage() {
          copies++;
        },
      }),
    };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/components/game/world/scene-continuity.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports,
      document: { createElement: () => image },
      setTimeout: (fn, ms) => {
        const id = ++serial;
        timers.set(id, { fn, ms });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
      CustomEvent: class {
        constructor(type, options) {
          this.type = type;
          this.detail = options.detail;
        }
      },
      window: { dispatchEvent: (event) => events.push(event) },
    },
  );
  return {
    api: exports,
    timers,
    events,
    image,
    copies: () => copies,
    reads: () => providerReads,
    provider: () => {
      providerReads++;
      return "legacy";
    },
  };
}

test("handover copies the next presented frame once, bounds its size and never re-renders or encodes it", async () => {
  const r = captureRuntime(),
    release = r.api.registerSceneCapture(r.provider),
    pending = r.api.requestSceneCapture();
  assert.equal(r.reads(), 0);
  release.frame({ width: 2560, height: 1440 });
  const image = await pending;
  assert.equal(image, r.image);
  assert.equal(image.width, 960);
  assert.equal(image.height, 540);
  assert.equal(r.copies(), 1);
  assert.equal(r.reads(), 0);
  assert.equal(r.timers.size, 0);
  release();
});
test("replaced and suspended renderers settle pending captures and cannot announce stale readiness", async () => {
  const r = captureRuntime(),
    old = r.api.registerSceneCapture(r.provider),
    pending = r.api.requestSceneCapture(),
    fresh = r.api.registerSceneCapture(() => null);
  old.ready("city");
  assert.equal(r.events.length, 0);
  old();
  assert.equal(await pending, null);
  assert.equal(r.timers.size, 0);
  fresh.ready("home");
  assert.equal(r.api.readSceneReady().rendererId, fresh.id);
  assert.equal(r.api.readSceneReady().mapId, "home");
  const stalled = r.api.requestSceneCapture();
  [...r.timers.values()][0].fn();
  assert.equal(await stalled, null);
  fresh();
});
