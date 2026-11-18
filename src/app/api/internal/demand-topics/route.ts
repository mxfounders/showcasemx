import { NextRequest, NextResponse } from 'next/server';
import { authorizedCatalogRevalidate } from '@/lib/catalog-revalidate';
import { solutionsSql } from '@/lib/solutions/server';
import { groupDemandByTopic } from '@/lib/search/demand-topics';

/**
 * Last week's searches that found nothing, grouped by topic, for ops' Necesidades board
 * (SHCWS-60). The grouping needs the catalog's vocabulary, which only this app has, so
 * ops asks here instead of copying it. Server to server with the ops→product credential
 * (CATALOG_REVALIDATE_SECRET); reads only the aggregate search_demand table.
 */
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!authorizedCatalogRevalidate(request.headers.get('authorization')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  try {
    const sql = solutionsSql();
    const [table] = await sql`SELECT to_regclass('search_demand') IS NOT NULL AS ok`;
    if (!table?.ok) return NextResponse.json({ available: false }, { headers });
    const rows = await sql`SELECT query,sum(searches)::int AS searches,sum(empty)::int AS empty
      FROM search_demand WHERE day>current_date-7 GROUP BY query HAVING sum(empty)>0
      ORDER BY sum(empty) DESC,query LIMIT 200`;
    const topics = groupDemandByTopic(
      rows.map(row => ({
        query: String(row.query),
        searches: Number(row.searches),
        empty: Number(row.empty),
      })),
    );
    return NextResponse.json({ available: true, topics }, { headers });
  } catch {
    return NextResponse.json({ error: 'Unavailable' }, { status: 503, headers });
  }
}
