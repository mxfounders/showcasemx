import { after } from 'next/server';
import { opsRoute, readReason } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { OPS_ENROLL_SECONDS } from '@/lib/auth';
import { sendSecurityAlert } from '@/lib/mail';
import { teamMembers } from '@/lib/data/team';

export const runtime = 'nodejs';

export const GET = opsRoute({ admin: true }, async () => ok({ items: await teamMembers() }));

const ACTIONS = [
  'add',
  'remove',
  'disable',
  'enable',
  'set_level',
  'reset_totp',
  'revoke_sessions',
  'renew_enrollment',
] as const;
type TeamAction = (typeof ACTIONS)[number];

const ALERTS: Partial<Record<TeamAction, { subject: string; summary: string }>> = {
  add: {
    subject: 'Te dieron acceso a ops',
    summary:
      'Ahora puedes entrar a ops.shwcs.site con tu cuenta de shwcs. Configura tu autenticador en los próximos 3 días.',
  },
  remove: {
    subject: 'Se retiró tu acceso a ops',
    summary: 'Tu cuenta ya no tiene acceso al backoffice de shwcs.',
  },
  disable: {
    subject: 'Tu acceso a ops se desactivó',
    summary: 'Tu acceso al backoffice quedó desactivado y tus sesiones se cerraron.',
  },
  set_level: {
    subject: 'Cambió tu nivel en ops',
    summary: 'Un administrador cambió tus permisos en el backoffice.',
  },
  reset_totp: {
    subject: 'Se reinició tu autenticador de ops',
    summary:
      'Un administrador reinició tu verificación en dos pasos. Configúrala de nuevo en tu próximo acceso.',
  },
};

export const POST = opsRoute(
  { admin: true, elevated: true, limit: ['team', 40, 200] },
  async ({ body, user, sql, ip }) => {
    const action =
      typeof body.action === 'string' && (ACTIONS as readonly string[]).includes(body.action)
        ? (body.action as TeamAction)
        : null;
    if (!action) return failure('Acción inválida.', 400);
    const reason = readReason(body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);

    let targetId: string;
    let targetEmail: string;
    let message: string | undefined;

    if (action === 'add') {
      const email =
        typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
      if (!email) return failure('Correo requerido.', 400);
      const [target] =
        await sql`SELECT id, email, suspended_at FROM auth_accounts WHERE email = ${email} LIMIT 1`;
      if (!target)
        return failure(
          'No existe una cuenta de shwcs con ese correo. Primero debe registrarse.',
          404,
        );
      if (target.suspended_at) return failure('Esa cuenta está suspendida.', 409);
      targetId = String(target.id);
      targetEmail = String(target.email);
      const [row] = await sql`
      WITH upserted AS (
        INSERT INTO solution_reviewers (account_id, level, granted_by, enroll_by)
        VALUES (${targetId}, 'reviewer', ${user.id}, now() + ${OPS_ENROLL_SECONDS} * interval '1 second')
        ON CONFLICT (account_id) DO UPDATE SET
          disabled_at = NULL,
          granted_by = EXCLUDED.granted_by,
          enroll_by = CASE WHEN solution_reviewers.totp_confirmed_at IS NULL THEN EXCLUDED.enroll_by ELSE solution_reviewers.enroll_by END
        RETURNING account_id, (xmax = 0) AS inserted
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, 'team_add', 'account', account_id::text, ${reason},
          jsonb_build_object('email', ${targetEmail}::text, 'inserted', inserted), ${ip} FROM upserted
      )
      SELECT inserted FROM upserted
    `;
      message = row?.inserted
        ? `${targetEmail} ahora es revisor. Tiene 3 días para configurar su autenticador.`
        : `${targetEmail} recuperó su acceso a ops.`;
    } else {
      if (!isUuid(body.accountId)) return failure('Cuenta requerida.', 400);
      targetId = body.accountId;
      const [target] = await sql`
      SELECT a.email, r.level, r.disabled_at, r.totp_confirmed_at
      FROM solution_reviewers r JOIN auth_accounts a ON a.id = r.account_id WHERE r.account_id = ${targetId}
    `;
      if (!target) return failure('Ese miembro no existe.', 404);
      targetEmail = String(target.email);
      const self = targetId === user.id;

      if (self && (action === 'reset_totp' || action === 'revoke_sessions'))
        return failure('Hazlo desde Seguridad o pide a otro administrador.', 422);

      const audit = (name: string, metadata: Record<string, unknown> = {}) =>
        sql`
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        VALUES (${user.id}, ${user.email}, ${name}, 'account', ${targetId}, ${reason},
          ${JSON.stringify({ email: targetEmail, ...metadata })}::jsonb, ${ip})
      `;

      if (action === 'remove' || action === 'disable' || action === 'set_level') {
        const level =
          action === 'set_level'
            ? body.level === 'admin'
              ? 'admin'
              : body.level === 'reviewer'
                ? 'reviewer'
                : null
            : null;
        if (action === 'set_level' && !level) return failure('Nivel inválido.', 400);
        if (action === 'set_level' && level === target.level)
          return failure('Ya tiene ese nivel.', 409);
        const demotesAdmin =
          target.level === 'admin' &&
          !target.disabled_at &&
          (action !== 'set_level' || level === 'reviewer');

        const guarded =
          action === 'remove'
            ? sql`
              DELETE FROM solution_reviewers WHERE account_id = ${targetId}
                AND (NOT ${demotesAdmin} OR (SELECT count(*) FROM solution_reviewers WHERE level = 'admin' AND disabled_at IS NULL) > 1)
              RETURNING account_id
            `
            : action === 'disable'
              ? sql`
                UPDATE solution_reviewers SET disabled_at = now() WHERE account_id = ${targetId} AND disabled_at IS NULL
                  AND (NOT ${demotesAdmin} OR (SELECT count(*) FROM solution_reviewers WHERE level = 'admin' AND disabled_at IS NULL) > 1)
                RETURNING account_id
              `
              : sql`
                UPDATE solution_reviewers SET level = ${level} WHERE account_id = ${targetId}
                  AND (NOT ${demotesAdmin} OR (SELECT count(*) FROM solution_reviewers WHERE level = 'admin' AND disabled_at IS NULL) > 1)
                RETURNING account_id
              `;
        // The admin-count guard runs under one advisory lock so two admins demoting
        // each other at the same moment cannot leave the team without an admin.
        const results = await sql.transaction([
          sql`SELECT pg_advisory_xact_lock(hashtext('ops_team_admins'))`,
          guarded,
          sql`
          DELETE FROM ops_sessions WHERE account_id = ${targetId}
            AND ${action !== 'set_level'}
            AND NOT EXISTS (SELECT 1 FROM solution_reviewers WHERE account_id = ${targetId} AND disabled_at IS NULL)
        `,
        ]);
        if (!results[1].length) {
          if (action === 'disable' && target.disabled_at)
            return failure('Ya estaba desactivado.', 409);
          return failure('No puedes quitar al último administrador.', 422);
        }
        await audit(`team_${action}`, level ? { level } : {}).catch(err =>
          console.error('[ops/team] audit', err),
        );
        message =
          action === 'set_level'
            ? `${targetEmail} ahora es ${level === 'admin' ? 'administrador' : 'revisor'}.`
            : action === 'disable'
              ? `${targetEmail} quedó desactivado y sus sesiones se cerraron.`
              : `${targetEmail} ya no tiene acceso a ops.`;
      } else if (action === 'enable') {
        const rows = await sql.transaction([
          sql`
          UPDATE solution_reviewers SET disabled_at = NULL,
            enroll_by = CASE WHEN totp_confirmed_at IS NULL THEN now() + ${OPS_ENROLL_SECONDS} * interval '1 second' ELSE enroll_by END
          WHERE account_id = ${targetId} AND disabled_at IS NOT NULL RETURNING account_id
        `,
          audit('team_enable'),
        ]);
        if (!rows[0].length) return failure('Ya estaba activo.', 409);
        message = `${targetEmail} recuperó su acceso.`;
      } else if (action === 'reset_totp') {
        await sql.transaction([
          sql`
          UPDATE solution_reviewers SET totp_secret = NULL, totp_confirmed_at = NULL, totp_last_step = NULL,
            backup_codes = '{}', enroll_by = now() + ${OPS_ENROLL_SECONDS} * interval '1 second'
          WHERE account_id = ${targetId}
        `,
          sql`DELETE FROM ops_sessions WHERE account_id = ${targetId}`,
          sql`DELETE FROM ops_login_challenges WHERE account_id = ${targetId}`,
          audit('team_reset_totp'),
        ]);
        message = 'Deberá configurar su autenticador de nuevo en los próximos 3 días.';
      } else if (action === 'revoke_sessions') {
        const [revoked] = await sql.transaction([
          sql`DELETE FROM ops_sessions WHERE account_id = ${targetId} RETURNING token_hash`,
          audit('team_revoke_sessions'),
        ]);
        message = `Se cerraron ${revoked.length} sesiones de ops.`;
      } else {
        // renew_enrollment
        if (target.totp_confirmed_at) return failure('Ya configuró su autenticador.', 409);
        await sql.transaction([
          sql`UPDATE solution_reviewers SET enroll_by = now() + ${OPS_ENROLL_SECONDS} * interval '1 second' WHERE account_id = ${targetId}`,
          audit('team_renew_enrollment'),
        ]);
        message = 'Tiene 3 días más para configurar su autenticador.';
      }
    }

    const alert = ALERTS[action];
    if (alert && targetId !== user.id) {
      after(() =>
        sendSecurityAlert(targetEmail, alert.subject, alert.summary, { actor: user.email }).then(
          () => undefined,
        ),
      );
    }
    return ok({ message });
  },
);
