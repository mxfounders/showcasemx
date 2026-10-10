// Edge-safe network helpers (no node: imports): middleware imports this file.
//
// Client addresses come from x-real-ip / x-forwarded-for. On Vercel both are
// written by the platform and overwrite whatever the client sent; ops is only
// deployed there. Anywhere else these headers are client-controlled, so the IP
// allowlist below must not be relied on outside Vercel.

function parseV4(value: string): number | null {
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const byte = Number(part);
    if (byte > 255) return null;
    n = n * 256 + byte;
  }
  return n;
}

function parseV6(value: string): bigint | null {
  let text = value.toLowerCase();
  const zone = text.indexOf('%');
  if (zone !== -1) text = text.slice(0, zone);
  let embedded: number | null = null;
  if (text.includes('.')) {
    const lastColon = text.lastIndexOf(':');
    if (lastColon === -1) return null;
    embedded = parseV4(text.slice(lastColon + 1));
    if (embedded === null) return null;
    text = text.slice(0, lastColon + 1) + '0:0';
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const groups =
    halves.length === 2
      ? head.length + tail.length > 7
        ? null
        : [...head, ...Array<string>(8 - head.length - tail.length).fill('0'), ...tail]
      : head.length === 8
        ? head
        : null;
  if (!groups) return null;
  let n = BigInt(0);
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    n = (n << BigInt(16)) | BigInt(parseInt(group, 16));
  }
  if (embedded !== null) n = (n & ~BigInt(0xffffffff)) | BigInt(embedded);
  return n;
}

type Parsed = { family: 4; value: number } | { family: 6; value: bigint };

const LOW_32 = BigInt(0xffffffff);

/** Parses an address, folding IPv4-mapped IPv6 (::ffff:a.b.c.d) to IPv4. */
export function parseIp(value: string): Parsed | null {
  const v4 = parseV4(value);
  if (v4 !== null) return { family: 4, value: v4 };
  const v6 = parseV6(value);
  if (v6 === null) return null;
  if (v6 >> BigInt(32) === BigInt(0xffff)) return { family: 4, value: Number(v6 & LOW_32) };
  return { family: 6, value: v6 };
}

export function isIp(value: string): boolean {
  return value.length <= 64 && parseIp(value) !== null;
}

interface Rule {
  family: 4 | 6;
  base: bigint;
  bits: number;
}

function toBig(p: Parsed): bigint {
  return typeof p.value === 'bigint' ? p.value : BigInt(p.value);
}

/** "1.2.3.4", "10.0.0.0/8", "2001:db8::/32" — invalid entries are dropped. */
export function parseAllowlist(raw: string | undefined): Rule[] {
  if (!raw) return [];
  const rules: Rule[] = [];
  for (const entry of raw.split(/[\s,]+/)) {
    if (!entry) continue;
    const [addr, prefix] = entry.split('/');
    const parsed = parseIp(addr);
    if (!parsed) continue;
    const width = parsed.family === 4 ? 32 : 128;
    const bits = prefix === undefined ? width : Number(prefix);
    if (!Number.isInteger(bits) || bits < 0 || bits > width) continue;
    rules.push({ family: parsed.family, base: toBig(parsed), bits });
  }
  return rules;
}

export function ipAllowed(ip: string | null, rules: Rule[]): boolean {
  if (!rules.length) return true; // no allowlist configured
  if (!ip) return false;
  const parsed = parseIp(ip);
  if (!parsed) return false;
  const value = toBig(parsed);
  const width = parsed.family === 4 ? 32 : 128;
  return rules.some(rule => {
    if (rule.family !== parsed.family) return false;
    if (rule.bits === 0) return true;
    const shift = BigInt(width - rule.bits);
    return value >> shift === rule.base >> shift;
  });
}

/** Platform-provided client address, or null when absent/invalid. */
export function clientIp(headers: Headers): string | null {
  const candidates = [headers.get('x-real-ip'), headers.get('x-forwarded-for')?.split(',')[0]];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (value && isIp(value)) return value.toLowerCase();
  }
  return null;
}

/**
 * Strict CSP. Scripts need the per-request nonce (Next.js stamps it on its own
 * scripts when it sees this header on the request); 'strict-dynamic' lets those
 * load their chunks. Inline style attributes stay allowed: they cannot run code.
 */
export function buildCsp(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
