import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const compiled = ts.transpileModule(read('src/lib/learning/products.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {PRODUCTS}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('the public world and school pilot start in the game and expose role contracts',()=>{
  for(const path of ['src/app/world/page.tsx','src/app/world/pilot/page.tsx']) {
    const source=read(path);
    assert.match(source,/\/games\/world\?map=city/,`${path} must open the playable city`);
    assert.match(source,/\/world\/contracts/,`${path} must expose role contracts`);
    assert.match(source,/in-game/i,`${path} must identify the activity as in-game`);
    assert.doesNotMatch(source,/Tech Repair Trainee|Enter the repair shop|35–40/,`${path} must not lead with the retired repair activity`);
  }
});

test('the umbrella and product navigation no longer promote the retired repair activity',()=>{
  for(const path of ['src/app/page.tsx','src/components/products/learning-chrome.tsx']) {
    const source=read(path);
    assert.doesNotMatch(source,/Tech Repair Trainee|\/world\/tech-repair-trainee/);
    assert.match(source,/\/world\/contracts/);
  }
  assert.match(read('src/components/products/learning-chrome.tsx'),/\/world\/my-work/,'saved projects remain reachable');
});

test('product labels distinguish the game from Year 7–11 subject support',()=>{
  assert.match(PRODUCTS.find(p=>p.id==='world').label,/game/i);
  for(const id of ['maths','science','english']) assert.match(PRODUCTS.find(p=>p.id===id).label,/Years 7–11/);
  const english=PRODUCTS.find(p=>p.id==='english');
  assert.match(english.label,/Language/);
  assert.match(english.label,/Literature/);
});
