import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import * as THREE from "three";
import * as geometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/world/static-scenery-batches.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: name => name === "three" ? THREE : geometryUtils });
const { mergeStaticScenery, staticScenerySignature } = exports;

test("static cell bakes distinct indexed/nonindexed geometry, transforms and normals without touching sources", () => {
  const material = new THREE.MeshStandardMaterial();
  const depth = new THREE.MeshDepthMaterial();
  const hook = () => {};
  material.onBeforeCompile = hook;
  const parent = new THREE.Group(); parent.position.set(7, 2, -5);
  const a = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3), material);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.5, 2, 6).toNonIndexed(), material);
  a.position.set(2, 1, 3); a.rotation.y = 0.7; a.scale.set(2, 1.5, 0.6);
  b.position.set(-3, 0, -1); b.rotation.z = 0.3;
  for (const mesh of [a, b]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.customDepthMaterial = depth; parent.add(mesh); }
  parent.updateMatrixWorld(true);
  const before = a.geometry.attributes.position.array.slice();
  const bounds = new THREE.Box3().setFromObject(a, true).union(new THREE.Box3().setFromObject(b, true));
  const normal = new THREE.Vector3().fromBufferAttribute(a.geometry.attributes.normal, 0)
    .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(a.matrixWorld));
  const merged = mergeStaticScenery([a, b]);
  assert.ok(merged);
  assert.equal(merged.material, material); assert.equal(merged.material.onBeforeCompile, hook);
  assert.equal(merged.customDepthMaterial, depth); assert.equal(merged.castShadow, true); assert.equal(merged.receiveShadow, true);
  assert.ok(merged.geometry.boundingBox.min.distanceTo(bounds.min) < 1e-6);
  assert.ok(merged.geometry.boundingBox.max.distanceTo(bounds.max) < 1e-6);
  assert.ok(new THREE.Vector3().fromBufferAttribute(merged.geometry.attributes.normal, 0).distanceTo(normal) < 1e-6);
  assert.deepEqual(a.geometry.attributes.position.array, before);
  assert.equal(a.parent, parent); assert.equal(b.parent, parent);
  assert.equal(merged.geometry.index.count, a.geometry.index.count + b.geometry.attributes.position.count);
  merged.geometry.dispose(); a.geometry.dispose(); b.geometry.dispose(); material.dispose(); depth.dispose();
});

test("mirrored transforms retain front-face winding and normalized colour attributes", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  geometry.setAttribute("color", new THREE.Uint8BufferAttribute([255, 128, 0, 255, 128, 0, 255, 128, 0], 3, true));
  const material = new THREE.MeshStandardMaterial({ vertexColors: true });
  const a = new THREE.Mesh(geometry, material), b = new THREE.Mesh(geometry, material);
  a.scale.x = -1; b.position.x = 3;
  const merged = mergeStaticScenery([a, b]);
  assert.ok(merged);
  const points = [0, 1, 2].map(i => new THREE.Vector3().fromBufferAttribute(merged.geometry.attributes.position, merged.geometry.index.getX(i)));
  assert.ok(points[1].sub(points[0]).cross(points[2].sub(points[0])).z > 0);
  assert.equal(merged.geometry.attributes.color.normalized, true);
  assert.equal(merged.geometry.attributes.color.array.constructor, Uint8Array);
  assert.equal(merged.geometry.attributes.color.getY(0), 128 / 255);
  assert.equal(geometry.index, null);
  merged.geometry.dispose(); geometry.dispose(); material.dispose();
});

test("incompatible, animated or partial geometry is safely left to the existing renderer", () => {
  const material = new THREE.MeshStandardMaterial();
  const a = new THREE.Mesh(new THREE.BoxGeometry(), material), b = new THREE.Mesh(new THREE.BoxGeometry(), material);
  b.receiveShadow = true;
  assert.equal(mergeStaticScenery([a, b]), null);
  b.receiveShadow = false; b.geometry.setDrawRange(3, 3);
  assert.equal(staticScenerySignature(b), null);
  b.geometry.setDrawRange(0, Infinity);
  b.geometry.morphAttributes.position = [b.geometry.attributes.position.clone()];
  assert.equal(staticScenerySignature(b), null);
  a.geometry.dispose(); b.geometry.dispose(); material.dispose();
});
