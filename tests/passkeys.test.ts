import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  clientChallenge,
  finishRegistration,
  maxPasskeysPerAccount,
  passkeyName,
  registrationOptions,
  relyingParty,
  signInOptions,
  signInWithPasskey,
  validPasskeyName,
  type PasskeyStore,
  type StoredPasskey,
} from '../src/lib/auth/passkeys';
import { hashToken } from '../src/lib/auth/password';
import { securityTitle } from '../src/lib/auth/security-notices';
import { securityNotice } from '../src/lib/notifications/account-emails';
import { settings as esSettings } from '../src/i18n/dictionaries/es/settings';
import { POST as signInPost } from '../src/app/api/auth/passkey/route';
import { POST as accountPost } from '../src/app/api/account/passkeys/route';
import { assert as signWith, register, softwarePasskey } from './helpers/webauthn';

const party = { rpID: 'localhost', origin: 'http://localhost:3108' };
const device = esSettings.security.device;

/**
 * The database's rules, in memory: a challenge is deleted when claimed and only returned while
 * unexpired; a session opens only if the counter still holds what was checked and the account
 * isn't suspended. `now` is the clock the store compares expiries against.
 */
function memoryStore() {
  const challenges = new Map<
    string,
    { purpose: string; rpID: string; accountId?: string; sessionHash?: string; expiresAt: number }
  >();
  const passkeys = new Map<string, StoredPasskey & { rpID: string; name: string }>();
  const sessions: { tokenHash: string; accountId: string; passkeyId: string }[] = [];
  const suspended = new Set<string>();
  const clock = { now: Date.now() };
  const store: PasskeyStore = {
    async saveChallenge(input) {
      challenges.set(input.challengeHash, { ...input, expiresAt: clock.now + 5 * 60 * 1000 });
    },
    async claimChallenge(hash, purpose) {
      const row = challenges.get(hash);
      if (!row || row.purpose !== purpose) return null;
      challenges.delete(hash);
      if (row.expiresAt <= clock.now) return null;
      return {
        rpID: row.rpID,
        accountId: row.accountId ?? null,
        sessionHash: row.sessionHash ?? null,
      };
    },
    async prepareRegistration(accountId, rpID) {
      return [...passkeys.values()]
        .filter(item => item.accountId === accountId && item.rpID === rpID)
        .map(item => ({ id: item.credentialId, transports: item.transports }));
    },
    async insertPasskey(input) {
      if ([...passkeys.values()].some(item => item.credentialId === input.credentialId))
        return 'duplicate';
      if (
        suspended.has(input.accountId) ||
        [...passkeys.values()].filter(item => item.accountId === input.accountId).length >=
          maxPasskeysPerAccount
      )
        return 'limit';
      const id = randomUUID();
      passkeys.set(id, { ...input, id });
      return { id, name: input.name };
    },
    async findPasskey(credentialId, rpID) {
      const found = [...passkeys.values()].find(
        item => item.credentialId === credentialId && item.rpID === rpID,
      );
      return found ? { ...found } : null;
    },
    async openSession(input) {
      const current = passkeys.get(input.passkey.id);
      if (!current || current.counter !== input.passkey.counter) return false;
      current.counter = input.newCounter;
      if (suspended.has(current.accountId)) return false;
      sessions.push({
        tokenHash: input.tokenHash,
        accountId: current.accountId,
        passkeyId: current.id,
      });
      return true;
    },
  };
  return { store, challenges, passkeys, sessions, suspended, clock };
}

async function enrolled(options: { synced?: boolean; counter?: number } = {}) {
  const memory = memoryStore();
  const accountId = randomUUID();
  const sessionHash = hashToken('session');
  const key = softwarePasskey(options);
  const started = await registrationOptions(
    { party, account: { id: accountId, email: 'a@example.invalid', name: 'Ana' }, sessionHash },
    memory.store,
  );
  assert.equal(started.status, 'ok');
  if (started.status !== 'ok') throw new Error('unreachable');
  const finished = await finishRegistration(
    {
      party,
      accountId,
      sessionHash,
      credential: register(key, started.options, { origin: party.origin }),
      name: () => 'Mi Mac',
    },
    memory.store,
  );
  assert.equal(finished.status, 'ok');
  return { ...memory, accountId, sessionHash, key };
}

const signIn = (store: PasskeyStore, credential: unknown) =>
  signInWithPasskey(
    { party, credential, previousSessionToken: '', userAgent: 'Mozilla/5.0 Chrome/130.0' },
    store,
  );

test('the relying party is the canonical origin in production and localhost in development', () => {
  const dev = { NODE_ENV: 'development' };
  assert.deepEqual(relyingParty('http://localhost:3108', dev), party);
  // Browsers never accept an IP address as an rpID.
  assert.equal(relyingParty('http://127.0.0.1:3108', dev), null);
  const prod = { NODE_ENV: 'production', AUTH_APP_ORIGIN: 'https://shwcs.site' };
  assert.deepEqual(relyingParty('https://shwcs.site', prod), {
    rpID: 'shwcs.site',
    origin: 'https://shwcs.site',
  });
  // A preview deployment, another host, localhost in production or a malformed setting: none.
  assert.equal(relyingParty('https://shwcs-git-x.vercel.app', prod), null);
  assert.equal(relyingParty('http://localhost:3000', prod), null);
  assert.equal(relyingParty('https://shwcs.site', { ...prod, AUTH_APP_ORIGIN: undefined }), null);
  assert.equal(
    relyingParty('https://shwcs.site', { ...prod, AUTH_APP_ORIGIN: 'http://shwcs.site' }),
    null,
  );
});

test('a registered passkey signs in once per challenge and stores only a hash of it', async () => {
  const { store, challenges, sessions, key, accountId } = await enrolled();
  const options = await signInOptions(party, store);
  assert.equal(challenges.has(options.challenge), false);
  assert.equal(challenges.has(hashToken(options.challenge)), true);
  const response = signWith(key, options.challenge, {
    origin: party.origin,
    userHandle: accountId,
  });
  const first = await signIn(store, response);
  assert.equal(first.status, 'ok');
  assert.equal(first.status === 'ok' && first.accountId, accountId);
  assert.equal(sessions.length, 1);
  // The same signed response again: its challenge is gone.
  assert.equal((await signIn(store, response)).status, 'expired');
  assert.equal(sessions.length, 1);
});

test('an expired challenge is refused and spent', async () => {
  const { store, challenges, clock, key } = await enrolled();
  const options = await signInOptions(party, store);
  clock.now += 5 * 60 * 1000 + 1;
  const outcome = await signIn(store, signWith(key, options.challenge, { origin: party.origin }));
  assert.equal(outcome.status, 'expired');
  assert.equal(challenges.size, 0);
});

test('a response signed for another origin or host fails, and its challenge is still spent', async () => {
  const { store, key, sessions } = await enrolled();
  const phishing = await signInOptions(party, store);
  const fromPhishing = signWith(key, phishing.challenge, { origin: 'https://shwcs-login.example' });
  assert.equal((await signIn(store, fromPhishing)).status, 'failed');
  // Retrying the stolen challenge with the right origin finds nothing left to claim.
  const retry = signWith(key, phishing.challenge, { origin: party.origin });
  assert.equal((await signIn(store, retry)).status, 'expired');
  const otherHost = await signInOptions(party, store);
  assert.equal(
    (
      await signIn(
        store,
        signWith(key, otherHost.challenge, { origin: party.origin, rpID: 'evil.example' }),
      )
    ).status,
    'failed',
  );
  assert.equal(sessions.length, 0);
});

test('a hardware key counter must move forward; synced passkeys keep reporting zero', async () => {
  const hardware = await enrolled({ synced: false, counter: 5 });
  const stale = await signInOptions(party, hardware.store);
  // A cloned key replays the counter it last reported.
  const replayed = signWith(hardware.key, stale.challenge, { origin: party.origin, counter: 5 });
  assert.equal((await signIn(hardware.store, replayed)).status, 'failed');
  const fresh = await signInOptions(party, hardware.store);
  assert.equal(
    (
      await signIn(
        hardware.store,
        signWith(hardware.key, fresh.challenge, { origin: party.origin }),
      )
    ).status,
    'ok',
  );
  assert.equal([...hardware.passkeys.values()][0].counter, 6);

  const synced = await enrolled({ synced: true });
  for (let round = 0; round < 2; round++) {
    const options = await signInOptions(party, synced.store);
    assert.equal(
      (
        await signIn(
          synced.store,
          signWith(synced.key, options.challenge, { origin: party.origin }),
        )
      ).status,
      'ok',
    );
  }
  assert.equal([...synced.passkeys.values()][0].counter, 0);
});

test('without user verification, with another account as user, or a removed passkey, no session', async () => {
  const { store, key, passkeys, suspended, accountId, sessions } = await enrolled();
  const noPin = await signInOptions(party, store);
  assert.equal(
    (await signIn(store, signWith(key, noPin.challenge, { origin: party.origin, verified: false })))
      .status,
    'failed',
  );
  const impostor = await signInOptions(party, store);
  assert.equal(
    (
      await signIn(
        store,
        signWith(key, impostor.challenge, { origin: party.origin, userHandle: randomUUID() }),
      )
    ).status,
    'failed',
  );
  suspended.add(accountId);
  const blocked = await signInOptions(party, store);
  assert.equal(
    (await signIn(store, signWith(key, blocked.challenge, { origin: party.origin }))).status,
    'refused',
  );
  passkeys.clear();
  const removed = await signInOptions(party, store);
  assert.equal(
    (await signIn(store, signWith(key, removed.challenge, { origin: party.origin }))).status,
    'unknown',
  );
  assert.equal(sessions.length, 0);
});

test('a registration challenge belongs to the account and session that asked for it', async () => {
  const memory = memoryStore();
  const accountId = randomUUID();
  const key = softwarePasskey();
  const ask = (sessionHash: string) =>
    registrationOptions(
      { party, account: { id: accountId, email: 'a@example.invalid', name: null }, sessionHash },
      memory.store,
    );
  const started = await ask(hashToken('tab-a'));
  if (started.status !== 'ok') throw new Error('unreachable');
  const response = register(key, started.options, { origin: party.origin });
  const finish = (sessionHash: string, credential: unknown = response) =>
    finishRegistration(
      { party, accountId, sessionHash, credential, name: () => 'x' },
      memory.store,
    );
  // Another session (a stolen cookie that never re-entered the password) can't finish it.
  assert.equal((await finish(hashToken('tab-b'))).status, 'expired');
  // Nor can the right one afterwards: the try was spent.
  assert.equal((await finish(hashToken('tab-a'))).status, 'expired');
  const again = await ask(hashToken('tab-a'));
  if (again.status !== 'ok') throw new Error('unreachable');
  const unverified = register(key, again.options, { origin: party.origin, verified: false });
  assert.equal((await finish(hashToken('tab-a'), unverified)).status, 'failed');
  const third = await ask(hashToken('tab-a'));
  if (third.status !== 'ok') throw new Error('unreachable');
  assert.equal(
    (await finish(hashToken('tab-a'), register(key, third.options, { origin: party.origin })))
      .status,
    'ok',
  );
  // The same device can't be added twice.
  const fourth = await ask(hashToken('tab-a'));
  if (fourth.status !== 'ok') throw new Error('unreachable');
  assert.deepEqual(
    fourth.options.excludeCredentials?.map(item => item.id),
    [key.id],
  );
  assert.equal(
    (await finish(hashToken('tab-a'), register(key, fourth.options, { origin: party.origin })))
      .status,
    'duplicate',
  );
});

test('client data, names and the security emails', () => {
  assert.equal(clientChallenge(null), null);
  assert.equal(clientChallenge({ response: { clientDataJSON: '%%%' } }), null);
  const data = Buffer.from(JSON.stringify({ challenge: 'abcdefghijklmnopqrstuv' })).toString(
    'base64url',
  );
  assert.equal(clientChallenge({ response: { clientDataJSON: data } }), 'abcdefghijklmnopqrstuv');

  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130.0';
  const base = { aaguid: null, userAgent: mac, locale: 'es' as const, device };
  assert.equal(passkeyName({ ...base, typed: '  Mi   iPhone ' }), 'Mi iPhone');
  assert.equal(passkeyName({ ...base, typed: '' }), 'Passkey · Chrome en macOS');
  assert.equal(
    passkeyName({ ...base, typed: '', aaguid: 'FBFC3007-154E-4ECC-8C0B-6E020557D7BD' }),
    'Llavero de iCloud',
  );
  assert.equal(
    passkeyName({
      ...base,
      typed: undefined,
      locale: 'en',
      aaguid: 'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4',
    }),
    'Google Password Manager',
  );
  assert.equal(validPasskeyName(''), true);
  assert.equal(validPasskeyName('x'.repeat(61)), false);
  assert.equal(validPasskeyName(42), false);

  assert.match(
    securityTitle('passkey-added', 'Chrome en macOS', 'Mi Mac'),
    /passkey.*«Mi Mac».*Chrome en macOS/,
  );
  assert.ok(securityTitle('passkey-removed', 'x', 'y'.repeat(300)).length <= 180);
  // A new passkey survives a password change, so its email points to removing it instead.
  const added = securityNotice('Se añadió una passkey', '2026-11-17T12:00:00Z', 'passkey-added');
  assert.match(added.text, /quita esa passkey/);
  assert.equal(added.button, 'Revisar mis passkeys');
  assert.equal(securityNotice('x', '2026-11-17T12:00:00Z').button, 'No fui yo');
});

const post = (path: string, body: unknown, origin: string) =>
  new NextRequest(`https://shwcs.example${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('passkey routes refuse foreign origins, and account changes need a session', async () => {
  assert.equal(
    (await signInPost(post('/api/auth/passkey', { action: 'options' }, 'https://evil.example')))
      .status,
    403,
  );
  assert.equal(
    (
      await accountPost(
        post('/api/account/passkeys', { action: 'options' }, 'https://evil.example'),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await accountPost(
        post('/api/account/passkeys', { action: 'options' }, 'https://shwcs.example'),
      )
    ).status,
    401,
  );
});
