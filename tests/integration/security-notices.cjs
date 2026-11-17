// Opt-in integration test for security notices (SHCWS-154): every security event emails
// the owner right away, whatever their preferences, and the «No fui yo» path (choosing a
// new password) closes every session. Google link/unlink needs real OAuth and is left
// out. The account lives at Resend's test inbox (delivered+…@resend.dev): logged by the
// provider, delivered to nobody. Needs AUTH_TOTP_KEY. Fixtures are removed in `finally`.
//
//   RUN_SECURITY_NOTICES_INTEGRATION=1 node tests/integration/security-notices.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, createHmac, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_SECURITY_NOTICES_INTEGRATION !== '1') {
  console.log(
    'Set RUN_SECURITY_NOTICES_INTEGRATION=1 against a local running app with Resend set.',
  );
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  email = `delivered+shwcs-security-${tag}@resend.dev`,
  passwords = [1, 2, 3].map(n => `Frase de seguridad ${n} poco común ${tag}`),
  address = `192.0.2.${10 + (parseInt(tag, 16) % 200)}`,
  mac =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
  windows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';

// RFC 6238 with the same parameters as src/lib/auth/totp.ts (SHA-1, 30 s, 6 digits).
function totp(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.replace(/=+$/, '').toUpperCase())
    bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const mac = createHmac('sha1', key).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1e6).padStart(6, '0');
}
const cookiesOf = response =>
  (response.headers.getSetCookie?.() ?? [])
    .map(cookie => cookie.split(';')[0])
    .filter(cookie => !cookie.endsWith('='))
    .join('; ');
const call = (path, body, { cookie = '', agent = mac } = {}) =>
  fetch(origin + path, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      'user-agent': agent,
      'x-forwarded-for': address,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
let accountId = '';
const sentNotice = async pattern => {
  for (let second = 0; second < 30; second++) {
    const rows =
      await sql`SELECT title, email_state FROM account_notifications WHERE owner_id=${accountId} AND category='security'`;
    const row = rows.find(item => pattern.test(String(item.title)));
    if (row && !['pending', 'sending'].includes(row.email_state)) return row;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
};
const expectSent = async (pattern, label) =>
  assert.equal((await sentNotice(pattern))?.email_state, 'sent', label);

(async () => {
  try {
    assert.equal((await call('/api/auth/register', { email, password: passwords[0] })).status, 200);
    [{ id: accountId }] = await sql`SELECT id::text FROM auth_accounts WHERE email=${email}`;

    // The account's first device is not news; a second one is.
    const first = await call('/api/auth/login', { email, password: passwords[0] });
    assert.equal(first.status, 200);
    const session = cookiesOf(first);
    await new Promise(resolve => setTimeout(resolve, 3000));
    assert.equal(await sentNotice(/Nuevo acceso/), null, 'no notice for the first device');
    assert.equal(
      (await call('/api/auth/login', { email, password: passwords[0] }, { agent: windows })).status,
      200,
    );
    await expectSent(/Nuevo acceso a tu cuenta desde Firefox en Windows/, 'new device');

    // Second factor on, a backup code used to sign in, second factor off.
    const started = await call(
      '/api/account/totp',
      { action: 'start', password: passwords[0] },
      { cookie: session },
    );
    assert.equal(started.status, 200);
    const { secret, backupCodes } = await started.json();
    assert.equal(
      (
        await call(
          '/api/account/totp',
          { action: 'confirm', code: totp(secret) },
          { cookie: session },
        )
      ).status,
      200,
    );
    await expectSent(/Se activó la verificación en dos pasos/, 'totp on');
    const challenge = await call('/api/auth/login', { email, password: passwords[0] });
    assert.equal((await challenge.json()).step, 'totp');
    assert.equal(
      (await call('/api/auth/totp', { code: backupCodes[0] }, { cookie: cookiesOf(challenge) }))
        .status,
      200,
    );
    await expectSent(/Se usó un código de respaldo/, 'backup code');
    assert.equal(
      (
        await call(
          '/api/account/totp',
          { action: 'disable', password: passwords[0] },
          { cookie: session },
        )
      ).status,
      200,
    );
    await expectSent(/Se desactivó la verificación en dos pasos/, 'totp off');

    // Changing the password tells the owner and closes every session.
    assert.equal(
      (
        await call(
          '/api/account/password',
          { currentPassword: passwords[0], password: passwords[1], confirm: passwords[1] },
          { cookie: session },
        )
      ).status,
      200,
    );
    await expectSent(/Se cambió la contraseña/, 'password changed');

    // «No fui yo» is choosing a new password: the reset closes every open session.
    assert.equal((await call('/api/auth/login', { email, password: passwords[1] })).status, 200);
    const [{ sessions: before }] =
      await sql`SELECT count(*)::int AS sessions FROM auth_sessions WHERE account_id=${accountId}`;
    assert.ok(before > 0);
    const token = randomBytes(32).toString('hex');
    await sql`INSERT INTO auth_password_resets(token_hash,account_id,password_hash_at_issue,expires_at)
      SELECT ${createHash('sha256').update(token).digest('hex')},id,password_hash,now()+interval '30 minutes' FROM auth_accounts WHERE id=${accountId}`;
    assert.equal(
      (
        await call('/api/auth/reset-password', {
          token,
          password: passwords[2],
          confirm: passwords[2],
        })
      ).status,
      200,
    );
    const [{ sessions: after }] =
      await sql`SELECT count(*)::int AS sessions FROM auth_sessions WHERE account_id=${accountId}`;
    assert.equal(after, 0, 'the reset closed every session');
    await expectSent(/Se restableció la contraseña/, 'password reset');
    console.log('security notices: PASS');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE email=${email}`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
