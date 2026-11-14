// Opt-in integration test for registration (SHCWS-26/155): a new account comes back signed
// in; an existing one is never signed in from the registration form, whatever the
// password, and its owner gets one «you already have an account» email a day. The address
// is Resend's test inbox (delivered+…@resend.dev): accepted and logged, delivered to nobody.
//
//   RUN_REGISTER_INTEGRATION=1 node tests/integration/register-session.cjs
//   APP_ORIGIN=http://localhost:3100 RUN_REGISTER_INTEGRATION=1 node tests/integration/register-session.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, randomUUID } = require('node:crypto');
if (process.env.RUN_REGISTER_INTEGRATION !== '1') {
  console.log('Set RUN_REGISTER_INTEGRATION=1 against a local running app with Resend set.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  // A documentation range of its own, so these attempts never share a limit with other tests.
  address = `203.0.113.${10 + (parseInt(tag, 16) % 200)}`,
  email = `delivered+shwcs-register-${tag}@resend.dev`,
  password = `Prueba registro ${tag} larga`,
  hash = value => createHash('sha256').update(value).digest('hex');

const register = body =>
  fetch(`${origin}/api/auth/register`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': address },
    body: JSON.stringify(body),
  });
const sessionOf = response =>
  (response.headers.getSetCookie?.() ?? [])
    .map(cookie => cookie.split(';')[0])
    .find(cookie => /session=./.test(cookie)) ?? null;
const existingNotices = async () => {
  const [row] =
    await sql`SELECT attempts FROM auth_rate_limits WHERE key=${`register-existing:${hash(email)}`}`;
  return Number(row?.attempts ?? 0);
};

(async () => {
  try {
    // New account: signed in right away, and the session works.
    const created = await register({ email, password });
    assert.equal(created.status, 200);
    assert.deepEqual(await created.json(), { ok: true, registered: true, signedIn: true });
    const session = sessionOf(created);
    assert.ok(session, 'a new account gets a session cookie');
    const bell = await fetch(`${origin}/api/notifications`, { headers: { cookie: session } });
    assert.equal(bell.status, 200, 'the new session works right away');

    // Same email again, other password and the right one: never signed in from here.
    for (const attempt of [`Otra contraseña ${tag} larga`, password]) {
      const again = await register({ email, password: attempt });
      assert.equal(again.status, 200);
      assert.deepEqual(await again.json(), { ok: true, registered: true, signedIn: false });
      assert.equal(sessionOf(again), null, 'an existing account is never signed in here');
    }
    const [{ count }] =
      await sql`SELECT count(*)::int AS count FROM auth_accounts WHERE email=${email}`;
    assert.equal(count, 1);

    // The owner hears about it once a day, not once per attempt.
    for (let second = 0; second < 20 && (await existingNotices()) < 2; second++)
      await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(await existingNotices(), 2, 'two attempts counted');
    if (env.RESEND_API_KEY) {
      // Resend's list of recent emails shows exactly one «ya tienes una cuenta» for this address.
      let mine = [];
      for (let second = 0; second < 20 && mine.length === 0; second++) {
        const list = await fetch('https://api.resend.com/emails?limit=50', {
          headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
        });
        if (list.ok) {
          const body = await list.json();
          mine = (body.data ?? []).filter(
            item =>
              (item.to ?? []).includes(email) && /Ya tienes una cuenta/.test(item.subject ?? ''),
          );
        } else break;
        if (mine.length === 0) await new Promise(resolve => setTimeout(resolve, 1000));
      }
      assert.equal(mine.length, 1, 'one «already have an account» email');
    }
    console.log('register session: PASS');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE email=${email}`;
    await sql`DELETE FROM auth_rate_limits WHERE key=${`register-existing:${hash(email)}`} OR key=${`auth:address:${hash(address)}`}`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
