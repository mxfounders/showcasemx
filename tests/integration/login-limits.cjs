// Opt-in integration test for the login limits (SHCWS-157): failed attempts from one
// network must not lock the account's owner out from another. Creates one temporary
// account through the real registration API and removes it in `finally`.
//
//   RUN_LOGIN_LIMITS_INTEGRATION=1 node tests/integration/login-limits.cjs
//   APP_ORIGIN=http://localhost:3100 RUN_LOGIN_LIMITS_INTEGRATION=1 node tests/integration/login-limits.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, randomUUID } = require('node:crypto');
if (process.env.RUN_LOGIN_LIMITS_INTEGRATION !== '1') {
  console.log('Set RUN_LOGIN_LIMITS_INTEGRATION=1 against a local running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  email = `login-limits-${tag}@example.invalid`,
  password = 'Temporary login-limits passphrase';
// Documentation ranges (RFC 5737): the attacker's network and the owner's.
const attacker = '203.0.113.' + (10 + (parseInt(tag, 16) % 200)),
  owner = '198.51.100.' + (10 + (parseInt(tag, 16) % 200));
const hash = value => createHash('sha256').update(value).digest('hex');

const auth = (action, body, address) =>
  fetch(`${origin}/api/auth/${action}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': address },
    body: JSON.stringify(body),
  });

(async () => {
  try {
    assert.equal((await auth('register', { email, password }, owner)).status, 200);

    // Ten wrong passwords from the attacker's network…
    for (let attempt = 0; attempt < 10; attempt++)
      assert.equal(
        (await auth('login', { email, password: 'wrong password' }, attacker)).status,
        401,
      );
    // …lock that network out, even with the right password, and say how long to wait.
    const blocked = await auth('login', { email, password }, attacker);
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).error, /\d+ min/);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);

    // The owner, on another network, still gets in.
    const ownerLogin = await auth('login', { email, password }, owner);
    assert.equal(ownerLogin.status, 200);
    assert.match(ownerLogin.headers.get('set-cookie') ?? '', /session/);

    // Successful logins never count as failures: the owner can sign in again and again.
    for (let attempt = 0; attempt < 12; attempt++)
      assert.equal((await auth('login', { email, password }, owner)).status, 200);
    console.log('login limits: PASS');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE email=${email}`;
    await sql`DELETE FROM auth_rate_limits WHERE key = ANY(${[
      `auth:fail:${hash(`${email}|${attacker}`)}`,
      `auth:fail:${hash(`${email}|${owner}`)}`,
      `auth:fail-email:${hash(email)}`,
      `auth:address:${hash(attacker)}`,
      `auth:address:${hash(owner)}`,
    ]})`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
