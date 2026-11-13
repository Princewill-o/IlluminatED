import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const { framePacer } = projectData("src/game/core/frame-budget.ts");
const { detectGraphicsTier, visualProfile } = projectData("src/game/core/visual-quality.ts");

/** Run a pacer on a display and return the gaps (in display frames) between updates. */
function gaps(hz, jitter = 0, seconds = 6) {
  let seed = 11;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const due = framePacer(60);
  let last = null;
  const out = [];
  for (let i = 0; i < hz * seconds; i++) {
    const now = 1000 + (i * 1000) / hz + (rnd() - 0.5) * 2 * jitter;
    if (due(now)) { if (last !== null) out.push(Math.round((now - last) / (1000 / hz))); last = now; }
  }
  return out.slice(60);
}

test("walking updates land on evenly spaced frames on common Windows and Mac refresh rates", () => {
  for (const [hz, step] of [[60, 1], [75, 1], [90, 1], [120, 2], [144, 2], [240, 4]]) {
    for (const jitter of hz > 144 ? [0] : [0, 1]) {
      const g = gaps(hz, jitter);
      assert.ok(g.every((n) => n === step), `${hz} Hz (jitter ${jitter} ms): uneven gaps ${[...new Set(g)]}`);
    }
  }
});

test("the movement and drawing loops always agree within a display frame", () => {
  const due = framePacer(60);
  for (let i = 0; i < 400; i++) {
    const now = 1000 + i * (1000 / 144);
    assert.equal(due(now), due(now));
  }
});

test("a pause or long hitch resumes straight away without catch-up bursts", () => {
  const due = framePacer(60);
  for (let i = 0; i < 100; i++) due(i * 1000 / 144);
  assert.equal(due(60000), true);
});

test("Windows integrated graphics start on a lighter tier; dedicated GPUs and Apple chips on High", () => {
  const tier = (gpu) => detectGraphicsTier({ cores: 8, memory: 8, gpu });
  assert.equal(tier("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)"), "performance");
  assert.equal(tier("ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)"), "performance");
  assert.equal(tier("ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)"), "balanced");
  assert.equal(tier("ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)"), "balanced");
  assert.equal(tier("ANGLE (NVIDIA, NVIDIA GeForce MX250 Direct3D11 vs_5_0 ps_5_0, D3D11)"), "balanced");
  assert.equal(tier("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)"), "high");
  assert.equal(tier("ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)"), "high");
  assert.equal(tier("ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)"), "high");
});

test("Balanced drops the heaviest passes; Performance drops shadows but keeps the outlines", () => {
  const balanced = visualProfile(1.5, false, "balanced"), performance = visualProfile(1.5, false, "performance");
  assert.equal(balanced.ambientOcclusion, false);
  assert.ok(balanced.shadowTaps <= 8 && balanced.shadowSize <= 1024 && balanced.pixelRatio <= 1.25);
  assert.equal(performance.shadows, false);
  assert.equal(performance.outlines, true);
  assert.equal(performance.pixelRatio, 1);
});
