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
 * library, collections, what it published in public (reviews and comments), its posted
 * needs and proposals (SHCWS-58) and the contact conversations it takes part in — which
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
      questions,
      alerts,
      followedLists,
      followedCurators,
      publicProfile,
      previousHandles,
      followedProfiles,
      passkeys,
      signupOrigin,
      assistantTokens,
      assistantActivity,
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
      sql`SELECT email, profile, role, locale, consent_version, created_at::text, confirmed_at::text, unsubscribed_at::text, unsubscribe_reason FROM newsletter_subscribers WHERE email = ${account.email}`,
      sql`SELECT country_code, legal_name, tax_id, tax_regime, postal_code, cfdi_use, invoice_email, updated_at::text FROM billing_profiles WHERE account_id = ${account.id}`,
      sql`SELECT id::text, solution_id::text, solution_name, placement, scope, starts_on::text, ends_on::text, currency, subtotal_amount, tax_amount, total_amount, refunded_amount, status, terms_version, terms_accepted_at::text, served_until::text, canceled_at::text, paid_at::text, created_at::text FROM ad_campaigns WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT d.campaign_id::text, d.kind, d.amount, d.currency, d.status, d.folio_fiscal, d.document_number, d.issued_at::text, d.created_at::text FROM billing_documents d JOIN ad_campaigns c ON c.id = d.campaign_id WHERE c.owner_id = ${account.id} ORDER BY d.created_at`,
      sql`SELECT id::text, solution_id::text, author_name, rating, recommends, headline, use_case, pros, cons, usage_duration, company_size, country, status, hidden_reason, reply, reply_at::text, created_at::text, updated_at::text, review_invited(author_id, solution_id) AS invited FROM solution_reviews WHERE author_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, solution_id::text, author_name, body, created_at::text FROM solution_comments WHERE author_id = ${account.id} ORDER BY created_at`,
      sql`SELECT id::text, list_id::text, author_name, body, created_at::text FROM community_list_comments WHERE author_id = ${account.id} ORDER BY created_at`,
      sql`SELECT t.solution_id::text, t.country, t.tax_id, t.updated_at::text FROM solution_tax_identities t JOIN founder_solutions s ON s.id = t.solution_id WHERE s.owner_id = ${account.id}`,
      sql`SELECT p.review_id::text, p.method, p.checked_at::text FROM solution_review_proofs p JOIN solution_reviews r ON r.id = p.review_id WHERE r.author_id = ${account.id}`,
      sql`SELECT id::text, solution_id::text, author_name, body, answer, answered_at::text, hidden_reason, created_at::text FROM solution_questions WHERE author_id = ${account.id} ORDER BY created_at`,
      // Saved-search alerts (SHCWS-47) and follows (SHCWS-121). A followed list's name only
      // while it is still public; a curator by the signature followed, never their account.
      sql`SELECT id::text, scope, topic, query, filters, created_at::text, last_matched_at::text FROM search_alerts WHERE owner_id = ${account.id} ORDER BY created_at`,
      sql`SELECT f.list_id::text, CASE WHEN l.visibility = 'public' THEN l.name END AS name, f.created_at::text FROM community_list_follows f JOIN buyer_lists l ON l.id = f.list_id WHERE f.follower_id = ${account.id} ORDER BY f.created_at`,
      sql`SELECT curator_name, created_at::text FROM community_curator_follows WHERE follower_id = ${account.id} ORDER BY created_at`,
      // The public profile (SHCWS-120): what the person wrote, what it hides, its previous
      // handles and how many follow it (never who); profiles followed by their handle only.
      sql`SELECT handle, display_name, bio, links, hidden_solutions::text[] AS hidden_solutions, hidden_lists::text[] AS hidden_lists, active, activated_at::text, hidden_at::text, hidden_reason, created_at::text, updated_at::text, (SELECT count(*)::int FROM profile_follows f WHERE f.profile_id = p.account_id) AS followers FROM public_profiles p WHERE account_id = ${account.id}`.catch(
        () => [],
      ),
      sql`SELECT handle, retired_at::text FROM profile_handle_history WHERE account_id = ${account.id} ORDER BY retired_at`.catch(
        () => [],
      ),
      sql`SELECT CASE WHEN profile_visible(p.account_id) THEN p.handle END AS handle, f.created_at::text FROM profile_follows f JOIN public_profiles p ON p.account_id = f.profile_id WHERE f.follower_id = ${account.id} ORDER BY f.created_at`.catch(
        () => [],
      ),
      // Passkeys (SHCWS-158): what the person recognises them by. The public key, the
      // credential id and the counter only mean something to shwcs's own check, so they stay out.
      sql`SELECT name, backed_up AS synced, created_at::text, last_used_at::text FROM auth_passkeys WHERE account_id = ${account.id} ORDER BY created_at`.catch(
        () => [],
      ),
      // Where the visit that created the account came from (SHCWS-111). Optional table:
      // an export never fails because db/traffic-attribution.sql is missing.
      sql`SELECT channel, source, medium, campaign, site, landing, intent, created_at::text FROM account_signup_origins WHERE account_id = ${account.id}`.catch(
        () => [],
      ),
      // Tokens for the AI assistant (SHCWS-152): never the hash, only what identifies them.
      sql`SELECT id::text, name, token_hint, scope, created_at::text, expires_at::text, last_used_at::text, revoked_at::text FROM assistant_tokens WHERE account_id = ${account.id} ORDER BY created_at`.catch(
        () => [],
      ),
      sql`SELECT token_id::text, tool, solution_id::text, outcome, code, created_at::text FROM assistant_token_events WHERE account_id = ${account.id} ORDER BY created_at`.catch(
        () => [],
      ),
    ]);

    // «Publica tu necesidad» (SHCWS-58): the buyer's briefs with what they received, and
    // the proposals this account sent as a founder. Never the buyer behind a brief it
    // proposed to. Its own read, so a base without db/buyer-briefs.sql still exports.
    const briefs = await Promise.all([
      sql`SELECT id::text, problem, budget, timeline, company_size, industry, country, categories, capabilities, consent_version, consent_at::text, created_at::text, expires_at::text, closed_at::text, hidden_at::text, hidden_reason FROM buyer_briefs WHERE buyer_id = ${account.id} ORDER BY created_at`,
      sql`SELECT p.brief_id::text, s.published_data->>'name' AS project, p.message, p.price, p.timeline, p.created_at::text, p.chosen_at::text FROM buyer_brief_proposals p JOIN buyer_briefs b ON b.id = p.brief_id LEFT JOIN founder_solutions s ON s.id = p.solution_id WHERE b.buyer_id = ${account.id} ORDER BY p.created_at`,
      sql`SELECT l.brief_id::text, l.note, l.solution_ids::text[] AS solution_ids, l.created_at::text FROM buyer_brief_shortlists l JOIN buyer_briefs b ON b.id = l.brief_id WHERE b.buyer_id = ${account.id} ORDER BY l.created_at`,
      sql`SELECT p.brief_id::text, p.solution_id::text, p.message, p.price, p.timeline, p.created_at::text, p.chosen_at::text FROM buyer_brief_proposals p WHERE p.founder_id = ${account.id} ORDER BY p.created_at`,
    ])
      .then(([posted, proposals, shortlists, sentProposals]) => ({
        posted,
        proposals,
        shortlists,
        sentProposals,
      }))
      .catch(() => null);

    const payload = {
      exportedAt: new Date().toISOString(),
      about: t.exportAbout,
      account: profile[0] ?? null,
      signupOrigin: signupOrigin[0] ?? null,
      solutions,
      taxIdentities,
      library: { saved, lists, listItems },
      contacts: { sent, received, history: events },
      notifications,
      newsletter: newsletter[0] ?? null,
      billing: { profile: billingProfile[0] ?? null, bookings, documents: billingDocuments },
      published: { reviews, reviewProofs, solutionComments, listComments, questions },
      alerts,
      following: { lists: followedLists, curators: followedCurators, profiles: followedProfiles },
      security: { passkeys },
      publicProfile: publicProfile[0]
        ? { ...publicProfile[0], previousHandles: previousHandles }
        : null,
      briefs,
      assistant: { tokens: assistantTokens, activity: assistantActivity },
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
