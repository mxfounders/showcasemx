import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid, sameOrigin, opsLimit, requestIdentity, audit, requestIp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure, opsBody } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT n.id, n.category, n.title, n.email_state, n.attempts, n.next_attempt_at, n.created_at,
        a.email AS owner_email
      FROM account_notifications n
      JOIN auth_accounts a ON a.id = n.owner_id
      WHERE n.email_state IN ('pending', 'sending', 'failed')
      ORDER BY n.email_state = 'failed' DESC, n.created_at DESC
      LIMIT 200
    `;
    return NextResponse.json({
      ok: true,
      items: rows.map(r => ({
        id: String(r.id), category: String(r.category), title: String(r.title),
        emailState: String(r.email_state), attempts: Number(r.attempts),
        nextAttemptAt: String(r.next_attempt_at), createdAt: String(r.created_at),
        ownerEmail: String(r.owner_email),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/mail]', err);
    return failure('Error interno.', 503);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);
  if (!(await opsLimit('mail-retry', requestIdentity(req.headers), 60, 300))) return failure('Demasiados cambios. Intenta más tarde.', 429);

  const body = await opsBody(req);
  if (body?.action !== 'retry' || !isUuid(body?.id)) return failure('Solicitud inválida.', 400);

  try {
    const sql = getDb();
    const rows = await sql`
      UPDATE account_notifications SET attempts = 0, next_attempt_at = now(), email_state = 'pending', locked_at = NULL
      WHERE id = ${body.id} AND email_state IN ('failed', 'pending')
      RETURNING id
    `;
    if (!rows.length) return failure('No se pudo reintentar este aviso.', 409);
    await audit({ actorId: user.id, actorEmail: user.email, action: 'mail_retry', subjectType: 'notification', subjectId: String(body.id), ip: requestIp(req.headers) });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/mail]', err);
    return failure('Error interno.', 503);
  }
}
