import { randomBytes } from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransport,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { hashToken } from './password';
import { authSql } from './security';
import { deviceLabel, sessionSeconds, type DeviceLabels } from './session';

/**
 * Passkeys (WebAuthn) for product accounts, SHCWS-158. Built on the same ideas as Flouvia's
 * own sign-in (features/auth/passkey.service.ts there), adapted to shwcs: the password stays,
 * a passkey is one more way in, and it counts as a strong sign-in (no TOTP on top), because
 * every ceremony requires user verification (fingerprint, face or device PIN) on a key that
 * never leaves the device.
 *
 * Challenges are single-use and short-lived, stored only as the SHA-256 of the challenge. The
 * row is deleted before the signature is checked, so each challenge gets one try, whatever
 * the outcome.
 */

export const passkeyChallengeSeconds = 5 * 60;
/** How long the browser keeps its prompt open. Shorter than the challenge, so it never outlives it. */
const ceremonyMs = 2 * 60 * 1000;
/** A generous ceiling: one per device and password manager, with room to spare. */
export const maxPasskeysPerAccount = 20;
const rpName = 'shwcs';

export type RelyingParty = { rpID: string; origin: string };
type Env = Record<string, string | undefined>;

/** AUTH_APP_ORIGIN when it is a bare https origin (same rules as recovery links), else null. */
export function canonicalAppOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Who the passkeys belong to on this request, or null where there are none. In production the
 * canonical origin (AUTH_APP_ORIGIN, e.g. https://shwcs.site → rpID `shwcs.site`), and only
 * when the request comes from it: a preview deployment or another host has no ceremonies. In
 * development, `localhost` on whatever port the dev server uses (browsers allow WebAuthn
 * over plain http there). An IP address is never an rpID.
 */
export function relyingParty(requestOrigin: string, env: Env = process.env): RelyingParty | null {
  let url: URL;
  try {
    url = new URL(requestOrigin);
  } catch {
    return null;
  }
  if (env.NODE_ENV !== 'production')
    return url.hostname === 'localhost' ? { rpID: 'localhost', origin: url.origin } : null;
  const configured = canonicalAppOrigin(env.AUTH_APP_ORIGIN);
  if (!configured || configured.origin !== url.origin) return null;
  return { rpID: configured.hostname, origin: configured.origin };
}

/** The origin a Server Component is rendered for, from its request headers. */
export function originFromHeaders(headers: Headers, env: Env = process.env): string {
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? '';
  const proto =
    headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${proto}://${host}`;
}

/**
 * The WebAuthn user handle: the 16 bytes of the account's UUID. No email or name, so a password
 * manager never learns more than the email it already shows as the account name.
 */
export function userHandle(accountId: string) {
  return Uint8Array.from(Buffer.from(accountId.replaceAll('-', ''), 'hex'));
}

const base64url = /^[A-Za-z0-9_-]+$/;

/** The challenge the browser signed, read from the response's clientDataJSON, or null. */
export function clientChallenge(credential: unknown): string | null {
  const data = (credential as { response?: { clientDataJSON?: unknown } } | null)?.response
    ?.clientDataJSON;
  if (typeof data !== 'string' || data.length > 4096 || !base64url.test(data)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    const challenge = (parsed as { challenge?: unknown } | null)?.challenge;
    return typeof challenge === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(challenge)
      ? challenge
      : null;
  } catch {
    return null;
  }
}

/** The credential id the browser reports, when it has a plausible shape. */
export function credentialIdOf(credential: unknown): string | null {
  const id = (credential as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id.length >= 16 && id.length <= 1366 && base64url.test(id)
    ? id
    : null;
}

// The most common passkey providers by AAGUID (FIDO Alliance's public registry). The name
// is only a starting point the person can change; an unknown provider gets the device label.
const providers: Record<string, { es: string; en: string }> = {
  'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': { es: 'Llavero de iCloud', en: 'iCloud Keychain' },
  'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': { es: 'Llavero de iCloud', en: 'iCloud Keychain' },
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': {
    es: 'Gestor de contraseñas de Google',
    en: 'Google Password Manager',
  },
  'adce0002-35bc-c60a-648b-0b25f1f05503': { es: 'Chrome en Mac', en: 'Chrome on Mac' },
  '08987058-cadc-4b81-b6e1-30de50dcbe96': { es: 'Windows Hello', en: 'Windows Hello' },
  '9ddd1817-af5a-4672-a2b9-3e3dd95000a9': { es: 'Windows Hello', en: 'Windows Hello' },
  '6028b017-b1d4-4c02-b4b3-afcdafc96bb2': { es: 'Windows Hello', en: 'Windows Hello' },
  'bada5566-a7aa-401f-bd96-45619a55120d': { es: '1Password', en: '1Password' },
  'd548826e-79b4-db40-a3d8-11116f7e8349': { es: 'Bitwarden', en: 'Bitwarden' },
  '531126d6-e717-415c-9320-3d9aa6981239': { es: 'Dashlane', en: 'Dashlane' },
  '53414d53-554e-4700-0000-000000000000': { es: 'Samsung Pass', en: 'Samsung Pass' },
};

/** A passkey's name: what the person typed, else its provider, else the device it was made on. */
export function passkeyName(input: {
  typed: unknown;
  aaguid: string | null | undefined;
  userAgent: string | null;
  locale: 'es' | 'en';
  device: DeviceLabels;
}): string {
  const typed = typeof input.typed === 'string' ? input.typed.replace(/\s+/g, ' ').trim() : '';
  if (typed) return typed.slice(0, 60);
  const provider = input.aaguid ? providers[input.aaguid.toLowerCase()] : undefined;
  if (provider) return provider[input.locale];
  return `Passkey · ${deviceLabel(input.userAgent, input.device)}`.slice(0, 60);
}

/** A name the person typed is valid when blank (a default is chosen) or 1–60 characters. */
export function validPasskeyName(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  return typeof value === 'string' && value.replace(/\s+/g, ' ').trim().length <= 60;
}

async function storeChallenge(input: {
  challenge: string;
  purpose: 'register' | 'sign_in';
  rpID: string;
  accountId?: string;
  sessionHash?: string;
}) {
  const sql = authSql();
  await sql`INSERT INTO auth_passkey_challenges (challenge_hash, purpose, rp_id, account_id, session_hash, expires_at)
    VALUES (${hashToken(input.challenge)}, ${input.purpose}, ${input.rpID}, ${input.accountId ?? null},
      ${input.sessionHash ?? null}, now() + ${passkeyChallengeSeconds} * interval '1 second')`;
}

type ClaimedChallenge = {
  rpID: string;
  accountId: string | null;
  sessionHash: string | null;
};

/**
 * Deletes the challenge's row and returns it while it is still valid. Deleting first is what
 * makes it single-use: a second request with the same signed response finds nothing, and a
 * failed signature has spent its try. An expired row is deleted all the same.
 */
export async function claimChallenge(
  challenge: string,
  purpose: 'register' | 'sign_in',
): Promise<ClaimedChallenge | null> {
  const sql = authSql();
  const [row] = await sql`DELETE FROM auth_passkey_challenges
    WHERE challenge_hash = ${hashToken(challenge)} AND purpose = ${purpose}
    RETURNING rp_id, account_id::text, session_hash, expires_at > now() AS live`;
  if (!row?.live) return null;
  return {
    rpID: String(row.rp_id),
    accountId: row.account_id == null ? null : String(row.account_id),
    sessionHash: row.session_hash == null ? null : String(row.session_hash),
  };
}

// ── Registration (Ajustes › Seguridad) ─────────────────────────────────

/**
 * Options to create a passkey for a signed-in account whose password (and second factor, when
 * it is on) the caller has just checked. The challenge is tied to the account and the session.
 */
export async function registrationOptions(input: {
  party: RelyingParty;
  account: { id: string; email: string; name: string | null };
  sessionHash: string;
}) {
  const sql = authSql();
  const existing =
    await sql`SELECT credential_id, transports FROM auth_passkeys WHERE account_id = ${input.account.id} AND rp_id = ${input.party.rpID}`;
  if (existing.length >= maxPasskeysPerAccount) return { status: 'limit' as const };
  const options = await generateRegistrationOptions({
    rpName,
    rpID: input.party.rpID,
    userName: input.account.email,
    userDisplayName: input.account.name?.trim() || input.account.email,
    userID: userHandle(input.account.id),
    attestationType: 'none',
    // The browser refuses to make a second passkey on a device that already has one here.
    excludeCredentials: existing.map(row => ({
      id: String(row.credential_id),
      transports: (row.transports as AuthenticatorTransport[] | null) ?? [],
    })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    timeout: ceremonyMs,
  });
  // One open registration per account: an earlier one (another tab) stops working.
  await sql`DELETE FROM auth_passkey_challenges WHERE expires_at <= now() OR (purpose = 'register' AND account_id = ${input.account.id})`;
  await storeChallenge({
    challenge: options.challenge,
    purpose: 'register',
    rpID: input.party.rpID,
    accountId: input.account.id,
    sessionHash: input.sessionHash,
  });
  return { status: 'ok' as const, options };
}

export type RegistrationOutcome =
  | { status: 'ok'; id: string; name: string }
  | { status: 'expired' | 'failed' | 'duplicate' | 'limit' };

/**
 * Checks the browser's new passkey against its challenge (same account, same session, same
 * host) and stores its public key. Attestation is not requested: shwcs trusts the person
 * signed in with their password, not a particular authenticator model.
 */
export async function finishRegistration(input: {
  party: RelyingParty;
  accountId: string;
  sessionHash: string;
  credential: unknown;
  name: (aaguid: string | null) => string;
}): Promise<RegistrationOutcome> {
  const challenge = clientChallenge(input.credential);
  if (!challenge || !credentialIdOf(input.credential)) return { status: 'failed' };
  const claimed = await claimChallenge(challenge, 'register');
  if (
    !claimed ||
    claimed.rpID !== input.party.rpID ||
    claimed.accountId !== input.accountId ||
    claimed.sessionHash !== input.sessionHash
  )
    return { status: 'expired' };
  const result = await verifyRegistrationResponse({
    response: input.credential as RegistrationResponseJSON,
    expectedChallenge: challenge,
    expectedOrigin: input.party.origin,
    expectedRPID: input.party.rpID,
    requireUserVerification: true,
  }).catch(() => null);
  if (!result?.verified) return { status: 'failed' };
  const { credential, credentialDeviceType, credentialBackedUp, aaguid } = result.registrationInfo;
  const provider = aaguid && aaguid !== '00000000-0000-0000-0000-000000000000' ? aaguid : null;
  const name = input.name(provider);
  const sql = authSql();
  // The account row is locked first, so two registrations at once can't pass the ceiling.
  const [, inserted, existing] = await sql.transaction([
    sql`SELECT id FROM auth_accounts WHERE id = ${input.accountId} FOR UPDATE`,
    sql`INSERT INTO auth_passkeys (account_id, rp_id, credential_id, public_key, counter, transports, device_type, backed_up, aaguid, name)
      SELECT id, ${input.party.rpID}, ${credential.id}, ${Buffer.from(credential.publicKey).toString('base64url')},
        ${credential.counter}, ${credential.transports ?? []}, ${credentialDeviceType}, ${credentialBackedUp}, ${provider}, ${name}
      FROM auth_accounts WHERE id = ${input.accountId} AND suspended_at IS NULL
        AND (SELECT count(*) FROM auth_passkeys WHERE account_id = ${input.accountId}) < ${maxPasskeysPerAccount}
      ON CONFLICT (credential_id) DO NOTHING
      RETURNING id::text, name`,
    sql`SELECT 1 FROM auth_passkeys WHERE credential_id = ${credential.id}`,
  ]);
  if (inserted[0])
    return { status: 'ok', id: String(inserted[0].id), name: String(inserted[0].name) };
  return existing.length ? { status: 'duplicate' } : { status: 'limit' };
}

// ── Sign-in (/sign-in) ─────────────────────────────────────────────────

/** Options for a discoverable passkey: no email typed, the browser offers this site's passkeys. */
export async function signInOptions(party: RelyingParty) {
  const options = await generateAuthenticationOptions({
    rpID: party.rpID,
    userVerification: 'required',
    timeout: ceremonyMs,
  });
  await storeChallenge({ challenge: options.challenge, purpose: 'sign_in', rpID: party.rpID });
  return options;
}

export type StoredPasskey = {
  id: string;
  accountId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
};

/**
 * Verifies one signed assertion against a stored passkey, without touching the database. The
 * library checks the challenge, origin, rpID hash, user presence and verification, the
 * signature and that the counter moved forward; on top, a user handle (when the browser sends
 * one) must name the passkey's own account. Null when anything is off.
 */
export async function verifyAssertion(input: {
  party: RelyingParty;
  credential: AuthenticationResponseJSON;
  challenge: string;
  stored: StoredPasskey;
}): Promise<{ newCounter: number; backedUp: boolean } | null> {
  const handle = input.credential.response?.userHandle;
  if (
    handle &&
    Buffer.from(handle, 'base64url').toString('hex') !== input.stored.accountId.replaceAll('-', '')
  )
    return null;
  const result = await verifyAuthenticationResponse({
    response: input.credential,
    expectedChallenge: input.challenge,
    expectedOrigin: input.party.origin,
    expectedRPID: input.party.rpID,
    credential: {
      id: input.stored.credentialId,
      publicKey: Uint8Array.from(Buffer.from(input.stored.publicKey, 'base64url')),
      counter: input.stored.counter,
      transports: input.stored.transports as AuthenticatorTransport[],
    },
    requireUserVerification: true,
  }).catch(() => null);
  if (!result?.verified) return null;
  return {
    newCounter: result.authenticationInfo.newCounter,
    backedUp: result.authenticationInfo.credentialBackedUp,
  };
}

export type SignInOutcome =
  | { status: 'ok'; accountId: string; passkeyId: string; token: string }
  | { status: 'expired' | 'unknown' | 'failed' | 'refused' };

/**
 * Signs in with a passkey: claims the challenge, finds the passkey for this host, checks the
 * signature, then in one statement records the new counter (compare-and-set against the value
 * that was checked) and opens the same session a password sign-in does, for a non-suspended
 * account only. `refused` covers a suspended account or a counter that moved in between; the
 * caller answers it like a failed signature.
 */
export async function signInWithPasskey(input: {
  party: RelyingParty;
  credential: unknown;
  previousSessionToken: string;
  userAgent: string | null;
}): Promise<SignInOutcome> {
  const challenge = clientChallenge(input.credential);
  const credentialId = credentialIdOf(input.credential);
  if (!challenge || !credentialId) return { status: 'failed' };
  const claimed = await claimChallenge(challenge, 'sign_in');
  if (!claimed || claimed.rpID !== input.party.rpID) return { status: 'expired' };
  const sql = authSql();
  const [row] =
    await sql`SELECT id::text, account_id::text, credential_id, public_key, counter, transports
    FROM auth_passkeys WHERE credential_id = ${credentialId} AND rp_id = ${input.party.rpID}`;
  if (!row) return { status: 'unknown' };
  const stored: StoredPasskey = {
    id: String(row.id),
    accountId: String(row.account_id),
    credentialId: String(row.credential_id),
    publicKey: String(row.public_key),
    counter: Number(row.counter),
    transports: (row.transports as string[] | null) ?? [],
  };
  const verified = await verifyAssertion({
    party: input.party,
    credential: input.credential as AuthenticationResponseJSON,
    challenge,
    stored,
  });
  if (!verified) return { status: 'failed' };
  const token = randomBytes(32).toString('hex');
  const opened = await sql`WITH used AS (
      UPDATE auth_passkeys SET counter = ${verified.newCounter}, backed_up = ${verified.backedUp}, last_used_at = now()
      WHERE id = ${stored.id} AND counter = ${stored.counter}
      RETURNING account_id
    ), owner AS (
      SELECT a.id FROM auth_accounts a JOIN used u ON u.account_id = a.id WHERE a.suspended_at IS NULL
    ), previous AS (
      DELETE FROM auth_sessions WHERE EXISTS (SELECT 1 FROM owner)
        AND (token_hash = ${hashToken(input.previousSessionToken)} OR (account_id = ${stored.accountId} AND expires_at <= now()))
    ) INSERT INTO auth_sessions (token_hash, account_id, expires_at, user_agent, passkey_id)
      SELECT ${hashToken(token)}, id, now() + ${sessionSeconds} * interval '1 second', ${input.userAgent}, ${stored.id}
      FROM owner RETURNING account_id`;
  if (!opened.length) return { status: 'refused' };
  return { status: 'ok', accountId: stored.accountId, passkeyId: stored.id, token };
}

// ── Listing and removal (Ajustes › Seguridad) ──────────────────────────

export type PasskeySummary = {
  id: string;
  name: string;
  synced: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export async function listPasskeys(accountId: string): Promise<PasskeySummary[]> {
  const sql = authSql();
  const rows = await sql`SELECT id::text, name, backed_up, created_at::text, last_used_at::text
    FROM auth_passkeys WHERE account_id = ${accountId} ORDER BY created_at`;
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    synced: Boolean(row.backed_up),
    createdAt: String(row.created_at),
    lastUsedAt: row.last_used_at == null ? null : String(row.last_used_at),
  }));
}

/**
 * Removes one of the account's passkeys and, in the same statement, closes the sessions that
 * were opened with it, except the one doing the removal: whoever added a passkey with a stolen
 * session loses what they opened with it. The password always remains, so removing the last
 * passkey never leaves an account without a way in.
 */
export async function removePasskey(input: {
  accountId: string;
  passkeyId: string;
  currentSessionHash: string;
}): Promise<{ name: string; credentialId: string; remaining: string[] } | null> {
  const sql = authSql();
  const [row] = await sql`WITH gone AS (
      DELETE FROM auth_passkeys WHERE id = ${input.passkeyId} AND account_id = ${input.accountId}
      RETURNING id, name, credential_id, rp_id
    ), closed AS (
      DELETE FROM auth_sessions WHERE passkey_id IN (SELECT id FROM gone) AND token_hash <> ${input.currentSessionHash}
    ) SELECT name, credential_id,
      ARRAY(SELECT p.credential_id FROM auth_passkeys p, gone g
        WHERE p.account_id = ${input.accountId} AND p.rp_id = g.rp_id AND p.id <> g.id) AS remaining
    FROM gone`;
  if (!row) return null;
  return {
    name: String(row.name),
    credentialId: String(row.credential_id),
    remaining: ((row.remaining as string[] | null) ?? []).map(String),
  };
}
