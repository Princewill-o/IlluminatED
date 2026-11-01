import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {projectData} from '../scripts/lib/project-data.mjs';
const conflict=projectData('src/game/core/civilian-conflict.ts');
function runtime({energy=80,active=true}={}){
 let time=100000,tick,downed=0,callbacks=[],cleanups=[];const cases=[],window=new EventTarget();
 const id=Array.from({length:100},(_,i)=>`city:resident:${i}`).find(id=>conflict.civilianDisposition(id).hostile);
 const npc={id,name:'Alex',x:0,y:0},art={NPC_SPOTS:[npc],PLAYER:{x:0,y:0}};
 const react={useRef:value=>({current:value}),useState:value=>[value,()=>{}],useCallback:fn=>fn,useEffect:fn=>callbacks.push(fn)};
 const exports={};const js=ts.transpileModule(fs.readFileSync('src/components/game/world/use-street-encounters.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,window,CustomEvent,Date:{now:()=>time},setInterval:fn=>{tick=fn;return 1},clearInterval:()=>{},require:name=>name==='react'?react:name==='./art'?art:name==='./use-needs'?{damageEnergy:n=>(energy=Math.max(0,energy-n)),readNeeds:()=>({energy})}:conflict});
 const hook=exports.useStreetEncounters(active,c=>cases.push(c),()=>downed++);for(const effect of callbacks){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}
 return {hook,window,npc,cases,advance:ms=>{time+=ms;tick?.()},energy:()=>energy,downed:()=>downed,dispose:()=>cleanups.forEach(f=>f())};
}
test('a civilian hit drains energy; a prompt defensive hit retains first-attacker evidence and avoids aggression',()=>{
 const r=runtime();r.advance(250);r.advance(2250);assert.equal(r.energy(),71);assert.equal(r.hook.defend(),true);assert.equal(r.cases.length,0);r.window.dispatchEvent(new CustomEvent('illuminated:street-hit',{detail:{npcId:r.npc.id,npcName:r.npc.name,defensive:true}}));assert.equal(r.cases.length,1);assert.notEqual(r.cases[0].kind,'aggression');assert.equal(r.cases[0].caseFile?.evidence.firstAttacker??'civilian','civilian');r.dispose();
});
test('unresisted attacks at zero energy call ambulance once and never file a player offence',()=>{
 const r=runtime({energy:9});r.advance(250);r.advance(2250);assert.equal(r.downed(),1);assert.equal(r.energy(),0);assert.equal(r.cases[0].kind,'no-case');r.advance(5000);assert.equal(r.downed(),1);r.dispose();
});
test('explicit confirmed player hits are prosecuted even while the confirmation dialog pauses ambient aggression',()=>{
 const r=runtime({active:false});r.window.dispatchEvent(new CustomEvent('illuminated:street-hit',{detail:{npcId:r.npc.id,npcName:r.npc.name}}));assert.equal(r.cases.length,1);assert.equal(r.cases[0].kind,'aggression');assert.equal(r.cases[0].caseFile.evidence.firstAttacker,'player');r.dispose();
});
