import assert from "node:assert/strict";
import test from "node:test";
import { ShaderLib } from "three";
import { projectData } from "../scripts/lib/project-data.mjs";
const {
  visualProfile,
  readVisualQuality,
  immersiveMotion,
  physicalSurface,
  curvedVertexShader,
} = projectData("src/game/core/visual-quality.ts");
test("quality costs stay bounded on high DPI displays", () => {
  for (const mobile of [true, false])
    for (const dpr of [1, 2, 4, NaN]) {
      const low = visualProfile("low", mobile, dpr),
        high = visualProfile("cinematic", mobile, dpr);
      assert.equal(low.shadows, false);
      assert.equal(low.postProcessing, false);
      assert.equal(low.pixelRatio, 0.75);
      assert.ok(high.pixelRatio <= 1.5);
      assert.ok(high.shadowSize <= 2048);
      assert.ok(high.samples <= 4);
    }
  assert.equal(readVisualQuality("obsolete"), "auto");
  assert.equal(visualProfile("auto", true).shadows, false);
  assert.equal(visualProfile("auto", false).bloom, false);
  const balanced = visualProfile("auto", false, 2);
  assert.equal(balanced.shadows, true, "desktop default: soft shadow maps");
  assert.equal(balanced.msaa, true, "desktop default: hardware MSAA");
  assert.equal(balanced.postProcessing, false);
  assert.equal(balanced.environment, false);
  assert.equal(balanced.samples, 0);
  assert.equal(visualProfile("cinematic", false).postProcessing, true);
});
test("optional motion respects accessibility and cannot grow with vehicle speed", () => {
  for (const t of [0, 1, 100])
    for (const speed of [0, 200, 1e9]) {
      assert.equal(immersiveMotion(t, true, speed, true, true).rise, 0);
      assert.equal(immersiveMotion(t, true, speed, false, false).bank, 0);
      const motion = immersiveMotion(t, true, speed, true, false);
      assert.ok(Math.abs(motion.rise) <= 0.016);
      assert.ok(Math.abs(motion.bank) <= 0.002);
    }
  assert.equal(immersiveMotion(NaN, true, 0, true, false).rise, 0);
});
test("colour, depth and instanced shadows share curved world transform", () => {
  for (const name of ["standard", "depth"]) {
    const shader = curvedVertexShader(ShaderLib[name].vertexShader);
    assert.ok(shader.includes("bw.y -= bz * bz * uBend.x + bx * bx * uBend.y"));
    assert.ok(shader.includes("instanceMatrix * mvPosition"));
    assert.ok(!shader.includes("#include <project_vertex>"));
  }
  assert.ok(
    curvedVertexShader(ShaderLib.standard.vertexShader).includes(
      "worldPosition.y -= curveZ",
    ),
  );
  assert.ok(
    physicalSurface("#243b49").roughness < physicalSurface("#ffffff").roughness,
  );
});
