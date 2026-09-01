import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { validateNewsletter } from '../src/lib/newsletter';
import { POST } from '../src/app/api/newsletter/route';
const valid = { email: ' TEST@Example.com ', consent: true, company: '', profile: 'founder', role: 'leadership' };
function req(value: unknown, origin = 'http://localhost:3000') { return new NextRequest('http://localhost:3000/api/newsletter', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(value) }); }
test('newsletter requires explicit consent and valid normalized email', () => {
  assert.deepEqual(validateNewsletter(valid), { email: 'test@example.com', profile: 'founder', role: 'leadership' });
  for (const patch of [{ profile: 'invalid' }, { role: 'invalid' }, { profile: null }, { role: '' }, { consent: false }, { consent: 'true' }, { email: 'bad' }, { email: 'a'.repeat(255) }, { company: 'spam' }]) assert.equal(validateNewsletter({ ...valid, ...patch }), null);
});
test('newsletter rejects malformed, cross-origin and oversized requests', async () => {
  assert.equal((await POST(req(valid, 'https://other.example'))).status, 403);
  assert.equal((await POST(req({ ...valid, consent: false }))).status, 400);
  assert.equal((await POST(req({ ...valid, email: 'a'.repeat(2500) }))).status, 413);
});
test('newsletter does not simulate persistence', async () => {
  const keys = ['NEON_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL'];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => { delete process.env[key]; });
  try { assert.equal((await POST(req(valid))).status, 503); }
  finally { keys.forEach((key, i) => { if (previous[i] !== undefined) process.env[key] = previous[i]; else delete process.env[key]; }); }
});
