import { opsRoute } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';
import { solutionSlugCandidates } from '@/lib/slug';

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

// Self-review is deliberately allowed (CLAUDE.md §51): only the account holder
// decides what happens to their own listing, and the sole ops admin owns Cord.
// Every decision is still attributed by actor_id in solution_events and written
// to the audit log in the same statement as the change itself.
export const POST = opsRoute({ limit: ['review', 120, 600] }, async ({ body, user, sql, ip }) => {
  const { solutionId, action, message, version } = body;
  if (!isUuid(solutionId)) return failure('ID inválido.', 400);
  if (typeof action !== 'string' || !(action in ALLOWED_FROM))
    return failure('Acción inválida.', 400);
  if (typeof message !== 'string' || message.trim().length < 5 || message.length > 2000)
    return failure('El mensaje debe tener 5-2000 caracteres.', 400);
  if (typeof version !== 'number' || !Number.isSafeInteger(version))
    return failure('Versión requerida.', 400);

  const text = message.trim();
  const isPublishing = action === 'publish';
  const isWithdrawing = action === 'withdraw';

  // The first approval names the public page after the listing (SHCWS-101): /soluciones/cord.
  // The name is read at the version being approved, so it is the one that gets published.
  // A listing keeps its slug through updates, withdrawals and republishing; only an admin
  // changes it (POST /api/solutions/slug), and the old one keeps redirecting.
  let candidates: string[] = [];
  if (isPublishing) {
    const [current] = await sql`
      SELECT slug, data->>'name' AS name FROM founder_solutions
      WHERE id = ${solutionId} AND version = ${version}`;
    if (current && !current.slug) candidates = solutionSlugCandidates(String(current.name ?? ''));
  }

  const decide = () => sql`
    WITH free AS (
      -- The first candidate no other listing uses now or used before (old slugs keep
      -- redirecting to their own listing). With all of them taken the slug stays empty
      -- and the page keeps working by UUID.
      SELECT c.slug FROM unnest(${candidates}::text[]) WITH ORDINALITY AS c(slug, n)
      WHERE NOT EXISTS (SELECT 1 FROM founder_solutions f WHERE f.slug = c.slug AND f.id <> ${solutionId})
        AND NOT EXISTS (SELECT 1 FROM solution_slug_history h WHERE h.slug = c.slug AND h.solution_id <> ${solutionId})
      ORDER BY c.n LIMIT 1
    ), changed AS (
      UPDATE founder_solutions SET
        slug = CASE WHEN ${isPublishing} THEN COALESCE(slug, (SELECT slug FROM free)) ELSE slug END,
        status = ${NEW_STATUS[action]},
        version = version + 1,
        updated_at = now(),
        published_at = CASE WHEN ${isPublishing} THEN now() WHEN ${isWithdrawing} THEN NULL ELSE published_at END,
        -- otherCategory is the founder's private «¿no ves tu categoría?» note for the
        -- team: it never travels into what the public pages read.
        published_data = CASE WHEN ${isPublishing} THEN data - 'otherCategory' WHEN ${isWithdrawing} THEN NULL ELSE published_data END
      WHERE id = ${solutionId} AND version = ${version} AND status = ANY(${ALLOWED_FROM[action]}::text[])
      RETURNING id, status, version, slug
    ), event AS (
      INSERT INTO solution_events (solution_id, status, message, actor_id)
      SELECT id, status, ${text}, ${user.id} FROM changed
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, ${'solution_' + action}, 'solution', id::text, left(${text}, 1000),
        jsonb_build_object('fromVersion', ${version}::int, 'toStatus', status)
          || CASE WHEN ${isPublishing} THEN jsonb_build_object('slug', slug) ELSE '{}'::jsonb END, ${ip}
      FROM changed
    )
    SELECT * FROM changed
  `;
  // Two listings with the same name approved at the same instant can pick the same slug;
  // the unique index stops the second, which tries again and takes the next free one.
  let rows: Awaited<ReturnType<typeof decide>> = [];
  for (let attempt = 1; ; attempt++) {
    try {
      rows = await decide();
      break;
    } catch (err) {
      if (attempt >= 3 || !isUniqueViolation(err)) throw err;
    }
  }
  if (!rows.length)
    return failure(
      'La postulación cambió o no admite esta acción. Recarga e intenta de nuevo.',
      409,
    );

  // Only publish/withdraw change what the catalog reads.
  if (isPublishing || isWithdrawing) await triggerCatalogRevalidate();

  return ok({
    newStatus: String(rows[0].status),
    version: Number(rows[0].version),
    slug: rows[0].slug ? String(rows[0].slug) : null,
  });
});

function isUniqueViolation(err: unknown) {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === '23505';
}
