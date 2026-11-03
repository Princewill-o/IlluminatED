import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as THREE from "three";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/world/static-shadow-batches.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: () => THREE });
const { createStaticShadowBatch } = exports;
function freeze(mesh, depth) {
  mesh.updateWorldMatrix(true, false); mesh.matrixAutoUpdate = false; mesh.matrixWorldAutoUpdate = false;
  mesh.castShadow = true; mesh.customDepthMaterial = depth;
  return mesh;
}
function pair() {
  const depth = new THREE.MeshDepthMaterial();
  const a = freeze(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: "red" })), depth);
  const b = freeze(new THREE.Mesh(new THREE.CylinderGeometry(1, .5, 2, 6).toNonIndexed(), new THREE.MeshStandardMaterial({ color: "blue" })), depth);
  return { a, b, depth };
}
function dispose({ a, b, depth }) {
  for (const mesh of [a, b]) { mesh.geometry.dispose(); mesh.material.dispose(); }
  depth.dispose();
}

test("one exact depth proxy combines transformed indexed/nonindexed casters, leaves colour draws intact and restores flags", () => {
  const setup = pair(), { a, b, depth } = setup;
  a.matrixWorld.makeRotationY(.3).setPosition(3, 2, -1);
  b.matrixWorld.makeScale(-2, 1, .7).setPosition(-2, 1, 4);
  const before = b.geometry.attributes.position.array.slice();
  const bounds = new THREE.Box3().setFromObject(a, true).union(new THREE.Box3().setFromObject(b, true));
  const batch = createStaticShadowBatch([a, b], depth);
  assert.ok(batch);
  const proxy = batch.mesh;
  assert.equal(proxy.customDepthMaterial, depth); assert.equal(proxy.castShadow, true);
  assert.equal(proxy.material.colorWrite, false); assert.equal(proxy.material.depthWrite, false);
  assert.equal(proxy.frustumCulled, false);
  assert.equal(a.castShadow, false); assert.equal(b.castShadow, false);
  assert.equal(a.visible, true); assert.equal(a.material.color.getHex(), 0xff0000);
  assert.ok(proxy.geometry.boundingBox.min.distanceTo(bounds.min) < 1e-6);
  assert.ok(proxy.geometry.boundingBox.max.distanceTo(bounds.max) < 1e-6);
  assert.equal(proxy.geometry.index.count, a.geometry.index.count + b.geometry.attributes.position.count);
  assert.deepEqual(b.geometry.attributes.position.array, before);
  assert.equal(proxy.geometry.drawRange.count, 0, "no colour/depth draw in main presentation passes");
  for (let light = 0; light < 2; light++) {
    proxy.onBeforeShadow(); assert.equal(proxy.geometry.drawRange.count, proxy.geometry.index.count);
    proxy.onAfterShadow(); assert.equal(proxy.geometry.drawRange.count, 0);
  }
  let geometryDisposals = 0, materialDisposals = 0;
  proxy.geometry.addEventListener("dispose", () => geometryDisposals++);
  proxy.material.addEventListener("dispose", () => materialDisposals++);
  batch.dispose(); batch.dispose();
  assert.equal(a.castShadow, true); assert.equal(b.castShadow, true);
  assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
  dispose(setup);
});

test("instanced shadow geometry expands every world transform and corrects mirrored winding", () => {
  const depth = new THREE.MeshDepthMaterial(), geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  const material = new THREE.MeshStandardMaterial();
  const instances = new THREE.InstancedMesh(geometry, material, 2);
  instances.setMatrixAt(0, new THREE.Matrix4().makeTranslation(3, 2, 1));
  instances.setMatrixAt(1, new THREE.Matrix4().makeScale(-2, 1, 1).setPosition(-2, 1, 3));
  instances.position.set(5, 0, -1); freeze(instances, depth);
  const other = new THREE.Mesh(geometry, material); other.position.set(1, 1, 1); freeze(other, depth);
  const batch = createStaticShadowBatch([instances, other], depth);
  assert.ok(batch); assert.equal(batch.mesh.geometry.attributes.position.count, 9);
  const p = batch.mesh.geometry.attributes.position;
  assert.deepEqual([p.getX(0), p.getY(0), p.getZ(0)], [8, 2, 0]);
  assert.deepEqual([p.getX(3), p.getY(3), p.getZ(3)], [3, 1, 2]);
  const points = [3, 4, 5].map(i => new THREE.Vector3().fromBufferAttribute(p, batch.mesh.geometry.index.getX(i)));
  assert.ok(points[1].sub(points[0]).cross(points[2].sub(points[0])).z > 0);
  batch.dispose(); geometry.dispose(); material.dispose(); depth.dispose(); instances.dispose();
});

test("alpha, moving, custom, double-sided and partial sources are rejected without changing any source", () => {
  for (const edit of [
    ({ b }) => { b.material.alphaTest = .5; },
    ({ b }) => { b.material.alphaMap = new THREE.Texture(); },
    ({ b }) => { b.material.transparent = true; },
    ({ b }) => { b.material.displacementMap = new THREE.Texture(); },
    ({ b }) => { b.material.clippingPlanes = [new THREE.Plane()]; },
    ({ b }) => { b.material.side = THREE.DoubleSide; },
    ({ b }) => { b.material.shadowSide = THREE.FrontSide; },
    ({ b }) => { b.material.visible = false; },
    ({ b }) => { b.matrixAutoUpdate = true; },
    ({ b }) => { b.matrixWorldAutoUpdate = true; },
    ({ b }) => { b.userData.foliage = true; },
    ({ b }) => { b.userData.vehicleRig = true; },
    ({ b }) => { b.onBeforeShadow = () => {}; },
    ({ b }) => { b.onBeforeRender = () => {}; },
    ({ b }) => { b.geometry.setDrawRange(0, 3); },
    ({ b }) => { b.geometry.morphAttributes.position = [b.geometry.attributes.position.clone()]; },
    ({ b }) => { b.customDepthMaterial = undefined; },
    ({ b }) => { b.layers.set(3); },
    ({ b }) => { b.matrixWorld.makeScale(0, 1, 1); },
  ]) {
    const setup = pair(); edit(setup);
    assert.equal(createStaticShadowBatch([setup.a, setup.b], setup.depth), null);
    assert.equal(setup.a.castShadow, true); assert.equal(setup.b.castShadow, true);
    setup.b.material.alphaMap?.dispose(); setup.b.material.displacementMap?.dispose(); dispose(setup);
  }
});

test("oversized cells remain untouched and a parent visibility owner also hides its shadow proxy", () => {
  const setup = pair();
  const huge = new THREE.InstancedMesh(setup.a.geometry, setup.a.material, 20_000);
  freeze(huge, setup.depth);
  assert.equal(createStaticShadowBatch([huge, setup.b], setup.depth), null);
  assert.equal(huge.castShadow, true);
  const batch = createStaticShadowBatch([setup.a, setup.b], setup.depth), parent = new THREE.Group();
  parent.add(batch.mesh); parent.visible = false;
  assert.equal(batch.mesh.parent.visible, false);
  batch.dispose(); assert.equal(batch.mesh.parent, null);
  dispose(setup); huge.dispose();
});
