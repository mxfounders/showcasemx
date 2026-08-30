import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/applications/route';
const payload = { id: '00000000-0000-4000-8000-000000000001', name: 'Test', website: 'https://example.com', email: 'test@example.com', kind: 'Software', problem: 'Ayudamos a organizar la operación de equipos.', company: '' };
function request(data: unknown, origin = 'http://localhost:3000') {
  return new NextRequest('http://localhost:3000/api/applications', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(data) });
}
test('API rejects cross-origin and invalid submissions before storage', async () => {
  assert.equal((await POST(request(payload, 'https://example.com'))).status, 403);
  assert.equal((await POST(request({ ...payload, kind: 'invalid' }))).status, 400);
  assert.equal((await POST(request({ ...payload, company: 'spam' }))).status, 400);
  assert.equal((await POST(request({ ...payload, problem: 'a'.repeat(13000) }))).status, 413);
});
test('API never reports success when storage is unconfigured', async () => {
  const keys = ["NEON_DATABASE_URL", "DATABASE_URL", "POSTGRES_URL"];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => { delete process.env[key]; });
  try {
    const response = await POST(request(payload));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /todavía no está habilitada/);
  } finally { keys.forEach((key, index) => { if (previous[index] !== undefined) process.env[key] = previous[index]; else delete process.env[key]; }); }
});
