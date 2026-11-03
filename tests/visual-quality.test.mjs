import assert from "node:assert/strict";
import test from "node:test";
import { ShaderLib } from "three";
import { projectData } from "../scripts/lib/project-data.mjs";
const {
  visualProfile,
  immersiveMotion,
  physicalSurface,
  curvedVertexShader,
  adaptivePixelRatio,
  readVisualQuality,
} = projectData("src/game/core/visual-quality.ts");
test("graphics retain lighting and materials within a bounded rendering budget", () => {
  for (const dpr of [1, 2, 4, NaN]) {
    const high = visualProfile(dpr);
    assert.equal(high.shadows, true);
    assert.equal(high.shadowSize, 1024);
    assert.equal(high.postProcessing, true);
    assert.equal(high.environment, true);
    assert.equal(high.bloom, true);
    assert.equal(high.samples, 2);
    assert.equal(high.ambientOcclusion, true);
    assert.equal(high.occlusionSamples, 8);
    assert.equal(high.depthOfField, false);
    assert.equal(high.msaa, false);
    assert.equal(high.adaptiveResolution, true);
    assert.ok(high.pixelRatio >= 1 && high.pixelRatio <= 1.5);
  }
});
test("legacy preferences retain the art profile and adaptation ignores invalid or suspended frames",()=>{
 for(const stored of [null,"auto","low","medium","high","ultra","obsolete"])assert.equal(readVisualQuality(stored),"high");
 const adapt=adaptivePixelRatio(2);assert.equal(adapt(0),1.5);assert.equal(adapt(NaN),1.5);assert.equal(adapt(60000,false),1.5);assert.equal(adapt(60016),1.5);
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
