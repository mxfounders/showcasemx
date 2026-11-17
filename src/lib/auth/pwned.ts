import { createHash } from 'node:crypto';

/**
 * Whether a password appears in Have I Been Pwned's breach corpus (SHCWS-156), with
 * k-anonymity: only the first 5 hex characters of its SHA-1 leave the server, and the
 * response is padded so its size reveals nothing either. Returns null when the service
 * can't answer, and callers never block on null: an outage must not stop sign-ups.
 */
export async function passwordLeaked(
  password: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean | null> {
  const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = digest.slice(0, 5),
    suffix = digest.slice(5);
  try {
    const response = await fetcher(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'shwcs-password-check' },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    for (const line of (await response.text()).split('\n')) {
      const [candidate, count] = line.trim().split(':');
      // Padding rows carry a count of 0.
      if (candidate === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch {
    return null;
  }
}
