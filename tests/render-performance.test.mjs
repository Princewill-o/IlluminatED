import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";
import { projectData } from "../scripts/lib/project-data.mjs";
const visual = projectData("src/game/core/visual-quality.ts");

test("adaptation pursues sixty frames rather than accepting the mid-thirties", () => {
  const adapt = visual.adaptivePixelRatio(1);
  let ratio = adapt(0);
  for (let time = 1000 / 35; time < 5000; time += 1000 / 35) ratio = adapt(time);
  assert.ok(ratio < 0.8, "35 FPS must trigger continued optimization");
  const steady = visual.adaptivePixelRatio(1);
  for (let frame = 0; frame < 600; frame++) assert.equal(steady(frame * 1000 / 60), 1);
});

test("sustained slow rendering lowers resolution, stable frames recover it, suspension cannot distort it", () => {
  const adapt = visual.adaptivePixelRatio(1.5);
  let ratio = adapt(0);
  for (let time = 50; time <= 6000; time += 50) ratio = adapt(time);
  assert.ok(ratio < 1.5, "slow frames must reduce pixel work");
  assert.ok(ratio >= 0.65);
  const before = ratio;
  adapt(60000, false);
  assert.equal(adapt(60016), before, "suspension is not a slow frame");
  for (let time = 60032; time < 90000; time += 16) ratio = adapt(time);
  assert.ok(ratio > before, "sustained headroom can recover detail");
  assert.ok(ratio <= 1.5);
  assert.ok(Number.isFinite(adapt(NaN)));
});

test("default and touch profiles avoid redundant MSAA and unbounded high-DPI work while retaining lighting", () => {
  for (const touch of [false, true]) {
    const profile = visual.visualProfile(4, touch);
    assert.ok(profile.pixelRatio <= 1.5);
    assert.ok(profile.shadowSize <= 1024);
    assert.ok(profile.samples <= 2);
    assert.equal(profile.adaptiveResolution, true);
    assert.equal(profile.environment, true);
    assert.equal(profile.bloom, true);
  }
});

test("curved-world scenery culling removes distant groups without dropping large near-edge buildings", () => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/components/game/world/scenery-culling.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    { exports, require: () => THREE },
  );
  const cull = exports.sceneryCulling();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 80);
  camera.position.set(30, 10, 42);
  camera.lookAt(30, 0.6, 30);
  camera.updateMatrixWorld(true);
  const near = new THREE.Group(),
    far = new THREE.Group(),
    wide = new THREE.Group();
  near.add(new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3)));
  near.position.set(30, 4, 29);
  far.add(new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3)));
  far.position.set(200, 4, 180);
  wide.add(new THREE.Mesh(new THREE.BoxGeometry(80, 8, 6)));
  wide.position.set(60, 4, 28);
  for (const group of [near, far, wide]) cull.register(group);
  cull.update(camera, { x: 30, z: 30 }, false);
  assert.equal(near.visible, true);
  assert.equal(far.visible, false);
  assert.equal(wide.visible, true);
  cull.update(camera, { x: 30, z: 30 }, true);
  assert.equal(far.visible, true);
  cull.dispose();
});

test("a reusable curved view follows moving bounds and accounts for shader-bent height", () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(
    fs.readFileSync("src/components/game/world/scenery-culling.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText, { exports, require: () => THREE });
  const view = exports.curvedView();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 1000);
  camera.position.set(0,0,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  view.update(camera);
  const bounds = new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5));
  const focus = {x:0,z:0};
  assert.equal(view.intersects(bounds,focus),true);
  bounds.translate(new THREE.Vector3(80,0,0));
  assert.equal(view.intersects(bounds,focus),false,'moving out of view uses the current bounds');
  bounds.translate(new THREE.Vector3(-80,0,0));
  assert.equal(view.intersects(bounds,focus),true,'moving back in does not retain stale culling');
  bounds.set(new THREE.Vector3(-.5,24,-50.5),new THREE.Vector3(.5,26,-49.5));
  const original = bounds.clone();
  const plainView = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  assert.equal(plainView.intersectsBox(bounds),false,'unbent geometry would miss the camera');
  assert.equal(view.intersects(bounds,focus),true,'the shader bends this box down into view');
  assert.ok(bounds.equals(original),'culling never mutates shared caller bounds');
});
