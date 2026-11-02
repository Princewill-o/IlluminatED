import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const {localGamePreview,localPreviewPath,gameWorldReturn}=projectData('src/lib/game/local-preview.ts');
test('local workplace activities are available offline only with both development gates',()=>{
  const path='/games/promotion-panic/tiny-humans';
  assert.equal(localPreviewPath(path,'development','1'),true);
  for(const [env,flag]of[['production','1'],['development',undefined],['test','1']])assert.equal(localPreviewPath(path,env,flag),false);
  for(const protectedPath of ['/dashboard','/api/account','/games/world','/games/promotion-panic/x/admin'])assert.equal(localPreviewPath(protectedPath,'development','1'),false);
  assert.equal(localGamePreview('production','1'),false);
});
test('activity return links stay inside the correct authenticated or local game',()=>{
  const local='/games/city-showcase?map=city&server=lse-1';
  assert.equal(gameWorldReturn(local,true),local);
  assert.equal(gameWorldReturn(local,false),'/games/world?map=city');
  for(const url of['//evil.example','https://evil.example','/sign-in','/games/world/../../sign-in'])assert.equal(gameWorldReturn(url,true),'/games/city-showcase?map=city');
});
