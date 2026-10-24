import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import * as THREE from "three";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

const source = fs.readFileSync("src/components/game/world/illustrated-light.ts", "utf8");
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: () => THREE });
const { illustratedLightShader, illustratedLight, updateIllustratedLight } = exports;
const { curvedVertexShader, visualProfile } = projectData("src/game/core/visual-quality.ts");

test("illustrated light composes with the existing r169 material and curved projection hooks", () => {
  for (const name of ["standard", "physical", "lambert"]) {
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib[name].vertexShader, fragmentShader: THREE.ShaderLib[name].fragmentShader };
    illustratedLightShader(shader);
    shader.vertexShader = curvedVertexShader(shader.vertexShader);
    assert.equal(shader.uniforms.uIllustratedStrength, illustratedLight.strength);
    assert.ok(shader.vertexShader.includes("vIllustratedHeight=(modelMatrix*illustratedPoint).y"));
    assert.ok(shader.vertexShader.includes("instanceMatrix*illustratedPoint"));
    assert.ok(shader.vertexShader.includes("bw.y -= bz * bz * uBend.x"));
    assert.ok(shader.fragmentShader.includes("illustratedDropShadow = min(illustratedDropShadow, illustratedSunShadow)"));
    assert.ok(shader.fragmentShader.includes("illustratedVisibility=min(illustratedCore,illustratedDropShadow)"));
    assert.ok(!shader.fragmentShader.includes("getShadowMask()"), "reuse the existing shadow sample");
    assert.ok(shader.fragmentShader.includes("#include <lights_fragment_end>"));
  }
  updateIllustratedLight("day", true); assert.equal(illustratedLight.strength.value, 0);
  updateIllustratedLight("dusk", false); assert.ok(illustratedLight.strength.value > 0 && illustratedLight.strength.value < 1);
  assert.ok(illustratedLight.shadow.value.b > illustratedLight.shadow.value.g);
});

test("copied reference assets retain their recorded identities and MIT notice", () => {
  const manifest = JSON.parse(fs.readFileSync("docs/reference-analysis/assets.json", "utf8"));
  for (const asset of manifest.files) {
    const bytes = fs.readFileSync(`public/world3d/folio-reference/${asset.file}`);
    assert.equal(bytes.length, asset.bytes);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  }
  const license = fs.readFileSync("public/world3d/folio-reference/LICENSE.txt", "utf8");
  assert.ok(license.includes("Copyright (c) 2025 Bruno Simon"));
  assert.ok(license.includes("MIT License"));
});

test("offline decoded branch meshes have valid indices, normals and canopy transforms", () => {
  const trees = JSON.parse(fs.readFileSync("public/world3d/folio-reference/trees.json", "utf8"));
  for (const tree of Object.values(trees)) {
    const count = tree.attributes.POSITION.length / 3;
    assert.ok(count > 100 && count < 400);
    assert.equal(tree.attributes.NORMAL.length, count * 3);
    assert.equal(tree.attributes.TEXCOORD_0.length, count * 2);
    assert.ok(tree.indices.every(index => Number.isInteger(index) && index >= 0 && index < count));
    assert.equal(tree.leaves.length, 6);
    assert.ok(tree.leaves.every(leaf => leaf.position.length === 3 && leaf.position.every(Number.isFinite) && leaf.scale > 0));
  }
});

test("miniature focus is opt-in Ultra desktop only", () => {
  for (const quality of ["auto", "low", "medium", "high"]) assert.equal(visualProfile(quality, false).depthOfField, false);
  assert.equal(visualProfile("ultra", false).depthOfField, true);
  assert.equal(visualProfile("ultra", true).depthOfField, false);
});
