import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid, sameOrigin, opsLimit, requestIdentity, audit, requestIp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure, opsBody } from '@/lib/http';

export const runtime = 'nodejs';

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
  withdraw: 'changes_requested',
};

export async function POST(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);
  if (!(await opsLimit('review', requestIdentity(req.headers), 60, 400))) return failure('Demasiados cambios. Intenta más tarde.', 429);

  const body = await opsBody(req);
  const solutionId = body?.solutionId;
  const action = body?.action;
  const message = body?.message;
  const version = body?.version;

  if (!isUuid(solutionId)) return failure('ID inválido.', 400);
  if (typeof action !== 'string' || !Object.keys(ALLOWED_FROM).includes(action)) return failure('Acción inválida.', 400);
  if (typeof message !== 'string' || message.trim().length < 5 || message.length > 2000) {
    return failure('El mensaje debe tener 5-2000 caracteres.', 400);
  }
  if (typeof version !== 'number' || !Number.isSafeInteger(version)) return failure('Versión requerida.', 400);

  try {
    const sql = getDb();
    const isPublishing = action === 'publish';
    const isWithdrawing = action === 'withdraw';
    const targetStatus = NEW_STATUS[action];
    const allowedStatuses = ALLOWED_FROM[action];

    const result = await sql.transaction([
      sql`SELECT id FROM founder_solutions WHERE id = ${solutionId} FOR UPDATE`,
      sql`WITH changed AS (
        UPDATE founder_solutions SET
          status = ${targetStatus},
          version = version + 1,
          updated_at = now(),
          published_at = CASE WHEN ${isPublishing} THEN now() WHEN ${isWithdrawing} THEN NULL ELSE published_at END,
          published_data = CASE WHEN ${isPublishing} THEN data WHEN ${isWithdrawing} THEN NULL ELSE published_data END
        WHERE id = ${solutionId} AND owner_id <> ${user.id} AND version = ${version}
          AND status = ANY(${allowedStatuses}::text[])
        RETURNING id, status, version
      ), event AS (
        INSERT INTO solution_events (solution_id, status, message, actor_id)
        SELECT id, status, ${message.trim()}, ${user.id} FROM changed
      )
      SELECT * FROM changed`,
    ]);

    const rows = result[1];
    if (!rows.length) return failure('La postulación cambió, no admite esta acción, o es tuya. Recarga e intenta de nuevo.', 409);

    await audit({
      actorId: user.id, actorEmail: user.email, action: `solution_${action}`,
      subjectType: 'solution', subjectId: solutionId, reason: message.trim(), ip: requestIp(req.headers),
    });

    return NextResponse.json({ ok: true, newStatus: String(rows[0].status) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/review]', err);
    return failure('Error interno.', 503);
  }
}
