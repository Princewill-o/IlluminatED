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
const { registerSolidSceneryMaterial, solidScenerySignature, mergeSolidScenery, attachWorldBatch } = exports;
const family = {};
const shader = () => {};
const program = () => "shared-world-uniforms";
function palette(colour, group = family) {
  const material = new THREE.MeshStandardMaterial({ color: colour, roughness: .84, metalness: .025 });
  material.onBeforeCompile = shader;
  material.customProgramCacheKey = program;
  registerSolidSceneryMaterial(material, group);
  return material;
}
const cube = material => new THREE.Mesh(new THREE.BoxGeometry(), material);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);
function dispose(mesh) {
  mesh.geometry.dispose();
  mesh.material.dispose();
}

test("solid batches preserve exact linear palette colours, normals, reflections and mirrored geometry in one material", () => {
  const a = cube(palette("#b9634a")), b = cube(palette("#ead9bd"));
  b.geometry = b.geometry.toNonIndexed();
  const parent = new THREE.Group();
  parent.position.set(4, 2, -3); parent.rotation.y = .35;
  a.position.set(2, 1, -1); a.scale.set(-2, 1.5, .6);
  b.position.set(-1, 2, 2); b.rotation.x = .2;
  parent.add(a, b); parent.updateMatrixWorld(true);
  const originalA = a.geometry.attributes.position.array.slice();
  const countA = a.geometry.attributes.position.count;
  const bounds = new THREE.Box3().setFromObject(a, true).union(new THREE.Box3().setFromObject(b, true));
  const merged = mergeSolidScenery([a, b]);
  assert.ok(merged);
  assert.notEqual(merged.material, a.material);
  assert.equal(merged.material.vertexColors, true);
  assert.equal(merged.material.color.getHex(), 0xffffff);
  assert.equal(merged.material.onBeforeCompile, shader);
  assert.equal(merged.material.customProgramCacheKey, program);
  assert.equal(merged.material.roughness, .84);
  assert.equal(merged.material.metalness, .025);
  const colours = merged.geometry.attributes.color;
  for (let i = 0; i < colours.count; i++) {
    const colour = (i < countA ? a : b).material.color;
    close(colours.getX(i), colour.r); close(colours.getY(i), colour.g); close(colours.getZ(i), colour.b);
  }
  assert.ok(merged.geometry.boundingBox.min.distanceTo(bounds.min) < 1e-6);
  assert.ok(merged.geometry.boundingBox.max.distanceTo(bounds.max) < 1e-6);
  const normal = new THREE.Vector3().fromBufferAttribute(a.geometry.attributes.normal, 0)
    .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(a.matrixWorld));
  assert.ok(new THREE.Vector3().fromBufferAttribute(merged.geometry.attributes.normal, 0).distanceTo(normal) < 1e-6);
  // Reflection keeps front-face orientation after removing the original object transform.
  const points = [0, 1, 2].map(i => new THREE.Vector3().fromBufferAttribute(merged.geometry.attributes.position, merged.geometry.index.getX(i)));
  assert.ok(points[1].sub(points[0]).cross(points[2].sub(points[0])).dot(normal) > 0);
  assert.deepEqual(a.geometry.attributes.position.array, originalA);
  assert.equal(a.geometry.getAttribute("color"), undefined);
  assert.equal(a.material.vertexColors, false);
  assert.equal(a.parent, parent); assert.equal(b.parent, parent);
  assert.equal(a.material.color.getHex(), 0xb9634a);
  dispose(merged); dispose(a); dispose(b);
});

test("animated finish clones and unregistered/custom shader families never enter solid colour batches", () => {
  const a = cube(palette("#123456"));
  const clone = cube(a.material.clone());
  assert.equal(solidScenerySignature(clone), null, "cloned weather/window finishes are not registered");
  const otherFamily = cube(palette("#654321", {}));
  assert.equal(mergeSolidScenery([a, otherFamily]), null);
  const customKey = cube(palette("#654321")); customKey.material.customProgramCacheKey = () => "different-world-uniforms";
  assert.equal(mergeSolidScenery([a, customKey]), null);
  for (const mesh of [a, clone, otherFamily, customKey]) dispose(mesh);
});

test("textured, emissive, transparent and pre-coloured surfaces stay independent", () => {
  for (const edit of [
    mesh => { mesh.material.map = new THREE.Texture(); },
    mesh => { mesh.material.transparent = true; },
    mesh => { mesh.material.opacity = .5; },
    mesh => { mesh.material.emissive.set("#ff0000"); },
    mesh => { mesh.material.alphaTest = .5; },
    mesh => { mesh.material.alphaHash = true; },
    mesh => { mesh.material.vertexColors = true; },
    mesh => { mesh.material.clippingPlanes = [new THREE.Plane()]; },
    mesh => { mesh.geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(72), 3)); },
  ]) {
    const mesh = cube(palette("#456789")); edit(mesh);
    assert.equal(solidScenerySignature(mesh), null);
    mesh.material.map?.dispose(); dispose(mesh);
  }
});

test("PBR, shader defines, depth and render-state differences do not merge", () => {
  for (const edit of [
    mesh => { mesh.material.roughness = .3; },
    mesh => { mesh.material.metalness = .5; },
    mesh => { mesh.material.envMapIntensity = 2; },
    mesh => { mesh.material.side = THREE.DoubleSide; },
    mesh => { mesh.material.defines = { STANDARD: "", AUTHOR_LIGHTING: 1 }; },
    mesh => { mesh.material.depthWrite = false; },
    mesh => { mesh.material.polygonOffset = true; },
    mesh => { mesh.renderOrder = 2; },
    mesh => { mesh.castShadow = true; },
    mesh => { mesh.layers.set(2); },
    mesh => { mesh.customDepthMaterial = new THREE.MeshDepthMaterial(); },
    mesh => { mesh.onBeforeRender = () => {}; },
  ]) {
    const a = cube(palette("#112233")), b = cube(palette("#445566")); edit(b);
    assert.equal(mergeSolidScenery([a, b]), null);
    b.customDepthMaterial?.dispose(); dispose(a); dispose(b);
  }
});

test("colour batches retain building ownership and can fade without changing the palette sources", () => {
  const a = cube(palette("#b9634a")), b = cube(palette("#ead9bd")), building = new THREE.Group();
  building.position.set(5, 1, -8); building.rotation.y = .4; building.scale.set(1.3, .9, .7);
  a.position.x = -1; b.position.x = 1; building.add(a, b); building.updateMatrixWorld(true);
  const expected = new THREE.Box3().setFromObject(a, true).union(new THREE.Box3().setFromObject(b, true));
  const merged = mergeSolidScenery([a, b]);
  a.removeFromParent(); b.removeFromParent(); attachWorldBatch(merged, building);
  const actual = new THREE.Box3().setFromObject(merged, true);
  assert.ok(actual.min.distanceTo(expected.min) < 1e-5); assert.ok(actual.max.distanceTo(expected.max) < 1e-5);
  merged.material.opacity = .28; merged.material.transparent = true;
  assert.equal(a.material.opacity, 1); assert.equal(b.material.transparent, false);
  assert.equal(merged.parent, building);
  dispose(merged); dispose(a); dispose(b);
});
