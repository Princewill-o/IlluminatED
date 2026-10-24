import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

test("real character rig stays bounded through idle, locomotion, actions and reduced motion", async () => {
  const bytes = fs.readFileSync("public/world3d/chibi.glb");
  const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/char3d.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => {
      if (name === "three") return THREE;
      if (name.includes("GLTFLoader")) return { GLTFLoader: class { loadAsync() { return Promise.resolve(asset); } } };
      if (name === "./accessories3d") return { eyewear3d: () => null, held3d: () => null, hat3d: () => null, pet3d: () => null };
      if (name === "./character") return { faceCanvas: () => ({ width: 256, height: 256 }) };
      if (name === "./uniform-logo3d") return { addUniformLogo: () => {} };
      return projectData(name.replace("@/", "src/") + ".ts");
    },
  });
  const { DEFAULT_AVATAR } = projectData("src/game/core/cosmetics.ts");
  const character = await exports.buildCharacter(DEFAULT_AVATAR);
  const head = character.object.getObjectByName("head");
  const torso = character.object.getObjectByName("torso");
  const scale = torso.scale.y;
  for (let frame = 0; frame < 3600; frame++) {
    character.update(1 / 60, false, { speed: 0, turn: 0 });
    assert.ok(Math.abs(head.rotation.y) < .3, "idle look must never accumulate");
    assert.ok(Math.abs(torso.rotation.x) < .15);
    assert.ok(Math.abs(torso.scale.y / scale - 1) <= .008);
  }
  for (const clip of ["walk", "sprint", "jump", "cycle", "drive", "wave", "idle"]) {
    character.play(clip);
    for (let i = 0; i < 120; i++) character.update(1 / 60, false, { speed: i < 60 ? 4 : 0, turn: 2 });
    character.object.traverse(node => assert.ok([...node.quaternion.toArray(), ...node.position.toArray()].every(Number.isFinite)));
    assert.ok(Math.abs(character.object.rotation.z) <= .1);
  }
  character.play("idle");
  for (let i = 0; i < 60; i++) character.update(1 / 60, true, { speed: 10, turn: 4 });
  assert.equal(character.object.rotation.z, 0);
  assert.equal(torso.scale.y, scale);
  character.dispose(); character.dispose();
});
