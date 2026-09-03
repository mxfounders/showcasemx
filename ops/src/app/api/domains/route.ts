import { NextResponse } from 'next/server';
import { requireOpsApi } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT
        p.solution_id, p.domain, p.expires_at, p.verified_at,
        COALESCE(s.published_data->>'name', s.data->>'name') AS solution_name,
        a.email AS owner_email
      FROM solution_domain_proofs p
      JOIN founder_solutions s ON s.id = p.solution_id
      JOIN auth_accounts a ON a.id = p.owner_id
      ORDER BY p.verified_at IS NULL DESC, p.expires_at DESC
      LIMIT 200
    `;
    return NextResponse.json({
      ok: true,
      items: rows.map(r => ({
        solutionId: String(r.solution_id), domain: String(r.domain),
        expiresAt: String(r.expires_at), verifiedAt: r.verified_at ? String(r.verified_at) : null,
        solutionName: r.solution_name ?? '(sin nombre)', ownerEmail: String(r.owner_email),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/domains]', err);
    return failure('Error interno.', 503);
  }
}
