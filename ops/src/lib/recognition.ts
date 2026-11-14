import type { Tone } from '@/components/ui/Badge';

// «Verificado por shwcs» and recognitions, ops side (docs/recognition.md,
// db/solution-recognition.sql). The product keeps the same rules in
// src/lib/recognition/model.ts; ops builds separately and cannot import from it,
// so the pieces it needs are copied here. Keep both in step.

/** What the team confirms before verifying. site, product and team are always required. */
export const VERIFICATION_CHECKS = [
  { id: 'site', label: 'El sitio funciona y es del proyecto', required: true },
  {
    id: 'product',
    label: 'El producto o servicio existe y hace lo que dice la ficha',
    required: true,
  },
  {
    id: 'team',
    label: 'Confirmamos que quien la registró representa al proyecto',
    required: true,
  },
  {
    id: 'registries',
    label: 'Revisamos registros públicos que aplican (p. ej., lista 69-B del SAT)',
    required: false,
  },
] as const;
export type VerificationCheck = (typeof VERIFICATION_CHECKS)[number]['id'];
export const VERIFICATION_CHECK_IDS: readonly string[] = VERIFICATION_CHECKS.map(c => c.id);
export const REQUIRED_CHECK_IDS: readonly string[] = VERIFICATION_CHECKS.filter(
  c => c.required,
).map(c => c.id);

export function checkLabel(id: string) {
  return VERIFICATION_CHECKS.find(c => c.id === id)?.label ?? id;
}

/**
 * The host a verification is tied to: lowercase hostname without a leading "www.".
 * Same rule as recognitionHost() in the product: the public check only shows while
 * the published website still points at this host.
 */
export function recognitionHost(website: unknown): string | null {
  if (typeof website !== 'string' || !website) return null;
  try {
    const url = new URL(website);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9.-]{3,253}$/.test(host) && host.includes('.') ? host : null;
  } catch {
    return null;
  }
}

/** Email domain normalized the same way, for the "owner email matches the site" signal. */
export function emailHost(email: string | null | undefined): string | null {
  const domain = email?.split('@')[1]?.trim().toLowerCase();
  return domain ? domain.replace(/^www\./, '') : null;
}

// ── Tax identity (copied from src/lib/compliance/server.ts + rfc.ts) ─────────────

const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
const genericRfcs = new Set(['XAXX010101000', 'XEXX010101000']);
const notCountries = new Set(['EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ']);
const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });

export function isCountryCode(value: string) {
  return /^[A-Z]{2}$/.test(value) && !notCountries.has(value) && !!regionNames.of(value);
}

export function countryOptions() {
  const names = new Intl.DisplayNames(['es-MX'], { type: 'region' });
  const options: { value: string; label: string }[] = [];
  for (let a = 65; a <= 90; a++)
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (isCountryCode(code)) options.push({ value: code, label: names.of(code) ?? code });
    }
  return options.sort((x, y) => x.label.localeCompare(y.label, 'es'));
}

export type TaxIdentityResult =
  { ok: true; country: string; taxId: string } | { ok: false; error: string };

/** Mexico checks the RFC strictly; elsewhere any plain identifier up to 40 characters. */
export function readTaxIdentity(countryInput: unknown, taxIdInput: unknown): TaxIdentityResult {
  const country = typeof countryInput === 'string' ? countryInput.trim().toUpperCase() : '';
  if (!isCountryCode(country)) return { ok: false, error: 'Elige un país válido.' };
  if (country === 'MX') {
    const rfc =
      typeof taxIdInput === 'string' ? taxIdInput.trim().toUpperCase().replace(/[\s-]/g, '') : '';
    if (!rfcPattern.test(rfc))
      return { ok: false, error: 'El RFC no tiene un formato válido (12 o 13 caracteres).' };
    if (genericRfcs.has(rfc))
      return { ok: false, error: 'Un RFC genérico no identifica a la empresa.' };
    return { ok: true, country, taxId: rfc };
  }
  const taxId =
    typeof taxIdInput === 'string' ? taxIdInput.trim().toUpperCase().replace(/\s+/g, ' ') : '';
  if (!/^[A-Z0-9][A-Z0-9 .\-/]{2,39}$/.test(taxId))
    return {
      ok: false,
      error: 'El identificador fiscal debe tener 3–40 letras, números, espacios o . - /',
    };
  return { ok: true, country, taxId };
}

export const SAT_69B: Record<string, { label: string; tone: Tone }> = {
  clear: { label: 'No aparece en la lista 69-B', tone: 'sage' },
  pending: { label: 'Lista 69-B aún no descargada', tone: 'neutral' },
  presunto: { label: '69-B: presunto', tone: 'amber' },
  definitivo: { label: '69-B: definitivo', tone: 'terracotta' },
  desvirtuado: { label: '69-B: desvirtuado', tone: 'sage' },
  sentencia_favorable: { label: '69-B: sentencia favorable', tone: 'sage' },
};

// ── Recognitions ─────────────────────────────────────────────────────────────────

/** Months are first-of-month dates; editorial picks span the whole calendar month. */
export function monthBounds(month: unknown): { start: string; end: string } | null {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, m] = month.split('-').map(Number);
  if (year < 2026 || year > 2100) return null;
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

export const EDITORIAL_PER_MONTH = 3;

const monthFormat = new Intl.DateTimeFormat('es-MX', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayFormat = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const dayYearFormat = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "noviembre de 2026" for a YYYY-MM-DD month start. */
export function fmtMonth(date: string) {
  return monthFormat.format(new Date(`${date}T00:00:00Z`));
}

/** "10 nov – 16 nov 2026" for a week. */
export function fmtWeek(start: string, end: string) {
  return `${dayFormat.format(new Date(`${start}T00:00:00Z`))} – ${dayYearFormat.format(
    new Date(`${end}T00:00:00Z`),
  )}`;
}

export function scopeLabel(scope: string) {
  return scope === 'all' ? 'General' : scope;
}
