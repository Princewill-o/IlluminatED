import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import * as THREE from "three";
import ts from "typescript";

const exports = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/components/game/world/architecture-finish3d.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports, require: () => THREE, document: { createElement: () => ({ getContext: () => null }) } },
);

test("shared facade materials follow sunset, rain and sunrise without replacing the original materials", () => {
  const world = new THREE.Group();
  const glassSource = new THREE.MeshLambertMaterial({ color: "#c4b284" });
  const brickSource = new THREE.MeshStandardMaterial({ color: "#b9634a", roughness: 0.84 });
  const callback = () => {};
  glassSource.onBeforeCompile = callback;
  glassSource.customProgramCacheKey = () => "authored-curved-material";
  const pane = new THREE.Mesh(new THREE.BoxGeometry(), glassSource);
  const secondPane = new THREE.Mesh(pane.geometry, glassSource);
  const brick = new THREE.Mesh(pane.geometry, brickSource);
  world.add(pane, secondPane, brick);
  const release = exports.finishArchitecture(world, "day");
  const paneMaterial = pane.material, brickMaterial = brick.material;
  assert.equal(paneMaterial, secondPane.material, "matching variants stay batchable");
  assert.equal(paneMaterial.onBeforeCompile, callback);
  assert.equal(paneMaterial.customProgramCacheKey(), "authored-curved-material");
  assert.equal(paneMaterial.emissiveIntensity, 0);
  assert.equal(glassSource.color.getHexString(), "c4b284");
  const dryColour = brickMaterial.color.clone(), dryRoughness = brickMaterial.roughness;
  release.update("night", 1, 0.016);
  assert.ok(paneMaterial.emissiveIntensity > 0 && paneMaterial.emissiveIntensity < 0.1, "sunset eases in");
  for (let i = 0; i < 300; i++) release.update("night", 1, 0.016);
  assert.ok(paneMaterial.emissiveIntensity > 0.89);
  assert.ok(paneMaterial.emissive.r > paneMaterial.emissive.b);
  assert.ok(brickMaterial.roughness < dryRoughness * 0.5);
  assert.ok(brickMaterial.color.r < dryColour.r);
  assert.equal(pane.material, paneMaterial);
  assert.equal(brick.material, brickMaterial);
  assert.equal(brickSource.roughness, 0.84);
  for (let i = 0; i < 300; i++) release.update("day", 0, 0.016);
  assert.ok(paneMaterial.emissiveIntensity < 0.001);
  assert.ok(Math.abs(brickMaterial.roughness - dryRoughness) < 0.001);
  let disposals = 0;
  paneMaterial.addEventListener("dispose", () => disposals++);
  release();
  release();
  release.update("night", 1);
  assert.equal(disposals, 1);
  pane.geometry.dispose();
  glassSource.dispose(); brickSource.dispose();
});

test("non-facade materials and mapped authored surfaces remain untouched", () => {
  const world = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: "#ff0000" });
  const mapped = new THREE.MeshStandardMaterial({ color: "#b9634a", map: new THREE.Texture() });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  const custom = new THREE.Mesh(mesh.geometry, mapped);
  world.add(mesh, custom);
  const release = exports.finishArchitecture(world, "night");
  release.update("day", Number.NaN, Number.POSITIVE_INFINITY);
  assert.equal(mesh.material, material);
  assert.equal(custom.material, mapped);
  assert.equal(mesh.material.color.getHexString(), "ff0000");
  release();
  mesh.geometry.dispose(); material.dispose(); mapped.map.dispose(); mapped.dispose();
});

test("the actual London lamp GLB's named emissive glass dims by day and lights at night", () => {
  const bytes = fs.readFileSync("public/world3d/london/lamp.glb");
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const description = gltf.materials.find(material => material.name === "lit");
  assert.ok(description);
  const source = new THREE.MeshStandardMaterial({
    name: description.name,
    color: new THREE.Color().fromArray(description.pbrMetallicRoughness.baseColorFactor),
    roughness: description.pbrMetallicRoughness.roughnessFactor,
    emissive: new THREE.Color().fromArray(description.emissiveFactor),
    emissiveIntensity: description.extensions.KHR_materials_emissive_strength.emissiveStrength,
  });
  const world = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(), source);
  world.add(glass);
  const release = exports.finishArchitecture(world, "day");
  const finished = glass.material;
  assert.notEqual(finished, source);
  assert.ok(finished.emissiveIntensity < 0.05, "daytime glass stops glowing at night intensity");
  for (let i = 0; i < 300; i++) release.update("night", 0, 0.016);
  assert.ok(finished.emissiveIntensity > 1.59);
  assert.ok(source.emissiveIntensity > 1.39, "shared glTF source is untouched");
  for (let i = 0; i < 300; i++) release.update("day", 0, 0.016);
  assert.ok(finished.emissiveIntensity < 0.05);
  release(); glass.geometry.dispose(); source.dispose();
});
