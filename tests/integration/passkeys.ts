// Opt-in integration test for passkeys (SHCWS-158) against a running app and the configured
// database, with a software authenticator (tests/helpers/webauthn.ts) instead of a browser:
// adding one needs the password (and a code once two-step verification is on), signing in
// with it opens a listed session without asking for a code, a challenge works once and
// expires, another origin fails, a suspended account is refused, removing one closes the
// sessions it opened and the password still works after the last one goes. The account lives
// at Resend's test inbox (delivered+…@resend.dev), so its security notices reach nobody.
// Needs AUTH_TOTP_KEY. Everything is removed in `finally`.
//
//   RUN_PASSKEY_INTEGRATION=1 APP_ORIGIN=http://localhost:3108 npx tsx tests/integration/passkeys.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { parse } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { assert as signWith, register, softwarePasskey } from '../helpers/webauthn';

if (process.env.RUN_PASSKEY_INTEGRATION !== '1') {
  console.log('Set RUN_PASSKEY_INTEGRATION=1 against a local running app (localhost).');
  process.exit(0);
}
const env = parse(fs.readFileSync(process.env.ENV_FILE ?? '.env.local'));
Object.assign(process.env, { AUTH_TOTP_KEY: env.AUTH_TOTP_KEY });
const sql = neon(String(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL)),
  origin = process.env.APP_ORIGIN || 'http://localhost:3108',
  tag = randomUUID().slice(0, 8),
  email = `delivered+shwcs-passkeys-${tag}@resend.dev`,
  password = `Frase de passkeys poco común ${tag}`,
  address = `192.0.2.${10 + (parseInt(tag, 16) % 200)}`,
  mac =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
  iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

type Result = { status: number; body: Record<string, unknown>; cookie: string };
const cookieOf = (response: Response) =>
  (response.headers.getSetCookie?.() ?? [])
    .map(cookie => cookie.split(';')[0])
    .filter(cookie => !cookie.endsWith('='))
    .join('; ');
async function call(
  path: string,
  body: unknown,
  { cookie = '', agent = mac } = {},
): Promise<Result> {
  const response = await fetch(origin + path, {
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
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
    cookie: cookieOf(response),
  };
}
type Options = { challenge: string; rp: { id: string }; user: { name: string } };

(async () => {
  const { generateTotp, currentStep } = await import('../../src/lib/auth/totp');
  let accountId = '';
  try {
    // An account with a confirmed email and a password session.
    assert.equal((await call('/api/auth/register', { email, password })).status, 200);
    const [account] = await sql`UPDATE auth_accounts SET email_verified_at=now()
      WHERE email=${email} RETURNING id::text`;
    accountId = String(account.id);
    const login = await call('/api/auth/login', { email, password });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    const owner = login.cookie;
    assert.ok(owner, 'password sign-in sets a session');
    const manage = (body: Record<string, unknown>) =>
      call('/api/account/passkeys', body, { cookie: owner });

    // Adding a passkey needs the password again, even with a session.
    assert.equal((await manage({ action: 'options' })).status, 400);
    assert.equal((await manage({ action: 'options', password: 'nope' })).status, 400);
    const laptop = softwarePasskey();
    const started = await manage({ action: 'options', password });
    assert.equal(started.status, 200, JSON.stringify(started.body));
    const options = started.body.options as Options;
    assert.equal(options.rp.id, 'localhost');
    assert.equal(options.user.name, email);
    // Only the hash of the challenge is stored, and finishing deletes it.
    const stored = (value: string) =>
      sql`SELECT 1 FROM auth_passkey_challenges WHERE challenge_hash=${value}`;
    assert.equal((await stored(options.challenge)).length, 0);
    assert.equal((await stored(sha256(options.challenge))).length, 1);
    const created = await manage({
      action: 'register',
      name: 'Laptop de prueba',
      credential: register(laptop, options, { origin }),
    });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const laptopId = String((created.body.passkey as { id: string }).id);
    assert.equal((await stored(sha256(options.challenge))).length, 0);

    // Sign in from another device: a listed session, no code, the passkey recorded.
    const signIn = async (
      key = laptop,
      extra: Partial<Parameters<typeof signWith>[2]> = {},
      agent = iphone,
    ) => {
      const asked = await call('/api/auth/passkey', { action: 'options' }, { agent });
      assert.equal(asked.status, 200, JSON.stringify(asked.body));
      const challenge = String((asked.body.options as Options).challenge);
      const credential = signWith(key, challenge, { origin, userHandle: accountId, ...extra });
      const result = await call('/api/auth/passkey', { action: 'verify', credential }, { agent });
      return { challenge, credential, result };
    };
    const first = await signIn();
    assert.equal(first.result.status, 200, JSON.stringify(first.result.body));
    const phone = first.result.cookie;
    assert.ok(phone.includes('session'));
    const [session] = await sql`SELECT user_agent, passkey_id::text FROM auth_sessions
      WHERE account_id=${accountId} AND passkey_id IS NOT NULL`;
    assert.equal(session.passkey_id, laptopId);
    assert.match(String(session.user_agent), /iPhone/);
    const security = await fetch(`${origin}/es/account/settings/security`, {
      headers: { cookie: phone },
    });
    assert.equal(security.status, 200);
    const page = await security.text();
    assert.match(page, /Laptop de prueba/);
    assert.match(page, /Safari en iOS/);

    // The same signed response again, an expired challenge, another origin: no session.
    const replay = await call('/api/auth/passkey', {
      action: 'verify',
      credential: first.credential,
    });
    assert.equal(replay.status, 401);
    const asked = await call('/api/auth/passkey', { action: 'options' });
    const late = String((asked.body.options as Options).challenge);
    await sql`UPDATE auth_passkey_challenges SET expires_at=now()-interval '1 second'
      WHERE challenge_hash=${sha256(late)}`;
    const expired = await call('/api/auth/passkey', {
      action: 'verify',
      credential: signWith(laptop, late, { origin }),
    });
    assert.equal(expired.status, 401);
    assert.equal(
      (await signIn(laptop, { origin: 'https://shwcs-login.example' })).result.status,
      401,
    );

    // Two-step verification on: the password alone stops at the code, a passkey doesn't.
    const enrol = await call('/api/account/totp', { action: 'start', password }, { cookie: owner });
    assert.equal(enrol.status, 200, JSON.stringify(enrol.body));
    const secret = String(enrol.body.secret);
    const backup = (enrol.body.backupCodes as string[])[0];
    const confirmed = await call(
      '/api/account/totp',
      { action: 'confirm', code: generateTotp(secret, currentStep()) },
      { cookie: owner },
    );
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    const stepped = await call('/api/auth/login', { email, password });
    assert.equal(stepped.body.step, 'totp');
    assert.equal(stepped.cookie.includes('session'), false);
    const strong = await signIn();
    assert.equal(strong.result.status, 200, JSON.stringify(strong.result.body));
    assert.equal(strong.result.body.step, undefined);
    assert.ok(strong.result.cookie.includes('session'));

    // A second passkey now also needs a code.
    const tablet = softwarePasskey({ synced: false, counter: 3 });
    assert.equal((await manage({ action: 'options', password })).status, 400);
    const second = await manage({ action: 'options', password, code: backup });
    assert.equal(second.status, 200, JSON.stringify(second.body));
    const tabletCreated = await manage({
      action: 'register',
      credential: register(tablet, second.body.options as Options, { origin }),
    });
    assert.equal(tabletCreated.status, 200, JSON.stringify(tabletCreated.body));
    assert.match(
      String((tabletCreated.body.passkey as { name: string }).name),
      /Passkey · Chrome en macOS/,
    );
    // A hardware-style counter that goes backwards is refused; forwards works.
    assert.equal((await signIn(tablet, { counter: 3 })).result.status, 401);
    assert.equal((await signIn(tablet)).result.status, 200);
    const [counted] = await sql`SELECT counter FROM auth_passkeys WHERE credential_id=${tablet.id}`;
    assert.equal(Number(counted.counter), 4);

    // A suspended account can't sign in with its passkey.
    await sql`UPDATE auth_accounts SET suspended_at=now() WHERE id=${accountId}`;
    assert.equal((await signIn()).result.status, 401);
    await sql`UPDATE auth_accounts SET suspended_at=NULL WHERE id=${accountId}`;

    // Removing the laptop passkey closes the sessions it opened, and it can't sign in again.
    assert.equal((await manage({ action: 'delete', id: laptopId, password: 'nope' })).status, 400);
    const removed = await manage({ action: 'delete', id: laptopId, password });
    assert.equal(removed.status, 200, JSON.stringify(removed.body));
    assert.deepEqual(
      (removed.body.signal as { allAcceptedCredentialIDs: string[] }).allAcceptedCredentialIDs,
      [tablet.id],
    );
    assert.equal((await sql`SELECT 1 FROM auth_sessions WHERE passkey_id=${laptopId}`).length, 0);
    const afterward = await fetch(`${origin}/es/account/settings/security`, {
      headers: { cookie: phone },
      redirect: 'manual',
    });
    assert.notEqual(afterward.status, 200, 'the session opened with the removed passkey is closed');
    const gone = await signIn();
    assert.equal(gone.result.status, 401);
    assert.equal(gone.result.body.unknownCredential, true);

    // The export lists passkeys by name, without keys or ids.
    const exported = await fetch(`${origin}/api/account/export`, {
      headers: { cookie: owner, 'x-forwarded-for': address },
    });
    const data = (await exported.json()) as { security: { passkeys: Record<string, unknown>[] } };
    assert.equal(data.security.passkeys.length, 1);
    assert.deepEqual(Object.keys(data.security.passkeys[0]).sort(), [
      'created_at',
      'last_used_at',
      'name',
      'synced',
    ]);

    // The last passkey can go too: the password (with its code) is still the way in.
    const tabletId = String((tabletCreated.body.passkey as { id: string }).id);
    assert.equal((await manage({ action: 'delete', id: tabletId, password })).status, 200);
    assert.equal((await call('/api/auth/login', { email, password })).body.step, 'totp');

    // Each change left a security notice for the owner (written after the response).
    let notices: Record<string, unknown>[] = [];
    for (let tries = 0; tries < 20 && notices.length < 4; tries++) {
      if (tries) await new Promise(resolve => setTimeout(resolve, 500));
      notices = await sql`SELECT source_key FROM account_notifications
        WHERE owner_id=${accountId} AND category='security' AND source_key LIKE 'security:passkey-%'`;
    }
    const count = (prefix: string) =>
      notices.filter(row => String(row.source_key).startsWith(prefix)).length;
    assert.equal(count('security:passkey-added:'), 2);
    assert.equal(count('security:passkey-removed:'), 2);
    console.log('Passkeys integration: all checks passed.');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE email=${email}`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
