import { NextRequest, NextResponse, after } from 'next/server';
import { readOutageReport } from '@/lib/ads/outage-report';
import { processOutages, recordOutage } from '@/lib/ads/outages';
import { stripeClient } from '@/lib/ads/stripe';
import { authorizedOutageReport } from '@/lib/outage-webhook';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Where a monitor outside Vercel reports an outage once the site is back (SHCWS-179): an
 * uptime service's recovery webhook or .github/workflows/uptime-probe.yml. The daily cron
 * cannot do this: it runs on the same deployment that went down. Body: see
 * src/lib/ads/outage-report.ts. The window is stored and, right after the response, every
 * booked day it left unserved for four hours or more is made good or refunded.
 */
export async function POST(request: NextRequest) {
  if (!authorizedOutageReport(request.headers.get('authorization'))) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 8192) return json({ error: 'Body too large' }, 413);
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 8192) return json({ error: 'Body too large' }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const read = readOutageReport(body);
  if (!read.ok) return json({ error: read.error }, 400);
  if ('ignored' in read) return json({ ignored: true }, 202);

  try {
    const stored = await recordOutage(read.report);
    if (stored.pending) {
      after(() =>
        processOutages(stripeClient()).catch(error =>
          console.error('[outages] processing failed; the daily cron retries', error),
        ),
      );
    }
    return json({
      id: stored.id,
      startedAt: read.report.startedAt.toISOString(),
      endedAt: read.report.endedAt.toISOString(),
      queued: stored.pending,
    });
  } catch {
    return json({ error: 'Unavailable' }, 503);
  }
}
