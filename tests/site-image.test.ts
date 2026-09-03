import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { isPrivateAddress, readImageMeta } from '../src/lib/solutions/site-image';
import { POST as siteImagePost } from '../src/app/api/solutions/[id]/site-image/route';

test('private, loopback and metadata addresses are never fetched', () => {
  for (const address of ['127.0.0.1', '10.0.0.5', '172.16.4.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', 'no-es-una-ip']) {
    assert.equal(isPrivateAddress(address), true, `${address} debería bloquearse`);
  }
  for (const address of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.169.0.1', '2606:4700::1111']) {
    assert.equal(isPrivateAddress(address), false, `${address} es público y debería permitirse`);
  }
});

test('the og:image is read from the head and resolved against the page', () => {
  const page = 'https://ejemplo.test/producto/';
  assert.equal(readImageMeta('<head><meta property="og:image" content="/portada.png"></head>', page), 'https://ejemplo.test/portada.png');
  assert.equal(readImageMeta('<head><meta name="twitter:image" content="https://cdn.test/a.jpg"></head>', page), 'https://cdn.test/a.jpg');
  // The secure variant wins over the plain one.
  assert.equal(readImageMeta('<head><meta property="og:image" content="http://a.test/x.png"><meta property="og:image:secure_url" content="https://a.test/x.png"></head>', page), 'https://a.test/x.png');
  assert.equal(readImageMeta('<head><title>sin portada</title></head>', page), null);
  // A tag that only appears in the body is ignored: it is not page metadata.
  assert.equal(readImageMeta('<head></head><body><meta property="og:image" content="/tarde.png"></body>', page), null);
});

test('reading a site cover requires the owner session and the same origin', async () => {
  const path = 'https://shwcs.example/api/solutions/00000000-0000-4000-8000-000000000001/site-image';
  const params = Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' });
  const foreign = await siteImagePost(new NextRequest(path, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' }), { params });
  assert.equal(foreign.status, 403);
  const anonymous = await siteImagePost(new NextRequest(path, { method: 'POST', headers: { origin: 'https://shwcs.example', 'content-type': 'application/json' }, body: '{}' }), { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }) });
  assert.equal(anonymous.status, 401);
});
