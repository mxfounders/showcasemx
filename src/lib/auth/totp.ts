import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

// RFC 6238 TOTP, same parameters the ops backoffice already uses so a person can
// keep both accounts in one authenticator app. Second factor is optional here.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // accept one step before/after to absorb clock drift

export function base32Encode(buffer: Buffer): string {
  let bits = 0, value = 0, output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string { return base32Encode(randomBytes(20)); }

function hotp(secret: Buffer, counter: bigint): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', secret).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function currentStep(at: number = Date.now()): bigint { return BigInt(Math.floor(at / 1000 / STEP_SECONDS)); }
export function generateTotp(secret: string, step: bigint = currentStep()): string { return hotp(base32Decode(secret), step); }

/**
 * Verifies a six-digit code inside a small drift window. `lastUsedStep` blocks
 * replaying the same or an earlier accepted step, so a code stolen from the
 * screen cannot be reused inside its own 30-second window. Returns the accepted
 * step so the caller persists it, or null when the code does not match.
 */
export function verifyTotp(secret: string, code: string, lastUsedStep: bigint | null): bigint | null {
  if (!/^\d{6}$/.test(code)) return null;
  const key = base32Decode(secret);
  const now = currentStep();
  for (let delta = -WINDOW; delta <= WINDOW; delta++) {
    const step = now + BigInt(delta);
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    if (timingSafeEqual(Buffer.from(hotp(key, step)), Buffer.from(code))) return step;
  }
  return null;
}

export function otpauthUri(secret: string, email: string, issuer = 'shwcs'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => String(randomInt(0, 100_000_000)).padStart(8, '0'));
}

export function hashBackupCode(code: string): string { return createHash('sha256').update(code).digest('hex'); }

// The secret never sits in the database in the clear. Without AUTH_TOTP_KEY the
// application cannot enable or verify a second factor, and says so instead of
// pretending the protection is active.
function encryptionKey(): Buffer {
  const hex = process.env.AUTH_TOTP_KEY;
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) throw new Error('AUTH_TOTP_KEY_MISSING');
  return Buffer.from(hex, 'hex');
}
export function totpConfigured(): boolean { try { encryptionKey(); return true; } catch { return false; } }

/** AES-256-GCM, stored as base64(iv):base64(tag):base64(ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('INVALID_CIPHERTEXT');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
