import { NextResponse } from 'next/server';
import { getOpsSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getOpsSession();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { id } = await props.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

  try {
    const sql = getDb();

    const rows = await sql`
      SELECT
        fs.id, fs.status, fs.version, fs.step, fs.data, fs.published_data,
        fs.created_at, fs.updated_at,
        a.id AS owner_id, a.email AS owner_email, a.created_at AS owner_created_at,
        a.email_verified_at AS owner_verified_at
      FROM founder_solutions fs
      JOIN auth_accounts a ON a.id = fs.owner_id
      WHERE fs.id = ${id}
      LIMIT 1
    `;

    if (!rows.length) return NextResponse.json({ error: 'No encontrada.' }, { status: 404 });
    const s = rows[0];

    const events = await sql`
      SELECT id, status, message, created_at
      FROM solution_events WHERE solution_id = ${id}
      ORDER BY created_at ASC
    `;

    const mediaCount = await sql`
      SELECT count(*)::int AS n FROM solution_media WHERE solution_id = ${id}
    `;

    return NextResponse.json({
      ok: true,
      solution: {
        id: String(s.id), status: String(s.status), version: Number(s.version),
        step: Number(s.step), createdAt: String(s.created_at), updatedAt: String(s.updated_at),
        data: s.data ?? {}, publishedData: s.published_data ?? null,
        ownerEmail: String(s.owner_email), ownerId: String(s.owner_id),
        ownerCreatedAt: String(s.owner_created_at),
        ownerVerifiedAt: s.owner_verified_at ? String(s.owner_verified_at) : null,
      },
      events: events.map(e => ({
        id: String(e.id), status: String(e.status),
        message: String(e.message), createdAt: String(e.created_at),
      })),
      screenshotCount: Number(mediaCount[0]?.n ?? 0),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/solution]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 503 });
  }
}
