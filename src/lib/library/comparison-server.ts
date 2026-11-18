import { solutionsSql } from '@/lib/solutions/server';
import { resolveProjects } from './server';
import type { ComparedProject } from './comparison';
import { getReviewSummaries } from '@/lib/reviews/server';
import { responseSignals } from '@/lib/solutions/response';
import { recognitionHost } from '@/lib/recognition/model';
import { verificationDomain } from '@/lib/trust/domain';
import { readOfferFacts } from '@/lib/solutions/model';

const list = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

/**
 * The listings of a comparison (SHCWS-53), read live from their published snapshot only:
 * the library's public fields (resolveProjects) plus the structured decision data and the
 * trust signals the catalog shows. A key that is not published right now is missing from
 * the result. Never reads a draft, the private contact email or anyone's notes.
 */
export async function comparedProjects(keys: string[]): Promise<Record<string, ComparedProject>> {
  const base = await resolveProjects(keys);
  const ids = Array.from(
    new Set(
      Object.values(base).flatMap(project => (project.solutionId ? [project.solutionId] : [])),
    ),
  );
  if (!ids.length) return base;
  const sql = solutionsSql();
  const [rows, reviews, responses] = await Promise.all([
    sql`SELECT s.id::text AS id,s.published_data->>'website' AS website,
      s.published_data->'capabilities' AS capabilities,s.published_data->'integrationKeys' AS integration_keys,
      s.published_data->>'setupTime' AS setup_time,s.published_data->'compliance' AS compliance,
      s.published_data->>'originCountry' AS origin_country,
      s.published_data->'serviceCountries' AS service_countries,s.published_data->'billingCountries' AS billing_countries,
      s.published_data->'currencies' AS currencies,s.published_data->'supportLanguages' AS support_languages,
      s.published_data->>'supportHours' AS support_hours,s.published_data->'paymentMethods' AS payment_methods,
      s.published_data->'foundedYear' AS founded_year,s.published_data->>'teamSize' AS team_size,
      s.published_data->>'customerCount' AS customer_count,
      jsonb_build_object('plans',s.published_data->'plans','tryOptions',s.published_data->'tryOptions',
        'trialDays',s.published_data->'trialDays','developerTools',s.published_data->'developerTools',
        'supportChannels',s.published_data->'supportChannels','supportResponse',s.published_data->'supportResponse',
        'slaUptime',s.published_data->'slaUptime','onboarding',s.published_data->'onboarding',
        'exitTerms',s.published_data->'exitTerms') AS offer,
      (SELECT array_agg(c->>'client') FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.published_data->'cases')='array' THEN s.published_data->'cases' ELSE '[]'::jsonb END) c
        WHERE coalesce(c->>'client','')<>'' AND coalesce(c->>'result','')<>'') AS case_clients,
      (SELECT vf.host FROM solution_verifications vf WHERE vf.solution_id=s.id) AS verified_host,
      (SELECT p.domain FROM solution_domain_proofs p WHERE p.solution_id=s.id AND p.owner_id=s.owner_id
        AND p.verified_at IS NOT NULL AND p.expires_at>now() ORDER BY p.verified_at DESC LIMIT 1) AS proof_domain
      FROM founder_solutions s WHERE s.id=ANY(${ids}::uuid[]) AND s.published_data IS NOT NULL`,
    getReviewSummaries(ids).catch(() => null),
    // One query per listing (at most three): the same signal as the ficha.
    Promise.all(ids.map(id => responseSignals(id).catch(() => new Map()))).then(
      maps => new Map(maps.flatMap(map => [...map.entries()])),
    ),
  ]);
  const byId = new Map(rows.map(row => [String(row.id), row]));
  const result: Record<string, ComparedProject> = {};
  for (const [key, project] of Object.entries(base)) {
    const row = project.solutionId ? byId.get(project.solutionId) : undefined;
    if (!row) {
      result[key] = project;
      continue;
    }
    const id = String(row.id);
    result[key] = {
      ...project,
      capabilities: list(row.capabilities),
      integrationKeys: list(row.integration_keys),
      setupTime: text(row.setup_time),
      compliance: list(row.compliance),
      originCountry: text(row.origin_country),
      serviceCountries: list(row.service_countries),
      billingCountries: list(row.billing_countries),
      currencies: list(row.currencies),
      supportLanguages: list(row.support_languages),
      supportHours: text(row.support_hours),
      paymentMethods: list(row.payment_methods),
      foundedYear: typeof row.founded_year === 'number' ? row.founded_year : undefined,
      teamSize: text(row.team_size),
      customerCount: text(row.customer_count),
      caseClients: list(row.case_clients) ?? [],
      ...readOfferFacts(row.offer),
      // Same rules as the catalog card (src/lib/solutions/public.ts): only while the
      // check and the TXT proof are for the host the listing points at today.
      verified:
        !!row.verified_host && recognitionHost(String(row.website)) === String(row.verified_host),
      verifiedDomain:
        row.proof_domain && verificationDomain(row.website) === String(row.proof_domain)
          ? String(row.proof_domain)
          : null,
      reviews: reviews ? (reviews.get(id) ?? null) : null,
      response: responses.get(id) ?? null,
    };
  }
  return result;
}
