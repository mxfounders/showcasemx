import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getOpsSession, opsLimit, type OpsUser } from './auth';
import { getDb } from './db';
import { failure, opsBody, sameOrigin } from './http';
import { clientIp } from './net';
import { readUserAgent } from './device';

export type Sql = ReturnType<typeof getDb>;
export type Body = Record<string, unknown>;

export interface OpsContext<P> {
  req: NextRequest;
  url: URL;
  user: OpsUser;
  sql: Sql;
  params: P;
  body: Body;
  ip: string | null;
  userAgent: string | null;
  requestId: string;
}

type Flag = boolean | ((body: Body) => boolean);

export interface OpsRouteOptions {
  /** Restricted to level='admin'. A function decides per request body (e.g. per action). */
  admin?: Flag;
  /** Requires a session elevated with a fresh TOTP code ("modo seguro"). */
  elevated?: Flag;
  /** Per-account rate limit: [scope, per hour, global per minute]. */
  limit?: [scope: string, perHour: number, globalPerMinute?: number];
  /** Defaults to true for every method except GET/HEAD. */
  mutation?: boolean;
}

export const ELEVATION_REQUIRED = 'elevation_required';

function decide(flag: Flag | undefined, body: Body) {
  return typeof flag === 'function' ? flag(body) : Boolean(flag);
}

/**
 * Single entry point for every authenticated ops API route. Order matters and is
 * the same everywhere: origin → session → body → admin → elevation → rate limit.
 * Unexpected errors never leak details: the response carries a short reference
 * that matches the server log line.
 */
export function opsRoute<P = Record<string, string>>(
  options: OpsRouteOptions,
  handler: (ctx: OpsContext<P>) => Promise<Response>,
) {
  return async (req: NextRequest, props: { params: Promise<P> }) => {
    const requestId = randomUUID();
    const mutation = options.mutation ?? !['GET', 'HEAD'].includes(req.method);

    if (mutation && !sameOrigin(req)) return failure('Origen no autorizado.', 403);

    const user = await getOpsSession();
    if (!user) return failure('No autenticado.', 401);

    let body: Body = {};
    if (mutation) {
      const parsed = await opsBody(req);
      if (!parsed) return failure('Datos inválidos.', 400);
      body = parsed;
    }

    if (decide(options.admin, body) && user.level !== 'admin')
      return failure('Requiere permisos de administrador.', 403);

    if (decide(options.elevated, body) && !user.elevated)
      return failure('Confirma tu identidad con tu autenticador para continuar.', 403, {
        code: ELEVATION_REQUIRED,
      });

    try {
      if (options.limit) {
        const [scope, perHour, perMinute = Math.max(perHour * 5, 300)] = options.limit;
        if (!(await opsLimit(scope, user.id, perHour, perMinute)))
          return NextResponse.json(
            { error: 'Demasiadas solicitudes. Espera unos minutos.' },
            { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '600' } },
          );
      }
      const params = (await props.params) ?? ({} as P);
      return await handler({
        req,
        url: new URL(req.url),
        user,
        sql: getDb(),
        params,
        body,
        ip: clientIp(req.headers),
        userAgent: readUserAgent(req.headers),
        requestId,
      });
    } catch (err) {
      console.error(`[ops] ${req.method} ${req.nextUrl.pathname} ref=${requestId}`, err);
      return failure(`Error interno. Referencia ${requestId.slice(0, 8)}.`, 503);
    }
  };
}

/** Reason text required by every mutation the audit log describes. */
export function readReason(body: Body, min = 10, max = 1000): string | null {
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  return reason.length >= min && reason.length <= max ? reason : null;
}
