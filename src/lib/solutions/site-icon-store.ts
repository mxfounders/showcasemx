import { randomUUID, createHash } from 'node:crypto';
import { solutionsSql } from './server';
import { safeSolutionUrl } from './model';
import { fetchSiteIconOnly } from './site-image';
import type { SiteIcon } from './site-icon';
import { putObject, storageEnabled } from '@/lib/storage/blob';
import { siteIconKey } from '@/lib/storage/keys';

type Sql = ReturnType<typeof solutionsSql>;

/**
 * Keeps the site's logo (SHCWS-177) and says whether the listing has one now. Best-effort:
 * nothing here throws. A read that finds no logo keeps the previous one, unless the listing
 * now points at another site, whose logo it is not. The same bytes as the stored logo only
 * touch `fetched_at`: no new blob, no orphan, and the public URL (versioned by checksum)
 * stays the same, so browsers and the CDN keep their copy.
 */
export async function storeSiteIcon(
  sql: Sql,
  solutionId: string,
  website: string,
  icon: SiteIcon | null | undefined,
): Promise<{ hasIcon: boolean; changed: boolean }> {
  try {
    if (!icon) {
      const removed =
        await sql`DELETE FROM solution_site_icons WHERE solution_id = ${solutionId} AND source_url <> ${website} RETURNING 1`;
      const [kept] = await sql`SELECT 1 FROM solution_site_icons WHERE solution_id = ${solutionId}`;
      return { hasIcon: Boolean(kept), changed: removed.length > 0 };
    }
    const checksum = createHash('sha256').update(icon.buffer).digest('hex');
    const same =
      await sql`UPDATE solution_site_icons SET fetched_at = now(), icon_url = ${icon.iconUrl}
        WHERE solution_id = ${solutionId} AND source_url = ${website} AND checksum = ${checksum} RETURNING 1`;
    if (same.length) return { hasIcon: true, changed: false };
    // A fresh key per new logo: the UPSERT changes storage_key and the trigger orphans the
    // previous blob (same rule as the cover).
    const key = siteIconKey(solutionId, randomUUID());
    await putObject(key, icon.buffer);
    try {
      await sql`INSERT INTO solution_site_icons (solution_id, source_url, icon_url, storage_key, bytes, checksum, size, fetched_at)
        VALUES (${solutionId}, ${website}, ${icon.iconUrl}, ${key}, ${icon.buffer.length}, ${checksum}, ${icon.size}, now())
        ON CONFLICT (solution_id) DO UPDATE SET source_url = EXCLUDED.source_url, icon_url = EXCLUDED.icon_url,
          storage_key = EXCLUDED.storage_key, bytes = EXCLUDED.bytes, checksum = EXCLUDED.checksum,
          size = EXCLUDED.size, fetched_at = now()`;
      return { hasIcon: true, changed: true };
    } catch {
      try {
        await sql`INSERT INTO storage_orphans(key) VALUES(${key}) ON CONFLICT(key) DO NOTHING`;
      } catch {}
      return { hasIcon: false, changed: false };
    }
  } catch {
    return { hasIcon: false, changed: false };
  }
}

/**
 * Reads again the logo of published listings whose logo is missing or older than
 * `staleHours`, oldest first, so a project that changes its favicon shows the new one
 * without anyone asking (decided by André, 18 Nov 2026). Runs from the daily monitor cron
 * and after each publish decision in ops. Bounded by `limit` and a time budget; a site that
 * does not answer keeps its previous logo and is tried again on the next run.
 */
export async function refreshSiteIcons({
  limit = 30,
  staleHours = 20,
  budgetMs = 90_000,
  only,
}: {
  limit?: number;
  staleHours?: number;
  budgetMs?: number;
  /** Restrict to these listings (a script or a test); every published listing by default. */
  only?: string[];
} = {}) {
  const summary = { checked: 0, changed: 0, unreachable: 0 };
  if (!storageEnabled()) return summary;
  const sql = solutionsSql();
  const rows = await sql`SELECT s.id::text AS id, s.published_data->>'website' AS website
    FROM founder_solutions s LEFT JOIN solution_site_icons i ON i.solution_id = s.id
    WHERE s.published_data IS NOT NULL
      AND (i.fetched_at IS NULL OR i.fetched_at < now() - make_interval(hours => ${staleHours}))
      AND (${only ?? null}::uuid[] IS NULL OR s.id = ANY(${only ?? null}::uuid[]))
    ORDER BY i.fetched_at NULLS FIRST, s.id
    LIMIT ${limit}`;
  const deadline = Date.now() + budgetMs;
  for (const row of rows) {
    if (Date.now() > deadline) break;
    const website = safeSolutionUrl(String(row.website ?? ''));
    if (!website) continue;
    summary.checked += 1;
    const icon = await fetchSiteIconOnly(website).catch(() => 'unreachable' as const);
    if (icon === 'unreachable') {
      summary.unreachable += 1;
      continue;
    }
    const stored = await storeSiteIcon(sql, String(row.id), website, icon);
    if (stored.changed) summary.changed += 1;
  }
  return summary;
}
