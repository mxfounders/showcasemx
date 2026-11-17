import { opsRoute, readReason } from '@/lib/api';
import { failure, intParam, isUuid, ok, textParam } from '@/lib/http';
import { communityOverview } from '@/lib/data/community';
import { CURATOR_ERROR, checkCuratorName } from '@/lib/community';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const data = await communityOverview(textParam(url, 'q'), intParam(url, 'page', 1, 1, 10000));
  return ok({
    page: data.page,
    lists: data.lists.items,
    comments: data.listComments.items,
    solutionComments: data.solutionComments.items,
    hasMore: {
      lists: data.lists.hasMore,
      comments: data.listComments.hasMore,
      solutionComments: data.solutionComments.hasMore,
    },
    stats: data.stats,
  });
});

export const POST = opsRoute(
  {
    // Rewriting what an owner signed is heavier than hiding it: admins only (SHCWS-162).
    admin: body => body.action === 'rename_curator',
    limit: ['community-moderate', 120, 600],
  },
  async ({ body, user, sql, ip }) => {
    const reason = readReason(body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);

    if (body.action === 'unpublish_list') {
      if (!isUuid(body.listId)) return failure('ID inválido.', 400);
      const rows = await sql`
      WITH changed AS (
        UPDATE buyer_lists SET visibility = 'private', updated_at = now()
        WHERE id = ${body.listId} AND visibility = 'public' RETURNING id, name
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, 'community_unpublish_list', 'list', id::text, ${reason},
          jsonb_build_object('name', name), ${ip} FROM changed
      )
      SELECT id FROM changed
    `;
      if (!rows.length) return failure('La lista ya no es pública.', 409);
      return ok({});
    }

    if (body.action === 'rename_curator') {
      if (!isUuid(body.listId)) return failure('ID inválido.', 400);
      const curator = checkCuratorName(body.curatorName);
      if (!curator.ok) return failure(CURATOR_ERROR[curator.error], 400);
      // One statement: the new signature, the audit entry (old → new) and the owner's
      // notice land together or not at all. version moves so an edit form the owner
      // left open gets a conflict instead of writing the old signature back. The
      // notice is category 'account' (db/security-notices.sql): it does not depend on
      // the owner's listing-email preference, it is about their own public content.
      const rows = await sql`
      WITH changed AS (
        UPDATE buyer_lists l SET curator_name = ${curator.name}, version = l.version + 1, updated_at = now()
        FROM buyer_lists prev
        WHERE l.id = ${body.listId} AND prev.id = l.id AND l.visibility = 'public'
          AND l.curator_name IS DISTINCT FROM ${curator.name}
        RETURNING l.id, l.name, l.owner_id, prev.curator_name AS previous
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, 'community_rename_curator', 'list', id::text, ${reason},
          jsonb_build_object('name', name, 'from', previous, 'to', ${curator.name}::text), ${ip} FROM changed
      ), noticed AS (
        INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
        SELECT owner_id, 'account', 'list-curator:' || id::text || ':' || gen_random_uuid()::text,
          left('El equipo de shwcs cambió la firma de tu lista «' || left(name, 60) || '» a «' || ${curator.name}::text || '»', 180),
          '/account/lists/' || id::text, 'pending'
        FROM changed
      )
      SELECT id FROM changed
    `;
      if (!rows.length) {
        const [list] =
          await sql`SELECT visibility, curator_name FROM buyer_lists WHERE id = ${body.listId}`;
        if (!list) return failure('La lista ya no existe.', 404);
        if (list.visibility !== 'public') return failure('La lista ya no es pública.', 409);
        return failure('La lista ya firma así.', 409);
      }
      return ok({});
    }

    if (body.action === 'delete_comment' || body.action === 'delete_solution_comment') {
      if (!isUuid(body.commentId)) return failure('ID inválido.', 400);
      const onSolution = body.action === 'delete_solution_comment';
      // The comment text is copied into the audit metadata: once deleted it would
      // otherwise be impossible to review what was removed and why.
      const rows = onSolution
        ? await sql`
          WITH gone AS (DELETE FROM solution_comments WHERE id = ${body.commentId} RETURNING id, solution_id, author_name, body),
          logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'solution_delete_comment', 'comment', id::text, ${reason},
              jsonb_build_object('solutionId', solution_id::text, 'author', author_name, 'body', left(body, 500)), ${ip} FROM gone
          )
          SELECT id FROM gone
        `
        : await sql`
          WITH gone AS (DELETE FROM community_list_comments WHERE id = ${body.commentId} RETURNING id, list_id, author_name, body),
          logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'community_delete_comment', 'comment', id::text, ${reason},
              jsonb_build_object('listId', list_id::text, 'author', author_name, 'body', left(body, 500)), ${ip} FROM gone
          )
          SELECT id FROM gone
        `;
      if (!rows.length) return failure('El comentario ya no existe.', 404);
      return ok({});
    }

    return failure('Acción inválida.', 400);
  },
);
