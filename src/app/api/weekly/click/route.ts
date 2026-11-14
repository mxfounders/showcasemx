import { NextRequest, NextResponse } from 'next/server';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';

/**
 * Counted link in the weekly summary (SHCWS-21): adds one to that week's aggregate click
 * count (never who clicked) and redirects inside the site. Only paths under /es or /en
 * are accepted, so this can never redirect elsewhere; a week without a sent summary is
 * not counted.
 */
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to') ?? '';
  const week = request.nextUrl.searchParams.get('w') ?? '';
  const target = /^\/(es|en)(\/[A-Za-z0-9\-_/]*)?$/.test(to) ? to : '/es/account';
  try {
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(week) &&
      (await securityLimit('weekly-click', requestIdentity(request.headers), 60, 600))
    )
      await authSql()`UPDATE weekly_digest_stats SET clicks = clicks + 1 WHERE week = ${week}::date AND sent > 0`;
  } catch {
    // Counting never blocks the way in.
  }
  return NextResponse.redirect(new URL(target, request.nextUrl.origin), {
    status: 303,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
