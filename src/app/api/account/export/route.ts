import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure } from '@/lib/solutions/http';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';

/**
 * Portability export (LFPDPPP / GDPR): everything this account holds, as JSON.
 *
 * Scope is deliberate. It carries the account's own profile, publications,
 * library, collections, what it published in public (reviews and comments) and the
 * contact conversations it takes part in — which
 * includes what a buyer chose to send to this account, because that content was
 * shared with it and already appears in its inbox. It never carries another
 * person's private notes, list purposes or password material, and the avatar
 * binary is summarised rather than inlined so the file stays readable.
 */
export async function GET(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).settings;
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.errors.signInAgain, 401);
    if (!(await securityLimit('account-export', account.id, 5)))
      return failure(t.errors.exportLimit, 429);
    const sql = authSql();

    const [
      profile,
      solutions,
      saved,
      lists,
      listItems,
      sent,
      received,
      events,
      notifications,
      newsletter,
      billingProfile,
      bookings,
      billingDocuments,
      reviews,
      solutionComments,
      listComments,
      taxIdentities,
      reviewProofs,
    ] = await Promise.all([
      sql`SELECT id::text, email, name, organization, profile, role, dashboard_mode, created_at::text, email_verified_at::text, (avatar_key IS NOT NULL OR avatar_data IS NOT NULL) AS has_avatar, totp_confirmed_at IS NOT NULL AS two_step_enabled FROM auth_accounts WHERE id = ${account.id}`,
      sql`SELECT id::text, catalog_key, status, step, version, data, published_data, published_at::text, updated_at::text FROM founder_solutions WHERE owner_id = ${account.id} ORDER BY updated_at`,
      sql`SELECT project_key, created_at::text FROM buyer_saved_projects WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, name, purpose, visibility, public_description, curator_name, categories, created_at::text FROM buyer_lists WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT list_id::text, project_key, note, created_at::text FROM buyer_list_items WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, solution_id::text, project_name, details, status, consent_version, consent_at::text, created_at::text FROM contact_requests WHERE buyer_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, solution_id::text, project_name, buyer_email, details, status, created_at::text FROM contact_requests WHERE recipient_id = ${account.id} ORDER BY created_at`,
      sql`SELECT e.request_id::text, e.status, e.message, e.created_at::text FROM contact_events e JOIN contact_requests r ON r.id = e.request_id WHERE r.buyer_id = ${account.id} OR r.recipient_id = ${account.id} ORDER BY e.created_at`,
      sql`SELECT title, href, read_at::text, created_at::text FROM account_notifications WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT email, profile, role, consent_version, created_at::text, unsubscribed_at::text FROM newsletter_subscribers WHERE email = ${account.email}`,
      sql`SELECT country_code, legal_name, tax_id, tax_regime, postal_code, cfdi_use, invoice_email, updated_at::text FROM billing_profiles WHERE account_id = ${account.id}`,
      sql`SELECT id::text, solution_id::text, solution_name, placement, scope, starts_on::text, ends_on::text, currency, subtotal_amount, tax_amount, total_amount, refunded_amount, status, terms_version, terms_accepted_at::text, served_until::text, canceled_at::text, paid_at::text, created_at::text FROM ad_campaigns WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT d.campaign_id::text, d.kind, d.amount, d.currency, d.status, d.folio_fiscal, d.document_number, d.issued_at::text, d.created_at::text FROM billing_documents d JOIN ad_campaigns c ON c.id = d.campaign_id WHERE c.owner_id = ${account.id} ORDER BY d.created_at`,
      sql`SELECT id::text, solution_id::text, author_name, rating, recommends, headline, use_case, pros, cons, usage_duration, company_size, country, status, hidden_reason, reply, reply_at::text, created_at::text, updated_at::text FROM solution_reviews WHERE author_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, solution_id::text, author_name, body, created_at::text FROM solution_comments WHERE author_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, list_id::text, author_name, body, created_at::text FROM community_list_comments WHERE author_id = ${account.id} ORDER BY created_at`,
      sql`SELECT t.solution_id::text, t.country, t.tax_id, t.updated_at::text FROM solution_tax_identities t JOIN founder_solutions s ON s.id = t.solution_id WHERE s.owner_id = ${account.id}`,
      sql`SELECT p.review_id::text, p.method, p.checked_at::text FROM solution_review_proofs p JOIN solution_reviews r ON r.id = p.review_id WHERE r.author_id = ${account.id}`,
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      about: t.exportAbout,
      account: profile[0] ?? null,
      solutions,
      taxIdentities,
      library: { saved, lists, listItems },
      contacts: { sent, received, history: events },
      notifications,
      newsletter: newsletter[0] ?? null,
      billing: { profile: billingProfile[0] ?? null, bookings, documents: billingDocuments },
      published: { reviews, reviewProofs, solutionComments, listComments },
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${t.data.export.fileName}-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return failure(t.errors.exportUnavailable, 503);
  }
}
