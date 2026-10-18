import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("scene music schedules bounded voices, mutes, resumes and releases its context", async () => {
  const originalWindow = globalThis.window;
  const originalAudio = globalThis.AudioContext;
  const originalClearInterval = globalThis.clearInterval;
  let tick, cleared = false, context;
  const nodes = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
  const node = () => ({ connect() { return this; }, disconnect() {}, gain: param(), frequency: param() });
  class MockAudioContext {
    currentTime = 0;
    state = "suspended";
    destination = {};
    constructor() { context = this; }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createOscillator() {
      const osc = { ...node(), start(at) { assert.ok(at >= context.currentTime); }, stop(at) { this.stopAt = at; } };
      nodes.push(osc);
      return osc;
    }
    async resume() { this.state = "running"; }
    async suspend() { this.state = "suspended"; }
    async close() { this.state = "closed"; }
  }
  globalThis.AudioContext = MockAudioContext;
  globalThis.window = { setInterval(fn) { tick = fn; return 123; }, setTimeout(fn) { fn(); } };
  globalThis.clearInterval = id => { assert.equal(id, 123); cleared = true; };
  try {
    const exports = {};
    const js = ts.transpileModule(fs.readFileSync("src/components/game/music.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(js, { exports, AudioContext: MockAudioContext, window: globalThis.window, clearInterval: globalThis.clearInterval });
    const { createMusic } = exports;
    const music = createMusic();
    tick();
    assert.equal(nodes.length, 0, "no autoplay before activation");
    await music.active(true);
    tick();
    assert.ok(nodes.length > 0 && nodes.length < 20, "small lookahead, bounded scheduled voices");
    assert.ok(nodes.every(voice => Number.isFinite(voice.stopAt)), "every oscillator has an end");
    await music.active(false);
    const before = nodes.length;
    context.currentTime = 20;
    tick();
    assert.equal(nodes.length, before, "muting stops new scheduling");
    music.scene("study");
    music.volume(0.15);
    await music.active(true);
    tick();
    assert.ok(nodes.length > before, "new scene resumes without scheduling old missed notes");
    music.suspend();
    assert.equal(context.state, "suspended");
    music.dispose();
    assert.equal(context.state, "closed");
    assert.equal(cleared, true);
  } finally {
    globalThis.window = originalWindow;
    globalThis.AudioContext = originalAudio;
    globalThis.clearInterval = originalClearInterval;
  }
});
