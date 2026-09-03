import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid, sameOrigin, opsLimit, requestIdentity, audit, requestIp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure, opsBody } from '@/lib/http';

export const runtime = 'nodejs';
const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const onlyPending = url.searchParams.get('pending') === '1';

  try {
    const sql = getDb();
    const offset = (page - 1) * PAGE_SIZE;
    const rows = await sql`
      SELECT id, reason, name, email, organization, role, website, message, urgency,
        email_state, handled_at, handled_by, created_at
      FROM contact_inquiries
      WHERE (${onlyPending}::boolean = false OR handled_at IS NULL)
      ORDER BY created_at DESC
      LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
    `;
    const hasMore = rows.length > PAGE_SIZE;
    return NextResponse.json({
      ok: true, hasMore, page,
      items: rows.slice(0, PAGE_SIZE).map(r => ({
        id: String(r.id), reason: String(r.reason), name: String(r.name), email: String(r.email),
        organization: String(r.organization), role: r.role ?? null, website: r.website ?? null,
        message: String(r.message), urgency: String(r.urgency), emailState: String(r.email_state),
        handledAt: r.handled_at ? String(r.handled_at) : null,
        createdAt: String(r.created_at),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/inquiries]', err);
    return failure('Error interno.', 503);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);
  if (!(await opsLimit('inquiries', requestIdentity(req.headers), 100, 500))) return failure('Demasiados cambios. Intenta más tarde.', 429);

  const body = await opsBody(req);
  if (!isUuid(body?.id)) return failure('ID inválido.', 400);

  try {
    const sql = getDb();
    const rows = await sql`
      UPDATE contact_inquiries SET handled_at = now(), handled_by = ${user.id}
      WHERE id = ${body.id} AND handled_at IS NULL
      RETURNING id
    `;
    if (!rows.length) return failure('Ya estaba marcado como atendido.', 409);
    await audit({ actorId: user.id, actorEmail: user.email, action: 'inquiry_handled', subjectType: 'inquiry', subjectId: String(body.id), ip: requestIp(req.headers) });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/inquiries]', err);
    return failure('Error interno.', 503);
  }
}
