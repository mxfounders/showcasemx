import { Resolver } from 'node:dns/promises';
import { authSql } from '@/lib/auth/security';
import { verificationDomain } from './domain';

/** A TXT proof lasts this long after each check (src/app/api/solutions/[id]/domain). */
export const domainProofDays = 90;
/** How long before expiry the daily job checks again and, if needed, warns the founder. */
export const domainWarningDays = 14;

/** The record the founder published, exactly as the manual check compares it. */
export function txtMatches(records: readonly (readonly string[])[], token: string): boolean {
  return records.some(record => record.join('') === `showcasemx-verification=${token}`);
}

/** «La verificación del dominio de Cord vence el 28 de noviembre»: stored in Spanish, like
 * every other notice title (CLAUDE.md §63). */
export function domainExpiringTitle(name: string, expiresAt: Date): string {
  const day = expiresAt.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Mexico_City',
  });
  return `La verificación del dominio de ${name} vence el ${day}`.slice(0, 180);
}

type Lookup = (name: string) => Promise<string[][]>;

function defaultLookup(): Lookup {
  const resolver = new Resolver({ timeout: 2000, tries: 1 });
  return name => resolver.resolveTxt(name);
}

/**
 * Daily, from the monitor cron (SHCWS-134). A domain proof is control of the host, not a
 * legal identity, and it lapses after 90 days. Two weeks before that:
 *
 * - if the TXT record is still there, the proof renews by itself for another 90 days, the
 *   same as pressing «Comprobar» again;
 * - if it is gone, or the listing moved to another site, the founder gets one notice per
 *   expiry date (in the account and, with listing emails on, by email through the
 *   existing notice outbox, `listing_notice` in db/listing-notices.sql).
 *
 * Never throws for one domain; a failed lookup simply counts as «not found» and warns.
 */
export async function renewDomainProofs({
  limit = 25,
  lookup = defaultLookup(),
}: { limit?: number; lookup?: Lookup } = {}) {
  const sql = authSql();
  const due = await sql`SELECT p.solution_id,p.owner_id,p.domain,p.token,p.expires_at,
      s.published_data->>'website' AS website,s.published_data->>'name' AS name
    FROM solution_domain_proofs p
    JOIN founder_solutions s ON s.id=p.solution_id AND s.owner_id=p.owner_id
    WHERE p.verified_at IS NOT NULL AND s.published_data IS NOT NULL
      AND p.expires_at>now() AND p.expires_at<now()+make_interval(days=>${domainWarningDays})
    ORDER BY p.expires_at LIMIT ${limit}`;
  let renewed = 0;
  let warned = 0;
  for (const row of due) {
    const solution = String(row.solution_id);
    const domain = String(row.domain);
    // A proof for a host the listing no longer points at means nothing for it: no renewal.
    if (verificationDomain(row.website) === domain) {
      const records = await lookup(`_showcasemx.${domain}`).catch(() => []);
      if (txtMatches(records, String(row.token))) {
        const updated = await sql`UPDATE solution_domain_proofs
          SET verified_at=now(),expires_at=now()+make_interval(days=>${domainProofDays})
          WHERE solution_id=${solution} AND owner_id=${row.owner_id} AND token=${row.token}
            AND domain=${domain} AND verified_at IS NOT NULL
          RETURNING solution_id`;
        if (updated.length) {
          renewed++;
          continue;
        }
      }
    }
    const expiresAt = new Date(String(row.expires_at));
    try {
      await sql`SELECT listing_notice(${row.owner_id}::uuid,
        ${`domain-expiring:${solution}:${expiresAt.toISOString().slice(0, 10)}`},
        ${domainExpiringTitle(String(row.name), expiresAt)},
        ${`/account/solutions/${solution}/trust`})`;
      warned++;
    } catch {
      // An environment without db/listing-notices.sql: the Inicio task still shows it.
    }
  }
  return { status: 'ok' as const, due: due.length, renewed, warned };
}
