import { test } from 'node:test';
import assert from 'node:assert/strict';
import loader from '../src/lib/images/loader.js';

test('media URLs are rewritten to ?w= snapped up to 400/800/1600', () => {
  const base = '/api/solutions/11111111-1111-4111-8111-111111111111/media/22222222-2222-4222-8222-222222222222';
  assert.equal(loader({ src: base, width: 64 }), `${base}?w=400`);
  assert.equal(loader({ src: base, width: 400 }), `${base}?w=400`);
  assert.equal(loader({ src: base, width: 401 }), `${base}?w=800`);
  assert.equal(loader({ src: base, width: 800 }), `${base}?w=800`);
  assert.equal(loader({ src: base, width: 1200 }), `${base}?w=1600`);
  assert.equal(loader({ src: base, width: 4000 }), `${base}?w=1600`);
});

test('an existing query string gets &w=, not ?w=', () => {
  const src = '/api/solutions/aaa/media/bbb?foo=1';
  assert.equal(loader({ src, width: 500 }), `${src}&w=800`);
});

test('non-media URLs pass through untouched', () => {
  for (const src of [
    '/api/solutions/aaa/site-image',
    '/api/solutions/aaa/site-image?v=abc',
    '/api/account/avatar',
    '/brand/shwcs-logo-1.png',
    'https://example.com/x.png',
    '',
  ]) {
    assert.equal(loader({ src, width: 800 }), src);
  }
});
