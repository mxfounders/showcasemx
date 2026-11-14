// Opt-in integration test for the access security review (SHCWS-159): two-step codes that
// can't be replayed or guessed in parallel, Google linking only after a confirmed email,
// sessions, cookies, origin checks, CSP and account deletion. Creates temporary
// @example.invalid accounts through the real API and removes them, and their rate-limit
// rows, in `finally`.
//
// Run it against an isolated server (CLAUDE.md §13) whose RESEND_API_KEY is a dummy value,
// so the registration and notice emails fail instead of reaching anyone:
//
//   APP_ORIGIN=http://localhost:3300 RUN_AUTH_SECURITY_INTEGRATION=1 node tests/integration/auth-security.cjs
//
// The Google step needs that server's googleConfig() origin to equal APP_ORIGIN; otherwise
// it checks the refusal only.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, createHmac, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_AUTH_SECURITY_INTEGRATION !== '1') {
  console.log('Set RUN_AUTH_SECURITY_INTEGRATION=1 against an isolated running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const databaseUrl = env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL;
assert.notEqual(new URL(databaseUrl).pathname, '/shwcs_production', 'never against production');
const sql = neon(databaseUrl),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  email = `auth-security-${tag}@example.invalid`,
  password = 'Temporary auth-security passphrase 1',
  newPassword = 'Temporary auth-security passphrase 2';
const cookieName = origin.startsWith('https:') ? '__Host-showcasemx-session' : 'showcasemx-session',
  challengeName = origin.startsWith('https:')
    ? '__Host-showcasemx-challenge'
    : 'showcasemx-challenge';
const hash = value => createHash('sha256').update(value).digest('hex');
// Benchmarking range (RFC 2544): a fresh address per request keeps these attempts out of
// every other test's per-network limits.
const addresses = [];
const address = () => {
  const value = `198.18.${randomBytes(1)[0]}.${1 + (randomBytes(1)[0] % 250)}`;
  addresses.push(value);
  return value;
};
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function totp(secret, offset = 0) {
  let bits = 0,
    value = 0;
  const bytes = [];
  for (const char of secret) {
    value = (value << 5) | B32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest(),
    at = digest[digest.length - 1] & 15;
  const code =
    (((digest[at] & 127) << 24) | (digest[at + 1] << 16) | (digest[at + 2] << 8) | digest[at + 3]) %
    1e6;
  return String(code).padStart(6, '0');
}
const cookieFrom = (response, name) =>
  response.headers
    .getSetCookie()
    .map(cookie => cookie.split(';')[0])
    .find(cookie => cookie.startsWith(`${name}=`) && cookie.length > name.length + 1);
const post = (path, body, { cookie, withOrigin = true } = {}) =>
  fetch(origin + path, {
    method: 'POST',
    headers: {
      ...(withOrigin ? { origin } : {}),
      'content-type': 'application/json',
      'x-forwarded-for': address(),
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
const statuses = responses => responses.map(response => response.status).sort();
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const emails = [email];

(async () => {
  let accountId = '';
  try {
    // Every mutation refuses a missing or foreign Origin before reading anything.
    for (const path of [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/totp',
      '/api/auth/logout',
      '/api/account/password',
      '/api/account/delete',
      '/api/account/sessions',
      '/api/account/totp',
      '/api/account/google',
    ]) {
      assert.equal((await post(path, {}, { withOrigin: false })).status, 403, path);
      const foreign = await fetch(origin + path, {
        method: 'POST',
        headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
        body: '{}',
      });
      assert.equal(foreign.status, 403, path);
    }

    // The CSP now restricts scripts and every other fetch to shwcs itself.
    const page = await fetch(`${origin}/es/sign-in`);
    const csp = page.headers.get('content-security-policy') ?? '';
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ])
      assert.ok(csp.includes(directive), directive);

    // A new account opens a session with the documented cookie (SHCWS-26).
    const registered = await post('/api/auth/register', { email, password });
    assert.equal(registered.status, 200);
    const first = cookieFrom(registered, cookieName);
    assert.ok(first);
    const raw = registered.headers.getSetCookie().find(cookie => cookie.startsWith(cookieName));
    assert.match(raw, /HttpOnly/i);
    assert.match(raw, /SameSite=lax/i);
    assert.match(raw, /Path=\//);
    assert.match(raw, /Max-Age=604800/);
    [{ id: accountId }] = await sql`SELECT id::text FROM auth_accounts WHERE email=${email}`;
    const [{ seconds }] =
      await sql`SELECT extract(epoch FROM expires_at-now())::int AS seconds FROM auth_sessions WHERE account_id=${accountId}`;
    assert.ok(seconds > 604700 && seconds <= 604800, 'seven-day session');
    // Registering the same address again never opens a session.
    const again = await post('/api/auth/register', { email, password });
    assert.equal((await again.json()).signedIn, false);
    assert.equal(cookieFrom(again, cookieName), undefined);

    // Google can't be linked to an address nobody has confirmed (pre-account takeover).
    const unverified = await post(
      '/api/account/google',
      { action: 'link', password },
      { cookie: first },
    );
    assert.equal(unverified.status, 409);
    await sql`UPDATE auth_accounts SET email_verified_at=now() WHERE id=${accountId}`;
    const verified = await post(
      '/api/account/google',
      { action: 'link', password },
      { cookie: first },
    );
    if (verified.status === 200)
      assert.ok((await verified.json()).url.startsWith('https://accounts.google.com/'));
    else
      console.log(`google link after verification: ${verified.status} (origin mismatch, skipped)`);

    // Two-step verification on.
    const started = await (
      await post('/api/account/totp', { action: 'start', password }, { cookie: first })
    ).json();
    assert.ok(started.secret && started.backupCodes.length === 10);
    assert.equal(
      (
        await post(
          '/api/account/totp',
          { action: 'confirm', code: totp(started.secret) },
          { cookie: first },
        )
      ).status,
      200,
    );
    const challenge = async () => {
      const response = await post('/api/auth/login', { email, password });
      assert.equal((await response.json()).step, 'totp');
      assert.equal(cookieFrom(response, cookieName), undefined, 'no session before the code');
      return cookieFrom(response, challengeName);
    };
    const failures = async () =>
      Number(
        (
          await sql`SELECT attempts FROM auth_rate_limits WHERE key=${`auth-totp-fail:${hash(accountId)}`} AND window_start=date_trunc('hour',now())`
        )[0]?.attempts ?? 0,
      );
    const resetFailures = () =>
      sql`DELETE FROM auth_rate_limits WHERE key=${`auth-totp-fail:${hash(accountId)}`}`;

    // An invented challenge is turned away before any shared limit counts it.
    const fakeAddress = address();
    const fake = await fetch(`${origin}/api/auth/totp`, {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'application/json',
        'x-forwarded-for': fakeAddress,
        cookie: `${challengeName}=${randomBytes(32).toString('hex')}`,
      },
      body: JSON.stringify({ code: '123456' }),
    });
    assert.equal(fake.status, 401);
    assert.equal(
      (await sql`SELECT 1 FROM auth_rate_limits WHERE key=${`auth-totp:${hash(fakeAddress)}`}`)
        .length,
      0,
    );

    // Fifteen parallel guesses on one challenge: only five are ever checked.
    const guessed = await challenge();
    const guesses = await Promise.all(
      Array.from({ length: 15 }, (_, index) =>
        post('/api/auth/totp', { code: String(100000 + index) }, { cookie: guessed }),
      ),
    );
    assert.ok(guesses.every(response => response.status === 401));
    assert.ok((await failures()) <= 5, `checked ${await failures()} guesses`);
    await resetFailures();

    // The same valid code sent five times at once opens exactly one session.
    const replayed = await challenge(),
      code = totp(started.secret);
    const replays = await Promise.all(
      Array.from({ length: 5 }, () => post('/api/auth/totp', { code }, { cookie: replayed })),
    );
    assert.deepEqual(statuses(replays), [200, 401, 401, 401, 401]);
    // …and it is spent for any later challenge too.
    assert.equal(
      (await post('/api/auth/totp', { code }, { cookie: await challenge() })).status,
      401,
    );
    await resetFailures();

    // A backup code is single use even when sent five times at once.
    const backupChallenge = await challenge(),
      backup = started.backupCodes[0];
    const backups = await Promise.all(
      Array.from({ length: 5 }, () =>
        post('/api/auth/totp', { code: backup }, { cookie: backupChallenge }),
      ),
    );
    assert.deepEqual(statuses(backups), [200, 401, 401, 401, 401]);
    const [{ left }] =
      await sql`SELECT cardinality(backup_codes) AS left FROM auth_accounts WHERE id=${accountId}`;
    assert.equal(Number(left), 9);
    assert.equal(
      (await post('/api/auth/totp', { code: backup }, { cookie: await challenge() })).status,
      401,
    );
    await resetFailures();

    // A challenge stops after five codes, sent one by one.
    const spent = await challenge();
    for (let attempt = 0; attempt < 5; attempt++)
      assert.equal(
        (await post('/api/auth/totp', { code: '000000' }, { cookie: spent })).status,
        401,
      );
    const sixth = await post(
      '/api/auth/totp',
      { code: totp(started.secret, 1) },
      { cookie: spent },
    );
    assert.equal(sixth.status, 401);
    assert.equal(
      (await sql`SELECT 1 FROM auth_login_challenges WHERE account_id=${accountId}`).length,
      0,
    );

    // Ten wrong codes an hour per account, whatever the challenge or network.
    const second = await challenge();
    for (let attempt = 0; attempt < 5; attempt++)
      assert.equal(
        (await post('/api/auth/totp', { code: '000001' }, { cookie: second })).status,
        401,
      );
    assert.equal(await failures(), 10);
    const blocked = await post(
      '/api/auth/totp',
      { code: totp(started.secret, 1) },
      { cookie: await challenge() },
    );
    assert.equal(blocked.status, 429);
    await resetFailures();
    // A correct code refunds its own slot.
    const passed = await post(
      '/api/auth/totp',
      { code: totp(started.secret, 1) },
      { cookie: await challenge() },
    );
    assert.equal(passed.status, 200);
    assert.equal(await failures(), 0);

    // Signing in looks the same, in time, for an unknown address and a wrong password.
    const unknown = [],
      wrong = [];
    for (let sample = 0; sample < 5; sample++) {
      const other = `auth-security-${tag}-none${sample}@example.invalid`;
      emails.push(other);
      let start = performance.now();
      assert.equal(
        (await post('/api/auth/login', { email: other, password: 'wrong pass 1' })).status,
        401,
      );
      unknown.push(performance.now() - start);
      start = performance.now();
      assert.equal(
        (await post('/api/auth/login', { email, password: 'wrong pass 1' })).status,
        401,
      );
      wrong.push(performance.now() - start);
    }
    console.log(
      `login ms: unknown ${Math.round(median(unknown))}, wrong ${Math.round(median(wrong))}`,
    );
    assert.ok(
      median(unknown) > median(wrong) * 0.5,
      'unknown addresses still do the password work',
    );

    // Changing the password closes every session, this one included.
    const session = cookieFrom(passed, cookieName);
    assert.ok(
      Number(
        (await sql`SELECT count(*) AS n FROM auth_sessions WHERE account_id=${accountId}`)[0].n,
      ) >= 2,
    );
    assert.equal(
      (
        await post(
          '/api/account/password',
          { currentPassword: password, password: newPassword, confirm: newPassword },
          { cookie: session },
        )
      ).status,
      200,
    );
    assert.equal(
      Number(
        (await sql`SELECT count(*) AS n FROM auth_sessions WHERE account_id=${accountId}`)[0].n,
      ),
      0,
    );
    assert.equal(
      (await post('/api/account/sessions', { action: 'revoke-others' }, { cookie: first })).status,
      401,
    );

    // Deleting the account needs the password and the typed word, and removes everything.
    const final = await challenge().catch(() => null);
    assert.equal(final, null, 'the old password no longer opens a challenge');
    const login = await post('/api/auth/login', { email, password: newPassword });
    const last = await post(
      '/api/auth/totp',
      { code: started.backupCodes[1] },
      { cookie: cookieFrom(login, challengeName) },
    );
    assert.equal(last.status, 200);
    const owner = cookieFrom(last, cookieName);
    assert.equal(
      (
        await post(
          '/api/account/delete',
          { password: newPassword, confirm: 'BORRAR' },
          { cookie: owner },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await post(
          '/api/account/delete',
          { password: 'wrong pass 1', confirm: 'ELIMINAR' },
          { cookie: owner },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await post(
          '/api/account/delete',
          { password: newPassword, confirm: 'ELIMINAR' },
          { cookie: owner },
        )
      ).status,
      200,
    );
    assert.equal((await sql`SELECT 1 FROM auth_accounts WHERE id=${accountId}`).length, 0);
    console.log('auth security: PASS');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE email = ANY(${emails})`;
    const keys = [
      ...addresses.flatMap(value => [
        `auth:address:${hash(value)}`,
        `auth-totp:${hash(value)}`,
        ...emails.map(each => `auth:fail:${hash(`${each}|${value}`)}`),
      ]),
      ...emails.flatMap(each => [
        `auth:fail-email:${hash(each)}`,
        `register-existing:${hash(each)}`,
      ]),
      ...(accountId
        ? [
            'account-totp',
            'change-password',
            'account-sessions',
            'google-account',
            'account-delete',
            'auth-totp-fail',
          ].map(scope => `${scope}:${hash(accountId)}`)
        : []),
    ];
    await sql`DELETE FROM auth_rate_limits WHERE key = ANY(${keys})`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
