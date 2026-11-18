// Newsletter campaigns from ops (SHCWS-124). ops writes and audits campaigns in its own SQL;
// the product renders, tests and sends them (POST /api/internal/newsletter with Bearer
// OPS_NEWSLETTER_SECRET). ops never sends a newsletter email itself, like /panel/correo.
// The product re-validates everything before a test and before sending: the checks here
// only keep the database sane and give quick feedback.

export const PROFILES = ['founder', 'buyer', 'both', 'exploring'] as const;
export const ROLES = [
  'leadership',
  'product_tech',
  'sales_marketing',
  'operations',
  'finance_procurement',
  'other',
] as const;

export const LIMITS = { subject: 150, preheader: 200, heading: 150, body: 6000 } as const;

export interface CampaignCopy {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
}

export interface CampaignListing {
  solutionId: string;
  name: string;
  summary: string;
  path: string;
  category: string | null;
}

export interface CampaignContent {
  es: CampaignCopy;
  en: CampaignCopy | null;
  listings: CampaignListing[];
}

export const CAMPAIGN_STATUS: Record<
  string,
  { label: string; tone: 'neutral' | 'blue' | 'amber' | 'sage' | 'terracotta' }
> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  queued: { label: 'En cola', tone: 'blue' },
  sending: { label: 'Enviando', tone: 'amber' },
  sent: { label: 'Enviada', tone: 'sage' },
  cancelled: { label: 'Cancelada', tone: 'terracotta' },
};

export const UNSUBSCRIBE_REASON: Record<string, string> = {
  link: 'Enlace del correo',
  one_click: 'Botón del cliente de correo',
  bounce: 'Rebote',
  complaint: 'Queja de spam',
  request: 'Por solicitud',
};

/** What the product reports as a reason a campaign can't be tested, in plain words. */
export function problemLabel(code: string): string {
  const [locale, field] = code.includes(':') ? code.split(':') : ['', code];
  const where = locale === 'en' ? ' (inglés)' : locale === 'es' ? ' (español)' : '';
  const what: Record<string, string> = {
    subject: 'Falta el asunto',
    heading: 'Falta el título',
    body: 'Falta el texto (o fichas)',
    link: 'Hay un enlace que no es http(s) ni una ruta del sitio',
    links: 'Demasiados enlaces (máximo 60)',
    content: 'El contenido guardado no es válido',
  };
  return `${what[field] ?? field}${where}`;
}

export const EMPTY_COPY: CampaignCopy = { subject: '', preheader: '', heading: '', body: '' };

function copyFrom(value: unknown): CampaignCopy | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const field = (key: keyof CampaignCopy, max: number) => {
    const raw = input[key];
    if (raw === undefined || raw === null) return '';
    return typeof raw === 'string' && raw.length <= max ? raw.replace(/\r\n?/g, '\n') : null;
  };
  const subject = field('subject', LIMITS.subject);
  const preheader = field('preheader', LIMITS.preheader);
  const heading = field('heading', LIMITS.heading);
  const body = field('body', LIMITS.body);
  if (subject === null || preheader === null || heading === null || body === null) return null;
  return { subject: subject.trim(), preheader: preheader.trim(), heading: heading.trim(), body };
}

/**
 * The editable part of a campaign from an ops request. Listings are never written from the
 * browser: only kept or removed by id from the stored ones (they are copies of published
 * listings, and the founder's words are not edited here).
 */
export function readEdit(
  body: Record<string, unknown>,
  stored: CampaignListing[],
): { content: CampaignContent; segment: { profiles: string[]; roles: string[] } } | null {
  const es = copyFrom(body.es);
  const en = body.en == null ? null : copyFrom(body.en);
  if (!es || (body.en != null && !en)) return null;
  const keep = Array.isArray(body.listings)
    ? body.listings.filter((id): id is string => typeof id === 'string')
    : stored.map(item => item.solutionId);
  const segment =
    body.segment && typeof body.segment === 'object'
      ? (body.segment as Record<string, unknown>)
      : {};
  const pick = <T extends string>(list: unknown, allowed: readonly T[]) =>
    Array.isArray(list) ? allowed.filter(item => list.includes(item)) : [];
  const english = en && (en.subject || en.heading || en.body.trim()) ? en : null;
  return {
    content: { es, en: english, listings: stored.filter(item => keep.includes(item.solutionId)) },
    segment: { profiles: pick(segment.profiles, PROFILES), roles: pick(segment.roles, ROLES) },
  };
}

export function readListings(value: unknown): CampaignListing[] {
  if (!value || typeof value !== 'object') return [];
  const list = (value as Record<string, unknown>).listings;
  if (!Array.isArray(list)) return [];
  return list.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    return typeof row.solutionId === 'string' && typeof row.name === 'string'
      ? [
          {
            solutionId: row.solutionId,
            name: row.name,
            summary: typeof row.summary === 'string' ? row.summary : '',
            path: typeof row.path === 'string' ? row.path : '',
            category: typeof row.category === 'string' ? row.category : null,
          },
        ]
      : [];
  });
}

export function readContent(value: unknown): CampaignContent {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    es: copyFrom(input.es) ?? EMPTY_COPY,
    en: input.en == null ? null : copyFrom(input.en),
    listings: readListings(value),
  };
}

export function readSegment(value: unknown) {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const pick = <T extends string>(list: unknown, allowed: readonly T[]) =>
    Array.isArray(list) ? allowed.filter(item => list.includes(item)) : [];
  return { profiles: pick(input.profiles, PROFILES), roles: pick(input.roles, ROLES) };
}

export function newsletterProductConfigured() {
  return Boolean(
    process.env.PRODUCT_APP_ORIGIN?.trim() &&
    (process.env.OPS_NEWSLETTER_SECRET?.trim().length ?? 0) >= 32,
  );
}

export type ProductReply = { status: number; data: Record<string, unknown> };

/** One call to the product's internal newsletter API. Never throws; status 0 = unreachable. */
export async function callProduct(
  body: Record<string, unknown>,
  timeoutMs = 20_000,
): Promise<ProductReply> {
  const origin = process.env.PRODUCT_APP_ORIGIN?.trim();
  const secret = process.env.OPS_NEWSLETTER_SECRET?.trim();
  if (!origin || !secret || secret.length < 32)
    return { status: 0, data: { error: 'not-configured' } };
  try {
    const response = await fetch(`${origin}/api/internal/newsletter`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: response.status, data };
  } catch (err) {
    console.error('[ops/newsletter] product unreachable', err instanceof Error ? err.message : err);
    return { status: 0, data: { error: 'unreachable' } };
  }
}

export interface PreviewResult {
  version: number;
  problems: string[];
  message?: { subject: string; html: string; text: string; locale: string };
  audience?: { confirmed: number; sendable: number; english: number };
  emailAvailable?: boolean;
}

export async function productPreview(
  campaignId: string,
  locale: 'es' | 'en',
): Promise<{ ok: true; preview: PreviewResult } | { ok: false; error: string }> {
  const reply = await callProduct({ action: 'preview', campaignId, locale });
  if (reply.status !== 200) {
    const error =
      reply.data.error === 'not-configured'
        ? 'Falta PRODUCT_APP_ORIGIN u OPS_NEWSLETTER_SECRET en ops.'
        : reply.status === 401
          ? 'El producto rechazó OPS_NEWSLETTER_SECRET: debe ser el mismo valor en los dos proyectos.'
          : reply.status === 0
            ? 'No se pudo contactar al producto.'
            : 'El producto no pudo preparar la vista previa.';
    return { ok: false, error };
  }
  const data = reply.data;
  return {
    ok: true,
    preview: {
      version: Number(data.version),
      problems: Array.isArray(data.problems) ? data.problems.map(String) : [],
      message:
        data.message && typeof data.message === 'object'
          ? (data.message as PreviewResult['message'])
          : undefined,
      audience:
        data.audience && typeof data.audience === 'object'
          ? (data.audience as PreviewResult['audience'])
          : undefined,
      emailAvailable: Boolean(data.emailAvailable),
    },
  };
}
