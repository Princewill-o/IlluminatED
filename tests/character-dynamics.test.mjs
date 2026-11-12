import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

test("real character rig stays bounded through idle, locomotion, actions and reduced motion", async () => {
  // The creative character kit, without its WebP texture so Node can parse it.
  const bytes = fs.readFileSync("public/world3d/creative-characters/creative-kit.glb");
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  delete json.images; delete json.textures; delete json.samplers; delete json.extensionsUsed; delete json.extensionsRequired;
  for (const material of json.materials) delete material.pbrMetallicRoughness?.baseColorTexture;
  const bin = bytes.subarray(20 + jsonLength + 8);
  const text = Buffer.from(JSON.stringify(json)); const pad = Buffer.alloc((4 - text.length % 4) % 4, 0x20);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(text.length + pad.length, 0); c1.writeUInt32LE(0x4e4f534a, 4);
  const c2 = Buffer.alloc(8); c2.writeUInt32LE(bin.length, 0); c2.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([header, c1, text, pad, c2, bin]); glb.writeUInt32LE(glb.length, 8);
  const asset = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length), "");
  const { clone } = await import("three/examples/jsm/utils/SkeletonUtils.js");
  const load = (file) => {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, Math, Number, Array, Object, Map, Set, Float32Array, JSON, Promise, Error,
      require: name => {
        if (name === "three") return THREE;
        if (name.includes("SkeletonUtils")) return { clone };
        if (name.endsWith(".json")) return { __esModule: true, default: JSON.parse(fs.readFileSync(name.replace("@/", "src/"), "utf8")) };
        if (name === "./accessories3d") return { eyewear3d: () => null, held3d: () => null, hat3d: () => null, pet3d: () => null };
        if (name === "./activity-pose") return load("src/components/game/activity-pose.ts");
        return projectData(name.replace("@/", "src/") + ".ts");
      },
    });
    return exports;
  };
  const { buildCreativeCharacter } = load("src/components/game/creative-character.ts");
  const { DEFAULT_AVATAR } = projectData("src/game/core/cosmetics.ts");
  const character = await buildCreativeCharacter(DEFAULT_AVATAR, 1.15, null, async () => asset);
  const box = new THREE.Box3().setFromObject(character.object, true);
  assert.ok(Math.abs(box.max.y - box.min.y - 1.15 * 0.9) < 0.08, `height ${box.max.y - box.min.y}`);
  for (let frame = 0; frame < 600; frame++) character.update(1 / 60, false, { speed: 0, turn: 0 });
  for (const clip of ["walk", "sprint", "jump", "cycle", "drive", "sit", "argue", "calm", "stretch", "idle"]) {
    character.play(clip);
    for (let i = 0; i < 120; i++) character.update(1 / 60, false, { speed: i < 60 ? 3 : 0, turn: 2 });
    character.object.traverse(node => assert.ok([...node.quaternion.toArray(), ...node.position.toArray()].every(Number.isFinite), `${clip}: ${node.name}`));
    assert.ok(Math.abs(character.object.rotation.z) <= .1);
  }
  character.play("idle");
  for (let i = 0; i < 60; i++) character.update(1 / 60, true, { speed: 10, turn: 4 });
  assert.equal(character.object.rotation.z, 0);
  character.dispose(); character.dispose();
});
