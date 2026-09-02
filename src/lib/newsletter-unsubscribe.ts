import { createHmac, timingSafeEqual } from "node:crypto";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function configuredSecret(secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET) {
  return typeof secret === "string" && secret.length >= 32 ? secret : null;
}

export function createNewsletterUnsubscribeToken(email: string, secret?: string) {
  const key = configuredSecret(secret);
  const normalized = email.trim().toLowerCase();
  if (!key || normalized.length > 254 || !emailPattern.test(normalized)) return null;
  const payload = Buffer.from(normalized, "utf8").toString("base64url");
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readNewsletterUnsubscribeToken(token: unknown, secret?: string) {
  const key = configuredSecret(secret);
  if (!key || typeof token !== "string" || token.length > 512) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", key).update(payload).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const email = Buffer.from(payload, "base64url").toString("utf8");
    if (email.length > 254 || !emailPattern.test(email) || email !== email.toLowerCase()) return null;
    return email;
  } catch {
    return null;
  }
}

