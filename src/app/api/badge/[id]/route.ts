import { NextRequest, NextResponse } from 'next/server';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { getRecognition } from '@/lib/recognition/server';
import { badgeOptions } from '@/lib/recognition/badges';
import { badgeSvg } from '@/lib/recognition/badge';
import { getDictionary } from '@/i18n/get-dictionary';

export const runtime = 'nodejs';

/**
 * The embeddable badge a founder puts on their own site (docs/recognition.md).
 *
 *   /api/badge/<solution>?kind=featured|verified|award&award=<id>&layout=card|seal
 *     &theme=light|dark&lang=es|en
 *
 * Only published listings have one. A verification or award that is no longer standing
 * falls back to «Publicado en shwcs» instead of breaking the image on someone's site,
 * and the short cache makes a withdrawal show within the hour. Nothing about who loads
 * the image is recorded.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const search = request.nextUrl.searchParams;
  const theme = search.get('theme') === 'dark' ? 'dark' : 'light';
  const layout = search.get('layout') === 'seal' ? 'seal' : 'card';
  const locale = search.get('lang') === 'en' ? 'en' : 'es';
  const kind = search.get('kind');
  const awardId = search.get('award');
  if (!isSolutionId(id)) return notFound();
  try {
    const sql = solutionsSql();
    const [row] =
      await sql`SELECT published_data->>'name' AS name, published_data->>'website' AS website
      FROM founder_solutions WHERE id = ${id} AND published_data IS NOT NULL`;
    if (!row) return notFound();
    const [recognition, dictionary] = await Promise.all([
      getRecognition(id, String(row.website ?? '')),
      getDictionary(locale),
    ]);
    const options = badgeOptions(String(row.name), recognition, locale, dictionary.recognition);
    const option =
      (kind === 'verified' && options.find(item => item.variant === 'verified')) ||
      (kind === 'award' && awardId && options.find(item => item.key === awardId)) ||
      options[0];
    return new NextResponse(badgeSvg({ ...option, theme, layout }), {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=600',
        // An SVG opened directly is a document: nothing in it may run or load.
        'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

function notFound() {
  return new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
