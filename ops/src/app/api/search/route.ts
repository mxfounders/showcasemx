import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 200);
  if (q.length < 2) return NextResponse.json({ ok: true, results: [] }, { headers: { 'Cache-Control': 'no-store' } });

  try {
    const sql = getDb();
    const like = '%' + q.toLowerCase() + '%';

    const [accounts, solutions] = await sql.transaction([
      sql`SELECT id, email, name FROM auth_accounts WHERE lower(email) LIKE ${like} OR lower(COALESCE(name, '')) LIKE ${like} ORDER BY created_at DESC LIMIT 8`,
      sql`SELECT id, status, data->>'name' AS name FROM founder_solutions WHERE lower(COALESCE(data->>'name', '')) LIKE ${like} ORDER BY updated_at DESC LIMIT 8`,
    ]);

    const results = [
      ...accounts.map(a => ({
        type: 'account' as const, id: String(a.id), label: a.name ? String(a.name) : String(a.email),
        sublabel: String(a.email), href: `/panel/cuentas?account=${a.id}`,
      })),
      ...solutions.map(s => ({
        type: 'solution' as const, id: String(s.id), label: s.name ?? '(sin nombre)',
        sublabel: String(s.status), href: `/panel/postulaciones?solution=${s.id}`,
      })),
    ];

    return NextResponse.json({ ok: true, results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/search]', err);
    return failure('Error interno.', 503);
  }
}
