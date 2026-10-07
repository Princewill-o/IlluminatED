import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/checkout-confirmation.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { confirmedSubscription } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const fixture = () => ({ mode: 'subscription', status: 'complete', livemode: true,
  client_reference_id: 'owner', metadata: { user_id: 'owner' }, customer: 'cus_owner', payment_status: 'no_payment_required',
  subscription: { id: 'sub_owner', customer: 'cus_owner', livemode: true, metadata: { user_id: 'owner' }, status: 'trialing', items: { data: [{ price: { id: 'price_premium' } }] } } });
const confirm = session => confirmedSubscription(session, 'owner', 'cus_owner', 'price_premium', true);
test('confirms a completed trial and a paid active subscription', () => {
  const session = fixture(); assert.equal(confirm(session)?.status, 'trialing');
  session.subscription.status = 'active'; session.payment_status = 'paid'; assert.equal(confirm(session)?.status, 'active');
});
test('rejects checkout belonging to another account or customer', () => {
  for (const mutate of [s => s.client_reference_id = 'other', s => s.metadata.user_id = 'other', s => s.customer = 'cus_other', s => s.subscription.customer = 'cus_other', s => s.subscription.metadata.user_id = 'other']) {
    const session = fixture(); mutate(session); assert.equal(confirm(session), null);
  }
});
test('rejects sandbox, wrong product, unpaid and unfinished sessions', () => {
  for (const mutate of [s => s.livemode = false, s => s.subscription.livemode = false, s => s.subscription.items.data[0].price.id = 'other', s => s.payment_status = 'unpaid', s => s.status = 'open', s => s.subscription.status = 'canceled', s => s.subscription = 'sub_unexpanded']) {
    const session = fixture(); mutate(session); assert.equal(confirm(session), null);
  }
});
test('cannot confirm without an account customer mapping or configured price', () => {
  assert.equal(confirmedSubscription(fixture(), 'owner', null, 'price_premium', true), null);
  assert.equal(confirmedSubscription(fixture(), 'owner', 'cus_owner', '', true), null);
});

const siteSource = readFileSync(new URL('../src/lib/site.ts', import.meta.url), 'utf8');
const siteJs = ts.transpileModule(siteSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { siteOrigin } = await import(`data:text/javascript;base64,${Buffer.from(siteJs).toString('base64')}`);
test('production customer links ignore deployment aliases and untrusted URL configuration', () => {
  const original = { mode: process.env.NODE_ENV, url: process.env.NEXT_PUBLIC_SITE_URL, key: process.env.STRIPE_SECRET_KEY };
  try {
    process.env.NODE_ENV = 'production'; process.env.NEXT_PUBLIC_SITE_URL = 'https://deployment-alias.vercel.app';
    assert.equal(siteOrigin(), 'https://illumed.co.uk');
    process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3001'; process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
    assert.equal(siteOrigin(), 'http://localhost:3001');
    process.env.STRIPE_SECRET_KEY = 'sk_live_fixture'; assert.equal(siteOrigin(), 'https://illumed.co.uk');
  } finally {
    for (const [key, value] of Object.entries({ NODE_ENV: original.mode, NEXT_PUBLIC_SITE_URL: original.url, STRIPE_SECRET_KEY: original.key })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
