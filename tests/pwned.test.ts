import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { passwordLeaked } from '../src/lib/auth/pwned';

const sha1 = (value: string) => createHash('sha1').update(value).digest('hex').toUpperCase();

test('only the hash prefix leaves the server and a listed suffix means leaked', async () => {
  const digest = sha1('password123');
  let asked = '';
  const fake = (async (url: string | URL) => {
    asked = String(url);
    return new Response(`0000000000000000000000000000000000A:0\n${digest.slice(5)}:251682\n`);
  }) as typeof fetch;
  assert.equal(await passwordLeaked('password123', fake), true);
  assert.equal(asked, `https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`);
  assert.ok(!asked.includes('password123') && !asked.includes(digest.slice(5)));
});

test('a padding row (count 0) or an absent suffix is not a leak', async () => {
  const digest = sha1('a perfectly unusual passphrase');
  const padded = (async () => new Response(`${digest.slice(5)}:0\n`)) as unknown as typeof fetch;
  assert.equal(await passwordLeaked('a perfectly unusual passphrase', padded), false);
  const absent = (async () => new Response('ABCDEF:3\n')) as unknown as typeof fetch;
  assert.equal(await passwordLeaked('a perfectly unusual passphrase', absent), false);
});

test('no network or an error answer never blocks: null', async () => {
  const offline = (async () => {
    throw new TypeError('fetch failed');
  }) as unknown as typeof fetch;
  assert.equal(await passwordLeaked('password123', offline), null);
  const down = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
  assert.equal(await passwordLeaked('password123', down), null);
});
