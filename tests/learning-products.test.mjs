import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/learning/products.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {PRODUCTS, productForPath, productForHost, productRewrite, sharedCookieOptions, isLearningDestination, umbrellaHref} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('four products have separate routes and exact subdomain home routing', () => {
  assert.equal(PRODUCTS.length, 4);
  for (const p of PRODUCTS) {
    assert.equal(umbrellaHref(p.host), 'https://illumed.co.uk/');
    assert.equal(productForPath(`${p.path}/topic`).id,p.id);
    assert.equal(productForHost(p.host).id,p.id);
    assert.equal(productRewrite(p.host, '/'), p.path);
    assert.equal(productRewrite(p.host, '/auth/callback'), null);
    assert.equal(productRewrite(p.host, '/api/education/stats'), null);
    assert.equal(productRewrite(p.host, '/curriculum/example'), null);
  }
  assert.equal(umbrellaHref('localhost:3101'), '/');
  for(const host of ['world.illumed.co.uk.evil.test','evil.illumed.co.uk','world-illumed.co.uk','localhost:3101']) {
    assert.equal(productForHost(host),null);
    assert.equal(productRewrite(host,'/'),null);
    assert.equal(sharedCookieOptions(host).domain,undefined);
  }
});

test('trusted siblings share secure cookies; preview and local sessions stay host-only', () => {
  for(const host of ['illumed.co.uk','www.illumed.co.uk',...PRODUCTS.map(p=>p.host)]) {
    assert.deepEqual(sharedCookieOptions(host),{domain:'.illumed.co.uk',path:'/',sameSite:'lax',secure:true});
  }
  assert.equal(sharedCookieOptions('localhost:3101').secure,undefined);
  assert.equal(sharedCookieOptions('project.vercel.app').domain,undefined);
});

test('standalone learning skips character onboarding without changing legacy city gating',()=>{
  for(const path of ['/dashboard','/school/class/abc','/maths/percentages?assignment=abc','/world/tech-repair-trainee']) assert.equal(isLearningDestination(path),true);
  for(const path of ['/games/world','/maths-pretend','/school-access','/admin','/dashboard/settings']) assert.equal(isLearningDestination(path),false);
});
