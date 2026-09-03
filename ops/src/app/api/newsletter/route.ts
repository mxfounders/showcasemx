import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const includeUnsubscribed = url.searchParams.get('all') === '1';

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT email, consent_version, profile, role, created_at, unsubscribed_at
      FROM newsletter_subscribers
      WHERE (${includeUnsubscribed}::boolean = true OR unsubscribed_at IS NULL)
      ORDER BY created_at DESC
      LIMIT 5000
    `;
    const active = rows.filter(r => !r.unsubscribed_at).length;
    return NextResponse.json({
      ok: true,
      total: rows.length,
      active,
      items: rows.map(r => ({
        email: String(r.email), consentVersion: String(r.consent_version),
        profile: r.profile ?? null, role: r.role ?? null,
        createdAt: String(r.created_at), unsubscribedAt: r.unsubscribed_at ? String(r.unsubscribed_at) : null,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/newsletter]', err);
    return failure('Error interno.', 503);
  }
}
