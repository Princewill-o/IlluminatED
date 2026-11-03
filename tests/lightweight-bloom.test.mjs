import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as THREE from "three";
import * as passes from "three/examples/jsm/postprocessing/Pass.js";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/world/lightweight-bloom.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: name => name === "three" ? THREE : passes });
const { LightweightBloomPass } = exports;

function renderer() {
  const original = new THREE.WebGLRenderTarget(8, 8), draws = [], stencil = [];
  let target = original;
  return {
    original, draws, stencil, autoClear: true,
    state: { buffers: { stencil: { setTest: enabled => stencil.push(enabled) } } },
    getRenderTarget: () => target,
    getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
    setRenderTarget: next => { target = next; },
    clear() {},
    render(mesh) { draws.push({ target, material: mesh.material }); },
  };
}

test("bloom preserves original HDR input, uses two half-sized targets and restores renderer state", () => {
  const pass = new LightweightBloomPass(.18), r = renderer();
  const read = new THREE.WebGLRenderTarget(100, 60), write = read.clone();
  pass.setSize(100, 60); pass.render(r, write, read);
  assert.equal(r.draws.length, 3);
  const [bright, horizontal, composite] = r.draws;
  for (const draw of [bright, horizontal]) {
    assert.equal(draw.target.width, 50); assert.equal(draw.target.height, 30);
    assert.equal(draw.target.texture.type, THREE.HalfFloatType);
    assert.equal(draw.material.toneMapped, false);
  }
  assert.equal(bright.material.uniforms.tDiffuse.value, read.texture);
  assert.equal(horizontal.material.uniforms.tBloom.value, bright.target.texture);
  assert.equal(composite.target, write);
  assert.equal(composite.material.uniforms.tSource.value, read.texture);
  assert.equal(composite.material.uniforms.tBloom.value, horizontal.target.texture);
  assert.equal(composite.material.uniforms.strength.value, .18);
  assert.equal(r.getRenderTarget(), r.original); assert.equal(r.autoClear, true);
  pass.setSize(0, 0);
  assert.equal(bright.target.width, 1); assert.equal(horizontal.target.height, 1);
  assert.equal(horizontal.material.uniforms.stepSize.value.x, 1);
  pass.dispose(); read.dispose(); write.dispose(); r.original.dispose();
});

test("screen output and masked bloom do not change render state, even when a draw fails", () => {
  const pass = new LightweightBloomPass(), r = renderer();
  const read = new THREE.WebGLRenderTarget(8, 8), write = read.clone();
  pass.renderToScreen = true; pass.render(r, write, read, 0, true);
  assert.equal(r.draws[2].target, null);
  assert.deepEqual(r.stencil, [false, true, true]);
  assert.equal(r.getRenderTarget(), r.original);
  r.autoClear = false; r.render = () => { throw new Error("lost context"); };
  assert.throws(() => pass.render(r, write, read), /lost context/);
  assert.equal(r.getRenderTarget(), r.original); assert.equal(r.autoClear, false);
  pass.dispose(); read.dispose(); write.dispose(); r.original.dispose();
});

test("disposing bloom releases its targets and materials once and makes later draws inert", () => {
  const pass = new LightweightBloomPass(), r = renderer();
  const read = new THREE.WebGLRenderTarget(8, 8), write = read.clone();
  pass.render(r, write, read);
  const resources = new Set(r.draws.flatMap(draw => [draw.target, draw.material]));
  resources.delete(write);
  let disposed = 0;
  for (const resource of resources) resource.addEventListener("dispose", () => disposed++);
  pass.dispose(); pass.dispose(); pass.render(r, write, read);
  assert.equal(disposed, 5); assert.equal(r.draws.length, 3);
  read.dispose(); write.dispose(); r.original.dispose();
});
