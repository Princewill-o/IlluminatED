import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import * as passModule from "three/examples/jsm/postprocessing/Pass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

let composer;
class ObservedComposer extends EffectComposer {
  constructor(...args) { super(...args); composer = this; }
}
const dependencies = {
  three: THREE,
  "three/examples/jsm/postprocessing/EffectComposer.js": { EffectComposer: ObservedComposer },
  "three/examples/jsm/postprocessing/OutputPass.js": { OutputPass },
  "three/examples/jsm/postprocessing/RenderPass.js": { RenderPass },
  "three/examples/jsm/postprocessing/ShaderPass.js": { ShaderPass },
  "three/examples/jsm/postprocessing/Pass.js": passModule,
  "three/examples/jsm/shaders/FXAAShader.js": { FXAAShader },
  "three/examples/jsm/environments/RoomEnvironment.js": {},
};
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === "./sky-environment") return {};
    return load(path.resolve(path.dirname(file), `${name}.ts`));
  } });
  return exports;
}
const { cinematicRenderer } = load("src/components/game/world/cinematic-renderer.ts");
const { sceneColourGrade } = load("src/components/game/world/scene-colour-grade.ts");
function setup(depthOfField = false, outside = false) {
  const renderer = {
    toneMapping: THREE.NoToneMapping, toneMappingExposure: 1,
    extensions: { has: () => true },
    getPixelRatio: () => 1,
    getSize: target => target.set(1280, 720),
    getContext: () => ({ getInternalformatParameter: () => [] }),
  };
  const scene = new THREE.Scene();
  if (outside) scene.fog = new THREE.Fog("white", 34, 70);
  const result = cinematicRenderer(renderer, scene, new THREE.PerspectiveCamera(), {
    environment: false, postProcessing: true, ambientOcclusion: true,
    occlusionSamples: 8, samples: 0, bloom: true, bloomStrength: .18,
    exposure: 1.12, depthOfField,
  });
  return { result, passes: [...composer.passes] };
}

test("normal HDR presentation grades in its output draw and removes one full-resolution pass", () => {
  const { result, passes } = setup();
  assert.equal(passes.length, 5, "scene, contact, bloom, graded output, FXAA");
  assert.ok(passes[0] instanceof RenderPass);
  assert.equal(passes[2].constructor.name, "LightweightBloomPass");
  const output = passes[3];
  assert.ok(output instanceof OutputPass);
  const source = output.material.fragmentShader;
  assert.ok(source.includes(sceneColourGrade));
  const grade = source.indexOf("gl_FragColor = sceneColourGrade(");
  assert.ok(grade > source.indexOf("void main()"));
  assert.ok(grade < source.indexOf("// tone mapping"));
  assert.ok(source.indexOf("// tone mapping") < source.indexOf("// color space"));
  assert.equal(passes[4].material.fragmentShader, FXAAShader.fragmentShader);
  result.resize(1920, 1080);
  assert.equal(composer.renderTarget1.width, 1920);
  assert.equal(composer.renderTarget1.height, 1080);
  assert.equal(passes[4].uniforms.resolution.value.x, 1 / 1920);
  let outputDisposed = 0;
  output.material.addEventListener("dispose", () => outputDisposed++);
  result.dispose(); result.dispose();
  assert.equal(outputDisposed, 1);
});

test("optional miniature focus keeps grade before blur and output conversion after blur", () => {
  const { result, passes } = setup(true, true);
  assert.equal(passes.length, 7, "focus requires a separate preceding HDR grade");
  assert.ok(passes[3] instanceof ShaderPass);
  assert.ok(passes[3].material.fragmentShader.includes(sceneColourGrade));
  assert.ok(passes[4].uniforms.resolution);
  const output = passes[5];
  assert.ok(output instanceof OutputPass);
  assert.ok(!output.material.fragmentShader.includes("sceneColourGrade"));
  result.resize(800, 600);
  assert.equal(passes[4].uniforms.resolution.value.x, 800);
  assert.equal(passes[4].uniforms.resolution.value.y, 600);
  let gradeDisposed = 0;
  passes[3].material.addEventListener("dispose", () => gradeDisposed++);
  result.dispose(); result.dispose();
  assert.equal(gradeDisposed, 1);
});

test("indoor presentation uses fused grading even when optional focus was requested", () => {
  const { result, passes } = setup(true, false);
  assert.equal(passes.length, 5);
  assert.ok(passes[3].material.fragmentShader.includes(sceneColourGrade));
  const untouched = new OutputPass();
  assert.ok(!untouched.material.fragmentShader.includes("sceneColourGrade"), "do not mutate Three's shared shader");
  untouched.dispose(); result.dispose();
});
