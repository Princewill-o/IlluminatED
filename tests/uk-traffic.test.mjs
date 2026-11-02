import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const policy=projectData('src/game/core/uk-traffic.ts');
const {buildUKScene}=projectData('src/game/core/uk-world.ts');
test('the six motorway lanes have opposing carriageways without reversed cars in the same lane',()=>{
  const scene=buildUKScene('m25'),routes=policy.ukTrafficRoutes('m25',scene.routes);
  assert.equal(routes.length,3);assert.equal(policy.ukTrafficOffset('m25'),0);
  const lanes=new Map();
  for(const route of routes) for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i];if(a[1]!==b[1])continue;
    const dir=Math.sign(b[0]-a[0]);assert.equal(lanes.has(a[1]),false);
    lanes.set(a[1],dir);
  }
  for(const row of[28,30,32])assert.equal(lanes.get(row),1);
  for(const row of[40,42,44])assert.equal(lanes.get(row),-1);
  assert.equal(policy.ukAmbientPeople('m25',14),0);
  assert.equal(policy.ukAmbientPeople('rotherhithe',14),0);
  assert.equal(policy.ukAmbientPeople('kent',14),14);
  assert.ok(policy.ukTrafficCount('m25')>=48);
});
