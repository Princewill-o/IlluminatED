import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url), THREE = require("three");
const exports = {};
const context = new Proxy({}, { get: () => () => {} });
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/world/water-style3d.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: () => THREE, document: { createElement: () => ({ getContext: () => context }) } });

test("river bank masks expose only shore edges and preserve six vertices per water tile", () => {
  const tiles = ["www", "www", "www"], before = JSON.stringify(tiles);
  const geometry = exports.riverGeometry(tiles), bank = geometry.attributes.riverBank;
  assert.equal(geometry.attributes.position.count, 54);
  assert.equal(bank.count, 54);
  const at = index => Array.from(bank.array.slice(index * 4, index * 4 + 4));
  assert.deepEqual(at(0), [1, 0, 1, 0]);
  assert.deepEqual(at(4 * 6), [0, 0, 0, 0]);
  assert.deepEqual(at(8 * 6), [0, 1, 0, 1]);
  for (const value of geometry.attributes.riverTileUv.array) assert.ok(value === 0 || value === 1);
  assert.equal(JSON.stringify(tiles), before);
  geometry.dispose();
  const isolated = exports.riverGeometry(["w"]);
  assert.deepEqual(Array.from(isolated.attributes.riverBank.array.slice(0, 4)), [1, 1, 1, 1]);
  assert.equal(isolated.attributes.position.count, 6);
  isolated.dispose();
});

test("river animation clamps rain inputs and retains standard shader hooks", () => {
  const river = exports.riverSurface("day", 3, 3);
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  river.material.onBeforeCompile(shader);
  river.update(5, 2);
  assert.equal(shader.uniforms.uRiverTime.value, 5);
  assert.equal(shader.uniforms.uRiverRain.value, 1);
  river.update(NaN, NaN);
  assert.equal(shader.uniforms.uRiverTime.value, 0);
  assert.equal(shader.uniforms.uRiverRain.value, 0);
  river.update(8);
  assert.equal(shader.uniforms.uRiverRain.value, 0);
  assert.ok(shader.fragmentShader.includes("#include <normal_fragment_maps>"));
  assert.ok(shader.fragmentShader.includes("#include <color_fragment>"));
  assert.ok(shader.fragmentShader.includes("bankDistance"));
  assert.ok(shader.fragmentShader.includes("rainRing"));
  let released = 0;
  river.texture.addEventListener("dispose", () => released++);
  river.material.addEventListener("dispose", () => released++);
  river.dispose();
  assert.equal(released, 2);
});
