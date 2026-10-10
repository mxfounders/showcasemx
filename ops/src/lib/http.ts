import { NextRequest, NextResponse } from 'next/server';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export function failure(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

export function ok<T extends Record<string, unknown>>(data: T, init?: { status?: number }) {
  return NextResponse.json(
    { ok: true, ...data },
    { status: init?.status ?? 200, headers: NO_STORE },
  );
}

export async function opsBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.includes('application/json')) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Mutations must come from this origin. Browsers always send Origin on POST;
 * Sec-Fetch-Site (when present) must also say same-origin, which rejects
 * same-site sibling subdomains of shwcs.site.
 */
export function sameOrigin(request: NextRequest): boolean {
  if (request.headers.get('origin') !== request.nextUrl.origin) return false;
  const site = request.headers.get('sec-fetch-site');
  return site === null || site === 'same-origin';
}

/** Bounded integer query param; NaN, negatives and huge pages fall back safely. */
export function intParam(url: URL, name: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(url.searchParams.get(name) ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function textParam(url: URL, name: string, max = 200): string {
  return (url.searchParams.get(name) ?? '').trim().slice(0, max);
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Case-insensitive LIKE pattern with the user's own % _ \ escaped (backslash is
 * PostgreSQL's default LIKE escape), or null for an empty query.
 */
export function likePattern(query: string): string | null {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return null;
  return '%' + trimmed.replace(/[\\%_]/g, char => '\\' + char) + '%';
}

/** Normalises driver timestamps (Date or string) to ISO strings. */
export function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isoRequired(value: unknown): string {
  return iso(value) ?? new Date(0).toISOString();
}
