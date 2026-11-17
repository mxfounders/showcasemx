import { NextRequest, NextResponse } from 'next/server';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';
import { demandQuery, demandSurfaces, type DemandSurface } from '@/lib/search/demand';
import { solutionBody } from '@/lib/solutions/http';

/**
 * Aggregate search demand (SHCWS-107), like the listing metrics: same origin, DNT/GPC
 * respected, no account, address or visitor id stored, one counter row per day.
 */
export async function POST(request: NextRequest) {
  const quiet = (status = 204) => new NextResponse(null, { status });
  if (request.headers.get('origin') !== request.nextUrl.origin) return quiet(403);
  if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1') return quiet();
  try {
    const body = await solutionBody(request);
    const query = demandQuery(body?.query);
    const surface = demandSurfaces.includes(body?.surface as DemandSurface)
      ? (body?.surface as DemandSurface)
      : null;
    const event = body?.event === 'click' ? 'click' : body?.event === 'search' ? 'search' : null;
    const results = Number(body?.results);
    if (!query || !surface || !event || (event === 'search' && !Number.isInteger(results)))
      return quiet(400);
    if (!(await securityLimit('search-demand', requestIdentity(request.headers), 300, 6000)))
      return quiet(429);
    const sql = authSql();
    if (event === 'search')
      await sql`INSERT INTO search_demand (day, query, surface, searches, empty)
        VALUES (current_date, ${query}, ${surface}, 1, ${results === 0 ? 1 : 0})
        ON CONFLICT (day, query, surface) DO UPDATE SET
          searches = search_demand.searches + 1, empty = search_demand.empty + EXCLUDED.empty`;
    else
      await sql`UPDATE search_demand SET clicks = clicks + 1
        WHERE day = current_date AND query = ${query} AND surface = ${surface}`;
    return quiet();
  } catch {
    return quiet(503);
  }
}
