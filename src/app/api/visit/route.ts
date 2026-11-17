import { NextRequest, NextResponse } from 'next/server';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { countFunnel, optedOut } from '@/lib/attribution/server';
import { likelyBot, readFunnel } from '@/lib/attribution/classify';
import { solutionBody } from '@/lib/solutions/http';

/**
 * The visit beacon (SHCWS-109/111, docs/attribution.md): the first page of a visit and the
 * first search, category or /aplicar page, counted per day and channel. Same origin, DNT
 * and GPC respected, no account, address or visitor id stored. Each step arrives at most
 * once per visit; listings and searches carry theirs on beacons they already send.
 */
export async function POST(request: NextRequest) {
  const quiet = (status = 204) => new NextResponse(null, { status });
  if (request.headers.get('origin') !== request.nextUrl.origin) return quiet(403);
  if (optedOut(request.headers)) return quiet();
  try {
    const body = await solutionBody(request);
    if (!readFunnel(body)) return quiet(400);
    if (likelyBot(request.headers.get('user-agent'))) return quiet();
    if (!(await securityLimit('traffic', requestIdentity(request.headers), 120, 3000)))
      return quiet(429);
    await countFunnel(body, request.headers);
    return quiet();
  } catch {
    return quiet(503);
  }
}
