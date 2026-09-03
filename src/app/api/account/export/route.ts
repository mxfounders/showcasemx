import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure } from '@/lib/solutions/http';
export const runtime = 'nodejs';

/**
 * Portability export (LFPDPPP / GDPR): everything this account holds, as JSON.
 *
 * Scope is deliberate. It carries the account's own profile, publications,
 * library, collections and the contact conversations it takes part in — which
 * includes what a buyer chose to send to this account, because that content was
 * shared with it and already appears in its inbox. It never carries another
 * person's private notes, list purposes or password material, and the avatar
 * binary is summarised rather than inlined so the file stays readable.
 */
export async function GET(request: NextRequest) {
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure('Vuelve a iniciar sesión.', 401);
    if (!await securityLimit('account-export', account.id, 5)) return failure('Ya pediste varias copias. Intenta más tarde.', 429);
    const sql = authSql();

    const [profile, solutions, saved, lists, listItems, sent, received, events, notifications, newsletter] = await Promise.all([
      sql`SELECT id::text, email, name, organization, profile, role, dashboard_mode, created_at::text, email_verified_at::text, avatar_data IS NOT NULL AS has_avatar, totp_confirmed_at IS NOT NULL AS two_step_enabled FROM auth_accounts WHERE id = ${account.id}`,
      sql`SELECT id::text, catalog_key, status, step, version, data, published_data, published_at::text, updated_at::text FROM founder_solutions WHERE owner_id = ${account.id} ORDER BY updated_at`,
      sql`SELECT project_key, created_at::text FROM buyer_saved_projects WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, name, purpose, visibility, public_description, curator_name, categories, created_at::text FROM buyer_lists WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT list_id::text, project_key, note, created_at::text FROM buyer_list_items WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, solution_id::text, project_name, details, status, consent_version, consent_at::text, created_at::text FROM contact_requests WHERE buyer_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, solution_id::text, project_name, buyer_email, details, status, created_at::text FROM contact_requests WHERE recipient_id = ${account.id} ORDER BY created_at`,
      sql`SELECT e.request_id::text, e.status, e.message, e.created_at::text FROM contact_events e JOIN contact_requests r ON r.id = e.request_id WHERE r.buyer_id = ${account.id} OR r.recipient_id = ${account.id} ORDER BY e.created_at`,
      sql`SELECT title, href, read_at::text, created_at::text FROM account_notifications WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT email, profile, role, consent_version, created_at::text, unsubscribed_at::text FROM newsletter_subscribers WHERE email = ${account.email}`,
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      about: 'Copia de los datos que shwcs guarda de esta cuenta. No incluye contraseñas, secretos de verificación en dos pasos ni datos privados de otras personas.',
      account: profile[0] ?? null,
      solutions,
      library: { saved, lists, listItems },
      contacts: { sent, received, history: events },
      notifications,
      newsletter: newsletter[0] ?? null,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="shwcs-datos-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return failure('No pudimos preparar tu copia. Intenta de nuevo en unos minutos.', 503);
  }
}
