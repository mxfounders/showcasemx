import { opsRoute, readReason } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';
import { SLUG_ERROR, checkSlugInput } from '@/lib/slug';

export const runtime = 'nodejs';

/**
 * Renames a listing's public address, /soluciones/<slug> (SHCWS-101). Admins only: it
 * changes a URL people may have shared or put on their site. The old slug moves to
 * solution_slug_history (db/solution-slugs.sql) and keeps redirecting with a 301, so
 * nothing already shared breaks.
 *
 * A slug another listing uses now, or used before, is refused: old links must keep
 * leading to the listing they were made for. One statement writes the change, the audit
 * entry (old → new) and, for a published listing, the owner's notice.
 */
export const POST = opsRoute<{ id: string }>(
  { admin: true, limit: ['solution-slug', 60, 300] },
  async ({ params, body, user, sql, ip }) => {
    if (!isUuid(params.id)) return failure('ID inválido.', 400);
    const check = checkSlugInput(body.slug);
    if (!check.ok) return failure(SLUG_ERROR[check.error], 400);
    const reason = readReason(body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
    const slug = check.slug;

    const [state] = await sql`
      SELECT EXISTS (SELECT 1 FROM founder_solutions WHERE id = ${params.id}) AS found,
        (SELECT id::text FROM founder_solutions WHERE slug = ${slug}) AS current_id,
        (SELECT solution_id::text FROM solution_slug_history WHERE slug = ${slug}) AS retired_id`;
    if (!state.found) return failure('No existe esa ficha.', 404);
    if (state.current_id === params.id) return failure('La ficha ya usa esa dirección.', 409);
    if (state.current_id) return failure('Esa dirección ya la usa otra ficha.', 409);
    if (state.retired_id && state.retired_id !== params.id)
      return failure('Esa dirección la usó otra ficha y sigue llevando a ella.', 409);

    let rows: Record<string, unknown>[];
    try {
      rows = await sql`
        WITH changed AS (
          UPDATE founder_solutions s SET slug = ${slug}
          FROM founder_solutions prev
          WHERE s.id = ${params.id} AND prev.id = s.id AND s.slug IS DISTINCT FROM ${slug}
            AND NOT EXISTS (SELECT 1 FROM solution_slug_history h WHERE h.slug = ${slug} AND h.solution_id <> s.id)
          RETURNING s.id, s.owner_id, s.published_data IS NOT NULL AS published,
            COALESCE(s.published_data->>'name', s.data->>'name', '') AS name, prev.slug AS previous
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'solution_slug_change', 'solution', id::text, ${reason},
            jsonb_build_object('from', previous, 'to', ${slug}::text), ${ip} FROM changed
        ), noticed AS (
          -- Category 'account' like a renamed list signature (SHCWS-162): it is about the
          -- owner's own public page, whatever their listing-email preference.
          INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
          SELECT owner_id, 'account', 'solution-slug:' || id::text || ':' || gen_random_uuid()::text,
            left('El equipo de shwcs cambió la dirección de tu ficha «' || left(name, 60) || '» a /soluciones/'
              || ${slug}::text || '. La anterior sigue llevando a ella', 180),
            '/account/solutions/' || id::text, 'pending'
          FROM changed WHERE published
        )
        SELECT id, previous FROM changed`;
    } catch (err) {
      // Another listing took it between the check and the write.
      if ((err as { code?: unknown })?.code === '23505')
        return failure('Esa dirección ya la usa otra ficha.', 409);
      throw err;
    }
    if (!rows.length)
      return failure('La dirección cambió mientras la editabas. Recarga e intenta de nuevo.', 409);

    // Cards and the sitemap name the new slug; the product's routing picks it up within a minute.
    await triggerCatalogRevalidate();
    return ok({ slug, previous: rows[0].previous ? String(rows[0].previous) : null });
  },
);
