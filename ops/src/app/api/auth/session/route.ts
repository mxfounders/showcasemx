import { opsRoute } from '@/lib/api';
import { peekOpsSession, type OpsUser } from '@/lib/auth';
import { failure, ok } from '@/lib/http';

export const runtime = 'nodejs';

function snapshot(user: OpsUser) {
  return {
    serverNow: new Date().toISOString(),
    idleExpiresAt: user.idleExpiresAt,
    expiresAt: user.expiresAt,
    elevatedUntil: user.elevatedUntil,
  };
}

/** Status polling: deliberately does NOT count as activity. */
export async function GET() {
  const user = await peekOpsSession();
  if (!user) return failure('No autenticado.', 401);
  return ok({ session: snapshot(user) });
}

/** "Seguir conectado": the wrapper's session lookup already extended the idle window. */
export const POST = opsRoute({}, async ({ user }) => ok({ session: snapshot(user) }));
