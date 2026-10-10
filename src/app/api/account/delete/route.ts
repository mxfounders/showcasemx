import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie, cookieOptions } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { deleteObjects } from '@/lib/storage/blob';
import { cancelAccountBookings } from '@/lib/ads/account';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { i18n } from '@/i18n/config';
export const runtime = 'nodejs';

// The typed word is the one the form shows in its language (settings.data.delete.confirmWord).
// Either language's word is accepted, so switching language mid-flow never blocks a deletion.
async function confirmWords() {
  const dictionaries = await Promise.all(i18n.locales.map(locale => getDictionary(locale)));
  return dictionaries.map(dictionary => dictionary.settings.data.delete.confirmWord);
}

/**
 * Permanent account deletion (right to erasure).
 *
 * Guarded by the current password plus a typed confirmation, because the effect
 * reaches beyond this account: every foreign key to `auth_accounts` cascades, so
 * published fichas disappear from the catalogue and contact conversations are
 * removed for the other participant too. The interface states that before asking.
 *
 * There is no soft delete and no recovery window. If a retention policy is ever
 * decided, it has to be built here rather than assumed. Image bytes in object
 * storage are removed inline on a best-effort basis right after the cascade
 * commits; the AFTER DELETE orphan triggers plus the daily sweep are the
 * guaranteed backstop within one cycle.
 */
export async function POST(request: NextRequest) {
  const dictionary = await getDictionary(requestLocale(request));
  const t = dictionary.settings.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.useAccountForm, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signInAgain, 401);
    const body = await solutionBody(request);
    if (typeof body?.password !== 'string' || body.password.length > 4096)
      return failure(t.deletePasswordMissing, 400);
    if (!(await confirmWords()).includes(String(body.confirm)))
      return failure(
        t.deleteConfirmMissing.replace('{word}', dictionary.settings.data.delete.confirmWord),
        400,
      );
    if (!(await securityLimit('account-delete', account.id, 5)))
      return failure(t.tooManyAttempts, 429);

    const sql = authSql();
    const [row] = await sql`SELECT password_hash FROM auth_accounts WHERE id = ${account.id}`;
    if (!row) return failure(t.signInAgain, 401);
    if (!(await verifyPassword(body.password, String(row.password_hash))))
      return failure(t.wrongPassword, 400);

    // Sponsored bookings are cancelled and refunded first; the account stays if a refund fails.
    if (!(await cancelAccountBookings(account.id))) return failure(t.deleteBookingsPending, 503);

    // Collect this account's blob keys before the cascade removes the rows.
    const keyRows = await sql`
      SELECT m.storage_key AS key FROM solution_media m JOIN founder_solutions fs ON fs.id = m.solution_id WHERE fs.owner_id = ${account.id} AND m.storage_key IS NOT NULL
      UNION
      SELECT f.storage_key AS key FROM solution_media_files f JOIN solution_media m ON m.id = f.media_id JOIN founder_solutions fs ON fs.id = m.solution_id WHERE fs.owner_id = ${account.id}
      UNION
      SELECT i.storage_key AS key FROM solution_site_images i JOIN founder_solutions fs ON fs.id = i.solution_id WHERE fs.owner_id = ${account.id} AND i.storage_key IS NOT NULL
      UNION
      SELECT avatar_key AS key FROM auth_accounts WHERE id = ${account.id} AND avatar_key IS NOT NULL`;

    // Matching the hash again makes a concurrent password change abort the delete.
    const deleted =
      await sql`DELETE FROM auth_accounts WHERE id = ${account.id} AND password_hash = ${row.password_hash} RETURNING id`;
    if (!deleted.length) return failure(t.accessChanged, 409);

    // Inline, best-effort: honours the no-retention-window promise. The triggers
    // already enqueued the same keys, so a failure here just defers to the sweep.
    try {
      await deleteObjects(
        keyRows.map(r => String(r.key)),
        AbortSignal.timeout(3_000),
      );
    } catch {
      /* sweep backstop */
    }

    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return failure(t.deleteUnavailable, 503);
  }
}
