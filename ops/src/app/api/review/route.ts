import { NextResponse } from 'next/server';
import { getOpsSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_FROM: Record<string, string[]> = {
  publish: ['pending', 'changes_requested'],
  reject: ['pending', 'changes_requested'],
  changes_requested: ['pending'],
  withdraw: ['published'],
};

const NEW_STATUS: Record<string, string> = {
  publish: 'published',
  reject: 'rejected',
  changes_requested: 'changes_requested',
  withdraw: 'rejected',
};

export async function POST(req: Request) {
  const user = await getOpsSession();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const { solutionId, action, message, version } = body;

  if (!UUID_RE.test(String(solutionId ?? ''))) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  if (!Object.keys(ALLOWED_FROM).includes(String(action ?? ''))) return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
  if (typeof message !== 'string' || message.trim().length < 5 || message.length > 2000)
    return NextResponse.json({ error: 'El mensaje debe tener 5-2000 caracteres.' }, { status: 400 });
  if (typeof version !== 'number') return NextResponse.json({ error: 'Versión requerida.' }, { status: 400 });

  try {
    const sql = getDb();

    const rows = await sql`
      SELECT id, owner_id, status, version FROM founder_solutions WHERE id = ${String(solutionId)} FOR UPDATE LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ error: 'Postulación no encontrada.' }, { status: 404 });
    const sol = rows[0];

    if (String(sol.owner_id) === user.id) return NextResponse.json({ error: 'No puedes revisar tu propia postulación.' }, { status: 403 });
    if (Number(sol.version) !== version) return NextResponse.json({ error: 'Versión desactualizada. Recarga e intenta de nuevo.' }, { status: 409 });
    if (!ALLOWED_FROM[String(action)]?.includes(String(sol.status)))
      return NextResponse.json({ error: `No se puede "${action}" desde estado "${sol.status}".` }, { status: 422 });

    const targetStatus = NEW_STATUS[String(action)];
    const isPublishing = action === 'publish';
    const publishPart = isPublishing ? sql`, published_data = data, published_at = now()` : sql``;

    await sql.transaction([
      sql`UPDATE founder_solutions SET status=${targetStatus}, version=version+1, updated_at=now() ${publishPart} WHERE id=${String(solutionId)} AND version=${version}`,
      sql`INSERT INTO solution_events (solution_id, status, message) VALUES (${String(solutionId)}, ${targetStatus}, ${message.trim()})`,
    ]);

    return NextResponse.json({ ok: true, newStatus: targetStatus }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/review]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 503 });
  }
}
