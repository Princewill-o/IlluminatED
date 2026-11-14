import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/account/paths.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { safeNext } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('auth redirects preserve local destinations and reject external or parser-normalised hosts', () => {
  assert.equal(safeNext('/dashboard?tab=progress'), '/dashboard?tab=progress');
  for (const unsafe of ['https://example.org', '//example.org', '/\\example.org', '/\t/example.org', '/\n/example.org', '/foo\\bar', '/',null].filter(x => x !== '/')) {
    assert.equal(safeNext(unsafe), '/dashboard');
  }
  assert.equal(safeNext('/'), '/');
  assert.equal(safeNext('/' + 'a'.repeat(2000)), '/dashboard');
});
