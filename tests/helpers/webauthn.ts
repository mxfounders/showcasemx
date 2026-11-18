// A software passkey for tests (SHCWS-158): a P-256 key pair that answers WebAuthn ceremonies
// the way a browser and an authenticator would, with every field the server checks under the
// test's control (origin, rpID, counter, user verification, user handle). Attestation `none`.
import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import { isoCBOR } from '@simplewebauthn/server/helpers';

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest();

const UP = 0x01,
  UV = 0x04,
  BE = 0x08,
  BS = 0x10,
  AT = 0x40;

export type SoftwarePasskey = {
  id: string;
  rawId: Uint8Array;
  privateKey: KeyObject;
  cosePublicKey: Uint8Array;
  counter: number;
  /** Synced passkeys (iCloud, Google) always report a zero counter and the backup flags. */
  synced: boolean;
};

export function softwarePasskey({ synced = true, counter = 0 } = {}): SoftwarePasskey {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const cose = new Map<number, number | Uint8Array>([
    [1, 2], // kty: EC2
    [3, -7], // alg: ES256
    [-1, 1], // crv: P-256
    [-2, Buffer.from(String(jwk.x), 'base64url')],
    [-3, Buffer.from(String(jwk.y), 'base64url')],
  ]);
  const rawId = randomBytes(32);
  return {
    id: b64(rawId),
    rawId,
    privateKey,
    cosePublicKey: isoCBOR.encode(cose),
    counter,
    synced,
  };
}

function authenticatorData(input: {
  rpID: string;
  flags: number;
  counter: number;
  attested?: Uint8Array;
}) {
  const count = Buffer.alloc(4);
  count.writeUInt32BE(input.counter);
  return Buffer.concat([
    sha256(input.rpID),
    Buffer.from([input.flags]),
    count,
    ...(input.attested ? [input.attested] : []),
  ]);
}

const clientData = (type: string, challenge: string, origin: string) =>
  Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));

/** What startRegistration() returns for `options` (only `challenge` and `rp.id` are read). */
export function register(
  key: SoftwarePasskey,
  options: { challenge: string; rp: { id?: string } },
  { origin, rpID = options.rp.id ?? 'localhost', verified = true } = {} as {
    origin: string;
    rpID?: string;
    verified?: boolean;
  },
) {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(key.rawId.length);
  const attested = Buffer.concat([
    Buffer.alloc(16), // AAGUID: unknown provider
    length,
    key.rawId,
    key.cosePublicKey,
  ]);
  const flags = UP | (verified ? UV : 0) | AT | (key.synced ? BE | BS : 0);
  const authData = authenticatorData({ rpID, flags, counter: key.counter, attested });
  const attestationObject = isoCBOR.encode(
    new Map<string, string | Uint8Array | Map<string, string>>([
      ['fmt', 'none'],
      ['attStmt', new Map<string, string>()],
      ['authData', authData],
    ]),
  );
  return {
    id: key.id,
    rawId: key.id,
    type: 'public-key',
    response: {
      clientDataJSON: b64(clientData('webauthn.create', options.challenge, origin)),
      attestationObject: b64(attestationObject),
      transports: ['internal', 'hybrid'],
    },
    clientExtensionResults: {},
    authenticatorAttachment: 'platform',
  };
}

/** What startAuthentication() returns. Advances the key's counter unless it is a synced one. */
export function assert(
  key: SoftwarePasskey,
  challenge: string,
  {
    origin,
    rpID = 'localhost',
    verified = true,
    userHandle,
    counter,
  }: {
    origin: string;
    rpID?: string;
    verified?: boolean;
    /** The account UUID the browser reports as the passkey's user, if any. */
    userHandle?: string;
    /** Force the counter this response reports. */
    counter?: number;
  },
) {
  if (counter === undefined && !key.synced) key.counter += 1;
  const flags = UP | (verified ? UV : 0) | (key.synced ? BE | BS : 0);
  const authData = authenticatorData({ rpID, flags, counter: counter ?? key.counter });
  const data = clientData('webauthn.get', challenge, origin);
  const signature = sign('sha256', Buffer.concat([authData, sha256(data)]), key.privateKey);
  return {
    id: key.id,
    rawId: key.id,
    type: 'public-key',
    response: {
      clientDataJSON: b64(data),
      authenticatorData: b64(authData),
      signature: b64(signature),
      ...(userHandle
        ? { userHandle: b64(Buffer.from(userHandle.replaceAll('-', ''), 'hex')) }
        : {}),
    },
    clientExtensionResults: {},
    authenticatorAttachment: 'platform',
  };
}
