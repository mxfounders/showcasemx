import { opsRoute, readReason } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { HANDLE_ERROR, checkHandle } from '@/lib/profiles';

export const runtime = 'nodejs';

const settings = '/account/settings/profile#perfil-publico';

/**
 * Moderation of public profiles (SHCWS-120, db/public-profiles.sql). Every change, its
 * audit entry and the owner's notice land in one statement, or none does.
 *
 * - `hide` takes a profile off the site with a reason the owner reads in Settings; their
 *   listings and lists stay where they are. `unhide` puts it back (still only if on).
 * - `force_handle` (admins) renames a handle that impersonates someone or misleads. The
 *   old handle is blocked: it does not redirect and nobody can take it again.
 *
 * Ops never edits the name, bio or links: hiding is the tool for those.
 */
export const POST = opsRoute(
  {
    admin: body => body.action === 'force_handle',
    limit: ['profile-moderate', 120, 600],
  },
  async ({ body, user, sql, ip }) => {
    const reason = readReason(body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
    const id = body.accountId;
    if (!isUuid(id)) return failure('ID inválido.', 400);

    if (body.action === 'hide') {
      const rows = await sql`
        WITH changed AS (
          UPDATE public_profiles SET hidden_at = now(), hidden_reason = left(${reason}, 500),
            hidden_by = ${user.id}, version = version + 1, updated_at = now()
          WHERE account_id = ${id} AND hidden_at IS NULL RETURNING account_id, handle
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'profile_hide', 'account', account_id::text, ${reason},
            jsonb_build_object('handle', handle), ${ip} FROM changed
        ), noticed AS (
          INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
          SELECT account_id, 'account', 'profile-hidden:' || account_id::text || ':' || gen_random_uuid()::text,
            'El equipo de shwcs ocultó tu perfil público. El motivo está en Ajustes.', ${settings}, 'pending'
          FROM changed
        )
        SELECT handle FROM changed
      `;
      if (!rows.length) {
        const [profile] = await sql`SELECT hidden_at FROM public_profiles WHERE account_id = ${id}`;
        return profile
          ? failure('El perfil ya estaba oculto.', 409)
          : failure('Esta cuenta no tiene perfil.', 404);
      }
      return ok({ message: 'Nadie puede verlo; el dueño ve el motivo en Ajustes.' });
    }

    if (body.action === 'unhide') {
      const rows = await sql`
        WITH changed AS (
          UPDATE public_profiles SET hidden_at = NULL, hidden_reason = NULL, hidden_by = NULL,
            version = version + 1, updated_at = now()
          WHERE account_id = ${id} AND hidden_at IS NOT NULL RETURNING account_id, handle, active
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'profile_unhide', 'account', account_id::text, ${reason},
            jsonb_build_object('handle', handle), ${ip} FROM changed
        ), noticed AS (
          INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
          SELECT account_id, 'account', 'profile-unhidden:' || account_id::text || ':' || gen_random_uuid()::text,
            'El equipo de shwcs volvió a mostrar tu perfil público.', ${settings}, 'pending'
          FROM changed
        )
        SELECT handle, active FROM changed
      `;
      if (!rows.length) return failure('El perfil no estaba oculto.', 409);
      return ok({
        message: rows[0].active
          ? 'El perfil vuelve a verse.'
          : 'Ya no está oculto, pero su dueño lo tiene apagado.',
      });
    }

    if (body.action === 'force_handle') {
      const next = checkHandle(body.handle);
      if (!next.ok) return failure(HANDLE_ERROR[next.error], 400);
      const [current] = await sql`SELECT handle FROM public_profiles WHERE account_id = ${id}`;
      if (!current) return failure('Esta cuenta no tiene perfil.', 404);
      const previous = String(current.handle);
      if (previous === next.handle) return failure('El perfil ya usa ese enlace.', 409);
      // Both handles locked for the transaction, like the product does when someone renames
      // their own: nobody can take either one in between.
      const locks = [previous, next.handle]
        .sort()
        .map(handle => sql`SELECT pg_advisory_xact_lock(hashtext(${'profile-handle:' + handle}))`);
      try {
        const results = await sql.transaction([
          ...locks,
          sql`
            WITH changed AS (
              UPDATE public_profiles p SET handle = ${next.handle}, version = p.version + 1, updated_at = now()
              WHERE p.account_id = ${id} AND p.handle = ${previous}
                AND NOT EXISTS (SELECT 1 FROM profile_handle_history h WHERE h.handle = ${next.handle} AND h.account_id <> ${id})
                AND NOT EXISTS (SELECT 1 FROM profile_handle_blocks b WHERE b.handle = ${next.handle})
              RETURNING p.account_id
            ), blocked AS (
              INSERT INTO profile_handle_blocks (handle, reason, blocked_by)
              SELECT ${previous}, left(${reason}, 500), ${user.id} FROM changed
              ON CONFLICT (handle) DO NOTHING
            ), released AS (
              DELETE FROM profile_handle_history WHERE handle = ${next.handle} AND account_id = ${id}
                AND EXISTS (SELECT 1 FROM changed)
            ), logged AS (
              INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
              SELECT ${user.id}, ${user.email}, 'profile_force_handle', 'account', account_id::text, ${reason},
                jsonb_build_object('from', ${previous}::text, 'to', ${next.handle}::text), ${ip} FROM changed
            ), noticed AS (
              INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
              SELECT account_id, 'account', 'profile-handle:' || account_id::text || ':' || gen_random_uuid()::text,
                left('El equipo de shwcs cambió el enlace de tu perfil público a /c/' || ${next.handle}::text, 180),
                ${settings}, 'pending'
              FROM changed
            )
            SELECT account_id FROM changed
          `,
        ]);
        if (!(results.at(-1) as unknown[]).length)
          return failure('Ese enlace ya lo usa o lo usó otra cuenta, o está bloqueado.', 409);
      } catch (error) {
        if ((error as { code?: string })?.code === '23505')
          return failure('Ese enlace ya lo usa otra cuenta.', 409);
        throw error;
      }
      return ok({
        message: `Ahora es /c/${next.handle}. /c/${previous} queda bloqueado: no redirige ni se puede volver a usar.`,
      });
    }

    return failure('Acción inválida.', 400);
  },
);
