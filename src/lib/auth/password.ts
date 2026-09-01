import { credentialErrors } from './validation';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [version, salt, hash] = stored.split(':');
  if (version !== 'scrypt-v1' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(hash ?? '')) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, 'hex'));
}
export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
// For nonexistent accounts, do the same password work without a database secret.
export const dummyHash = `scrypt-v1:${'0'.repeat(32)}:${'0'.repeat(128)}`;
export function validateCredentials(value: unknown): { email: string; password: string } | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (typeof input.email !== 'string' || typeof input.password !== 'string' || input.company) return null;
  const email = input.email.trim().toLowerCase();
  if (Object.keys(credentialErrors(email, input.password)).length) return null;
  return { email, password: input.password };
}
