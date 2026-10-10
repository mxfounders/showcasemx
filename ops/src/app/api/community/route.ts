import { opsRoute, readReason } from '@/lib/api';
import { failure, intParam, isUuid, ok, textParam } from '@/lib/http';
import { communityOverview } from '@/lib/data/community';

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
  { limit: ['community-moderate', 120, 600] },
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
