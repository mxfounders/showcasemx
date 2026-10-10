import { solutionsSql } from '@/lib/solutions/server';
import { isCountryCode } from '@/lib/countries';
import { isGenericRfc, isRfc, normalizeRfc } from './rfc';
import { parseSat69b, sat69bUrl, type Sat69bSituation } from './sat-69b';

/**
 * A vendor's declared fiscal identity and what public registries say about it
 * (docs/compliance.md). The identity stays private; only the lookup result is public.
 * Countries without a registry adapter store the identity and show no result.
 */

export type TaxIdentity = { country: string; taxId: string };
export type TaxIdentityError = 'country' | 'taxId' | 'rfc' | 'genericRfc';

/** Mexico checks the RFC strictly; elsewhere any plain identifier up to 40 characters. */
export function readTaxIdentity(
  input: unknown,
): { ok: true; identity: TaxIdentity } | { ok: false; error: TaxIdentityError } {
  const body = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const country = typeof body.country === 'string' ? body.country.trim().toUpperCase() : '';
  if (!isCountryCode(country)) return { ok: false, error: 'country' };
  if (country === 'MX') {
    const rfc = normalizeRfc(body.taxId);
    if (!isRfc(rfc)) return { ok: false, error: 'rfc' };
    if (isGenericRfc(rfc)) return { ok: false, error: 'genericRfc' };
    return { ok: true, identity: { country, taxId: rfc } };
  }
  const taxId =
    typeof body.taxId === 'string' ? body.taxId.trim().toUpperCase().replace(/\s+/g, ' ') : '';
  if (!/^[A-Z0-9][A-Z0-9 .\-/]{2,39}$/.test(taxId)) return { ok: false, error: 'taxId' };
  return { ok: true, identity: { country, taxId } };
}

/** Countries with a registry adapter. Everything else is declared only. */
export const registryCountries = ['MX'] as const;

export type ComplianceResult =
  | { country: string; registry: null }
  | {
      country: 'MX';
      registry: 'sat_69b';
      /** `clear`: not on the list. `pending`: the list has not been downloaded yet. */
      situation: Sat69bSituation | 'clear' | 'pending';
      sourceDate: string | null;
      checkedAt: string | null;
    };

/** The public outcome for a listing, or null when the vendor declared nothing. */
export async function complianceResult(solutionId: string): Promise<ComplianceResult | null> {
  const sql = solutionsSql();
  const [row] = await sql`SELECT t.country, l.situation, i.source_date::text AS source_date,
      i.checked_at, i.imported_at IS NOT NULL AS imported
    FROM solution_tax_identities t
    LEFT JOIN sat_69b_list l ON t.country = 'MX' AND l.rfc = t.tax_id
    LEFT JOIN registry_imports i ON i.source = 'sat_69b'
    WHERE t.solution_id = ${solutionId}`;
  if (!row) return null;
  const country = String(row.country);
  if (country !== 'MX') return { country, registry: null };
  return {
    country: 'MX',
    registry: 'sat_69b',
    situation: !row.imported ? 'pending' : ((row.situation as Sat69bSituation | null) ?? 'clear'),
    sourceDate: row.source_date ? String(row.source_date) : null,
    checkedAt: row.checked_at ? new Date(row.checked_at).toISOString() : null,
  };
}

export async function getTaxIdentity(solutionId: string): Promise<TaxIdentity | null> {
  const sql = solutionsSql();
  const [row] =
    await sql`SELECT country, tax_id FROM solution_tax_identities WHERE solution_id = ${solutionId}`;
  return row ? { country: String(row.country), taxId: String(row.tax_id) } : null;
}

/** Saves for the owner only; returns false when the listing is not theirs. */
export async function saveTaxIdentity(solutionId: string, owner: string, identity: TaxIdentity) {
  const sql = solutionsSql();
  const rows = await sql`INSERT INTO solution_tax_identities (solution_id, country, tax_id)
    SELECT id, ${identity.country}, ${identity.taxId} FROM founder_solutions
    WHERE id = ${solutionId} AND owner_id = ${owner}
    ON CONFLICT (solution_id) DO UPDATE
      SET country = EXCLUDED.country, tax_id = EXCLUDED.tax_id, updated_at = now()
    RETURNING solution_id`;
  return rows.length > 0;
}

export async function deleteTaxIdentity(solutionId: string, owner: string) {
  const sql = solutionsSql();
  const rows = await sql`DELETE FROM solution_tax_identities t USING founder_solutions s
    WHERE t.solution_id = ${solutionId} AND s.id = t.solution_id AND s.owner_id = ${owner}
    RETURNING t.solution_id`;
  return rows.length > 0;
}

/**
 * Mirrors the SAT's 69-B list. A conditional request (ETag) means most days cost a 304;
 * a changed file is parsed and swapped in one transaction, so readers never see a
 * half-imported list. Failures keep the previous list and record only an error code.
 */
export async function refreshSat69b(): Promise<
  'unchanged' | 'imported' | 'failed' | 'unavailable'
> {
  const sql = solutionsSql();
  const [previous] = await sql`SELECT etag FROM registry_imports WHERE source = 'sat_69b'`;
  try {
    const response = await fetch(sat69bUrl, {
      headers: previous?.etag ? { 'If-None-Match': String(previous.etag) } : {},
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    });
    if (response.status === 304) {
      await sql`UPDATE registry_imports SET checked_at = now(), last_error = NULL WHERE source = 'sat_69b'`;
      return 'unchanged';
    }
    if (!response.ok) throw new Error(`SAT_69B_HTTP_${response.status}`);
    // The SAT publishes the file in Latin-1.
    const text = new TextDecoder('latin1').decode(await response.arrayBuffer());
    const { sourceDate, entries } = parseSat69b(text);
    if (entries.length < 1000) throw new Error('SAT_69B_TOO_SMALL');
    await sql.transaction([
      sql`DELETE FROM sat_69b_list`,
      sql`INSERT INTO sat_69b_list (rfc, situation)
        SELECT * FROM unnest(${entries.map(entry => entry.rfc)}::text[], ${entries.map(entry => entry.situation)}::text[])`,
      sql`INSERT INTO registry_imports (source, etag, last_modified, source_date, entries, imported_at, checked_at, last_error)
        VALUES ('sat_69b', ${response.headers.get('etag')}, ${response.headers.get('last-modified')},
          ${sourceDate}::date, ${entries.length}, now(), now(), NULL)
        ON CONFLICT (source) DO UPDATE SET etag = EXCLUDED.etag, last_modified = EXCLUDED.last_modified,
          source_date = EXCLUDED.source_date, entries = EXCLUDED.entries,
          imported_at = EXCLUDED.imported_at, checked_at = EXCLUDED.checked_at, last_error = NULL`,
    ]);
    return 'imported';
  } catch (error) {
    const code =
      error instanceof Error && /^SAT_69B_/.test(error.message)
        ? error.message
        : error instanceof Error && error.name === 'TimeoutError'
          ? 'SAT_69B_TIMEOUT'
          : 'SAT_69B_FETCH';
    await sql`INSERT INTO registry_imports (source, checked_at, last_error) VALUES ('sat_69b', now(), ${code})
      ON CONFLICT (source) DO UPDATE SET checked_at = now(), last_error = ${code}`.catch(() => {});
    return code === 'SAT_69B_FETCH' || code === 'SAT_69B_TIMEOUT' ? 'unavailable' : 'failed';
  }
}
