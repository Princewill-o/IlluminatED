/** Read-only smoke checks: no accounts, emails, charges or learner data created. */
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://localhost:3002';
const publicPaths = ['/', '/sign-in', '/about', '/faq', '/privacy', '/terms', '/contact', '/safeguarding', '/robots.txt', '/sitemap.xml'];
const privatePaths = ['/dashboard', '/admin', '/onboarding', '/getting-started', '/premium', '/billing', '/premium/success', '/tiggy', '/social', '/quizzes', '/flashcards', '/calculator', '/exam-mode', '/resources', '/revision', '/jobs', '/next-steps'];
for (const path of publicPaths) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  const body = await response.text();
  assert.equal(response.status, 200, `${path}: public route must load`);
  assert.ok(!body.includes('Enter your access code to explore'), `${path}: preview gate must be removed`);
  assert.ok(!body.includes('illuminated-omega.vercel.app'), `${path}: old deployment domain must be absent`);
  console.log(`PASS public ${path}`);
}
for (const path of privatePaths) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  assert.ok([303,307,308].includes(response.status), `${path}: account must be required`);
  assert.ok(response.headers.get('location')?.includes('/sign-in'), `${path}: redirect must ask for sign-in`);
  console.log(`PASS protected ${path}`);
}
for (const [path, method] of [['/api/education/state?export=1', 'GET'], ['/api/tiggy','POST'], ['/api/stripe/webhook','POST']]) {
  const response = await fetch(`${base}${path}`, {method, headers:{'Content-Type':'application/json'}, ...(method === 'POST' ? {body:'{}'} : {}), redirect:'manual'});
  assert.ok([400,401,403,503].includes(response.status), `${path}: unauthorised requests must be rejected`);
  console.log(`PASS unauthorised ${path} (${response.status})`);
}
const callback = await fetch(`${base}/auth/callback?next=${encodeURIComponent('//example.org')}`, { redirect:'manual' });
assert.ok(callback.headers.get('location')?.includes('/sign-in?'), 'Invalid auth links must return safely to sign-in');
assert.ok(!callback.headers.get('location')?.startsWith('https://example.org'), 'Auth callback must not redirect to another site');
console.log('PASS invalid auth callback');

for (const type of ['practice', 'checklist', 'notes']) {
  const response = await fetch(`${base}/api/downloads?course=gcse-maths&type=${type}&topic=gcse-maths-percentages`);
  assert.equal(response.status, 200, `${type}: PDF download must succeed`);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.ok(response.headers.get('content-disposition')?.includes('illuminated-'));
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), '%PDF');
  const { PDFDocument } = await import('pdf-lib');
  assert.ok((await PDFDocument.load(bytes)).getPageCount() > 0);
  console.log(`PASS branded ${type} PDF`);
}
