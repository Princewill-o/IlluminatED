import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import * as THREE from 'three';
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/game/accessories3d.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>{if(n==='three')return THREE;throw Error(n)}});
test('headphone band sits over the crown and stays behind the face plane',()=>{
 const headphones=exports.hat3d('hat-headphones','#13203a');const band=headphones.children[0];const bounds=new THREE.Box3().setFromObject(band),size=bounds.getSize(new THREE.Vector3());assert.ok(size.z<size.x*.25,'band should curve across the head, not through the face');assert.ok(bounds.min.y>-.45,'band should only cover the upper half of the head');
});
