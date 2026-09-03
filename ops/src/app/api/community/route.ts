import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid, sameOrigin, opsLimit, requestIdentity, audit, requestIp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure, opsBody } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 200);

  try {
    const sql = getDb();
    const qLike = q ? '%' + q.toLowerCase() + '%' : null;

    const lists = await sql`
      SELECT
        l.id, l.name, l.public_description, l.curator_name, l.categories, l.updated_at,
        a.email AS owner_email,
        (SELECT count(*)::int FROM community_list_likes WHERE list_id = l.id) AS like_count,
        (SELECT count(*)::int FROM community_saved_lists WHERE list_id = l.id) AS save_count,
        (SELECT count(*)::int FROM community_list_comments WHERE list_id = l.id) AS comment_count
      FROM buyer_lists l
      JOIN auth_accounts a ON a.id = l.owner_id
      WHERE l.visibility = 'public'
        AND (${qLike}::text IS NULL OR lower(l.name) LIKE ${qLike} OR lower(l.curator_name) LIKE ${qLike})
      ORDER BY l.updated_at DESC
      LIMIT 100
    `;

    const comments = await sql`
      SELECT c.id, c.list_id, c.author_name, c.body, c.created_at, l.name AS list_name
      FROM community_list_comments c
      JOIN buyer_lists l ON l.id = c.list_id AND l.visibility = 'public'
      ORDER BY c.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      ok: true,
      lists: lists.map(l => ({
        id: String(l.id), name: String(l.name), publicDescription: l.public_description ?? '',
        curatorName: l.curator_name ?? '', categories: Array.isArray(l.categories) ? l.categories : [],
        updatedAt: String(l.updated_at), ownerEmail: String(l.owner_email),
        likeCount: Number(l.like_count), saveCount: Number(l.save_count), commentCount: Number(l.comment_count),
      })),
      comments: comments.map(c => ({
        id: String(c.id), listId: String(c.list_id), listName: String(c.list_name),
        authorName: String(c.author_name), body: String(c.body), createdAt: String(c.created_at),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/community]', err);
    return failure('Error interno.', 503);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);
  if (!(await opsLimit('community-moderate', requestIdentity(req.headers), 60, 300))) return failure('Demasiados cambios. Intenta más tarde.', 429);

  const body = await opsBody(req);
  const action = body?.action;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 10 || reason.length > 1000) return failure('Explica el motivo (mínimo 10 caracteres).', 400);

  try {
    const sql = getDb();

    if (action === 'unpublish_list') {
      if (!isUuid(body?.listId)) return failure('ID inválido.', 400);
      const rows = await sql`UPDATE buyer_lists SET visibility = 'private', updated_at = now() WHERE id = ${body.listId} AND visibility = 'public' RETURNING id`;
      if (!rows.length) return failure('La lista ya no es pública.', 409);
      await audit({ actorId: user.id, actorEmail: user.email, action: 'community_unpublish_list', subjectType: 'list', subjectId: String(body.listId), reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'delete_comment') {
      if (!isUuid(body?.commentId)) return failure('ID inválido.', 400);
      const rows = await sql`DELETE FROM community_list_comments WHERE id = ${body.commentId} RETURNING id`;
      if (!rows.length) return failure('El comentario ya no existe.', 404);
      await audit({ actorId: user.id, actorEmail: user.email, action: 'community_delete_comment', subjectType: 'comment', subjectId: String(body.commentId), reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return failure('Acción inválida.', 400);
  } catch (err) {
    console.error('[ops/community]', err);
    return failure('Error interno.', 503);
  }
}
