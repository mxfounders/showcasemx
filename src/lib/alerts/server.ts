import { authSql } from '@/lib/auth/security';
import { staticArtFor } from '@/lib/catalog-preview';
import { getSolutionCategories } from '@/lib/solutions/model';
import { responseSignals } from '@/lib/solutions/response';
import type { ResponseSignal } from '@/lib/solutions/response-model';
import { getDictionary } from '@/i18n/get-dictionary';
import {
  alertLabel,
  alertMatches,
  alertSignature,
  maxAlertsPerAccount,
  readAlertCriteria,
  type AlertCriteria,
  type AlertProduct,
} from './model';

/** A published listing as an alert sees it, with its owner (never sent to a browser). */
export type AlertCandidate = { id: string; ownerId: string; name: string; product: AlertProduct };

const asList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

/**
 * Every published listing, read straight from the database: alerts run right after ops
 * publishes (/api/internal/catalog-revalidate), when the cached catalog may still hold the
 * previous version. Same fields as publicProducts (src/lib/solutions/public.ts) needs for
 * search and filters, plus the owner, so nobody is alerted about their own listing.
 */
export async function alertCandidates(): Promise<AlertCandidate[]> {
  const sql = authSql();
  const [rows, responses] = await Promise.all([
    sql`SELECT id::text, owner_id::text, catalog_key, published_data AS data
      FROM founder_solutions WHERE published_data IS NOT NULL`,
    responseSignals().catch(() => new Map<string, ResponseSignal>()),
  ]);
  return rows.map(row => {
    const data = (row.data ?? {}) as Record<string, unknown>;
    const name = String(data.name ?? '');
    const staticProduct = staticArtFor(row.catalog_key, data.website);
    const text = (key: string) => (typeof data[key] === 'string' ? String(data[key]) : undefined);
    return {
      id: String(row.id),
      ownerId: String(row.owner_id),
      name,
      product: {
        name,
        description: text('problem') ?? '',
        feature: text('audience') ?? '',
        provider: row.catalog_key === 'cord' ? 'Flouvia' : name,
        keywords: staticProduct?.keywords,
        offering: text('kind'),
        category: text('category'),
        categories: getSolutionCategories({
          category: text('category') ?? '',
          categories: asList(data.categories),
        }),
        industries: asList(data.industries),
        companySizes: asList(data.companySizes),
        capabilities: asList(data.capabilities),
        integrationKeys: asList(data.integrationKeys),
        compliance: asList(data.compliance),
        priceBand: text('priceBand'),
        setupTime: text('setupTime'),
        scope: text('scope'),
        response: responses.get(String(row.id)) ?? null,
      },
    };
  });
}

export type AlertSummary = {
  id: string;
  criteria: AlertCriteria;
  createdAt: string;
  lastMatchedAt: string | null;
  /** Listings it announced, newest first, still published. */
  matches: { id: string; name: string; matchedAt: string }[];
};

/** The account's own alerts, with the listings each one announced (never baseline ones). */
export async function listAlerts(owner: string): Promise<AlertSummary[]> {
  const sql = authSql();
  const rows = await sql`SELECT a.id::text, a.scope, a.topic, a.query, a.filters,
      a.created_at::text, a.last_matched_at::text,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.published_data->>'name',
          'matchedAt', m.matched_at) ORDER BY m.matched_at DESC)
        FROM (SELECT * FROM search_alert_matches WHERE alert_id = a.id AND NOT baseline
              ORDER BY matched_at DESC LIMIT 6) m
        JOIN founder_solutions s ON s.id = m.solution_id AND s.published_data IS NOT NULL), '[]'::jsonb) AS matches
    FROM search_alerts a WHERE a.owner_id = ${owner} ORDER BY a.created_at DESC`;
  return rows.flatMap(row => {
    const criteria = readAlertCriteria({
      scope: row.scope,
      topic: row.topic ?? undefined,
      query: row.query,
      filters: row.filters,
    });
    if (!criteria) return [];
    return [
      {
        id: String(row.id),
        criteria,
        createdAt: String(row.created_at),
        lastMatchedAt: row.last_matched_at ? String(row.last_matched_at) : null,
        matches: (row.matches as { id: string; name: string; matchedAt: string }[]).map(item => ({
          id: String(item.id),
          name: String(item.name),
          matchedAt: String(item.matchedAt),
        })),
      },
    ];
  });
}

export type CreateAlertResult = { status: 'created' | 'exists'; id: string } | { status: 'limit' };

/**
 * Creates the alert, or returns the one that already exists for the same search. What
 * already matches is stored as seen (baseline): the buyer was looking at it, so only
 * listings that appear or start matching later are announced. Holding the account row
 * serializes the quota against a second tab.
 */
export async function createAlert(
  owner: string,
  criteria: AlertCriteria,
): Promise<CreateAlertResult> {
  const sql = authSql();
  const signature = alertSignature(criteria);
  const label = alertLabel(criteria, 'es', {
    fastResponse: (await getDictionary('es')).catalog.filters.fastResponse,
  });
  const seen = (await alertCandidates())
    .filter(item => item.ownerId !== owner && alertMatches(item.product, criteria))
    .map(item => item.id);
  const id = crypto.randomUUID();
  const [, inserted, , existing] = await sql.transaction([
    sql`SELECT 1 FROM auth_accounts WHERE id = ${owner} FOR UPDATE`,
    sql`INSERT INTO search_alerts (id, owner_id, scope, topic, query, filters, signature, label)
      SELECT ${id}, ${owner}, ${criteria.scope}, ${criteria.topic}, ${criteria.query},
        ${JSON.stringify(criteria.filters)}::jsonb, ${signature}, ${label}
      WHERE (SELECT count(*) FROM search_alerts WHERE owner_id = ${owner}) < ${maxAlertsPerAccount}
      ON CONFLICT (owner_id, signature) DO NOTHING RETURNING id::text`,
    sql`INSERT INTO search_alert_matches (alert_id, solution_id, baseline)
      SELECT ${id}, s.id, true FROM founder_solutions s
       WHERE s.id = ANY(${seen}::uuid[]) AND EXISTS (SELECT 1 FROM search_alerts WHERE id = ${id})
      ON CONFLICT DO NOTHING`,
    sql`SELECT id::text FROM search_alerts WHERE owner_id = ${owner} AND signature = ${signature}`,
  ]);
  if (inserted.length) return { status: 'created', id: String(inserted[0].id) };
  if (existing.length) return { status: 'exists', id: String(existing[0].id) };
  return { status: 'limit' };
}

/** Deletes one of the account's alerts; an email it had queued is not sent. */
export async function deleteAlert(owner: string, id: string) {
  const sql = authSql();
  const [deleted] = await sql.transaction([
    sql`DELETE FROM search_alerts WHERE id = ${id} AND owner_id = ${owner} RETURNING id`,
    sql`UPDATE account_notifications SET email_state = 'skipped'
      WHERE owner_id = ${owner} AND category = 'alert' AND email_state = 'pending'
        AND starts_with(source_key, ${`alert:${id}:`})`,
  ]);
  return deleted.length > 0;
}

/**
 * Matches every alert against the published catalog and records what is new
 * (record_search_alert_matches in db/search-alerts.sql): run right after ops publishes and
 * by the daily mail cron. Idempotent: a listing is announced once per alert.
 */
export async function matchSearchAlerts() {
  const sql = authSql();
  const alerts =
    await sql`SELECT id::text, owner_id::text, scope, topic, query, filters FROM search_alerts
      ORDER BY created_at LIMIT 5000`;
  if (!alerts.length) return { alerts: 0, matched: 0 };
  const [candidates, seenRows] = await Promise.all([
    alertCandidates(),
    sql`SELECT alert_id::text, solution_id::text FROM search_alert_matches
      WHERE alert_id = ANY(${alerts.map(row => String(row.id))}::uuid[])`,
  ]);
  const seen = new Set(seenRows.map(row => `${row.alert_id}:${row.solution_id}`));
  let matched = 0;
  for (const row of alerts) {
    const criteria = readAlertCriteria({
      scope: row.scope,
      topic: row.topic ?? undefined,
      query: row.query,
      filters: row.filters,
    });
    if (!criteria) continue;
    const fresh = candidates
      .filter(
        item =>
          item.ownerId !== String(row.owner_id) &&
          !seen.has(`${row.id}:${item.id}`) &&
          alertMatches(item.product, criteria),
      )
      .map(item => item.id);
    if (!fresh.length) continue;
    const [result] =
      await sql`SELECT record_search_alert_matches(${String(row.id)}, ${fresh}::uuid[]) AS added`;
    matched += Number(result?.added ?? 0);
  }
  return { alerts: alerts.length, matched };
}
