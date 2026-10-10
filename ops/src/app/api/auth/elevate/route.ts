import { opsRoute } from '@/lib/api';
import { audit } from '@/lib/audit';
import { consumeTotp, opsLimit, OPS_ELEVATION_SECONDS, sessionCookieOptions } from '@/lib/auth';
import { failure, iso, ok } from '@/lib/http';
import { deviceLabel } from '@/lib/device';

export const runtime = 'nodejs';

/** Failed codes tolerated on one account per hour before its session is closed. */
const MAX_FAILURES = 5;

// "Modo seguro": a fresh TOTP code unlocks critical actions on this session for
// OPS_ELEVATION_SECONDS. A stolen session cookie alone can browse but cannot
// suspend accounts, change the team or export data.
export const POST = opsRoute(
  { limit: ['elevate', 30, 300] },
  async ({ user, body, sql, ip, userAgent }) => {
    const code = typeof body.code === 'string' ? body.code.replace(/[\s-]/g, '') : '';
    const outcome = await consumeTotp(user.id, code);

    if (outcome !== 'ok') {
      await audit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'elevation_failed',
        subjectType: 'session',
        subjectId: user.sessionId.slice(0, 12),
        metadata: { outcome, device: deviceLabel(userAgent) },
        ip,
      });
      if (!(await opsLimit('elevate-fail', user.id, MAX_FAILURES, 1000))) {
        await sql`DELETE FROM ops_sessions WHERE token_hash = ${user.sessionId}`;
        await audit({
          actorId: user.id,
          actorEmail: user.email,
          action: 'session_revoked_failed_elevation',
          subjectType: 'session',
          subjectId: user.sessionId.slice(0, 12),
          ip,
        });
        const res = failure(
          'Demasiados códigos incorrectos. Por seguridad cerramos tu sesión.',
          401,
          {
            code: 'session_revoked',
          },
        );
        res.cookies.set({ ...sessionCookieOptions(0), value: '' });
        return res;
      }
      if (outcome === 'not_enrolled') return failure('Tu cuenta no tiene autenticador.', 409);
      return failure(
        outcome === 'replay'
          ? 'Ese código ya se usó. Espera a que tu app muestre el siguiente.'
          : 'Código incorrecto.',
        422,
      );
    }

    const rows = await sql`
    UPDATE ops_sessions SET elevated_until = now() + ${OPS_ELEVATION_SECONDS} * interval '1 second'
    WHERE token_hash = ${user.sessionId}
    RETURNING elevated_until
  `;
    await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'elevation_granted',
      subjectType: 'session',
      subjectId: user.sessionId.slice(0, 12),
      metadata: { minutes: OPS_ELEVATION_SECONDS / 60, device: deviceLabel(userAgent) },
      ip,
    });
    return ok({ elevatedUntil: iso(rows[0]?.elevated_until) });
  },
);

export const DELETE = opsRoute({}, async ({ user, sql }) => {
  await sql`UPDATE ops_sessions SET elevated_until = NULL WHERE token_hash = ${user.sessionId}`;
  return ok({ elevatedUntil: null });
});
