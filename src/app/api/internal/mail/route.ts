import { authorizedCron } from '@/lib/notifications/cron';
import { NextRequest, NextResponse } from 'next/server';
import { deliverNotifications } from '@/lib/notifications/server';
import { authSql } from '@/lib/auth/security';
import { createAdDateNotices } from '@/lib/ads/notices';
import { createContactReviewInvitations } from '@/lib/reviews/invitations';
import { sendWeeklyDigests } from '@/lib/notifications/weekly';
import { reviewAlertsEnabled, reviewQueueDigest } from '@/lib/review-queue/alerts';
import { matchSearchAlerts } from '@/lib/alerts/server';
import { runContactReminders } from '@/lib/contacts/reminders';
import { processNewsletterQueue } from '@/lib/newsletter/send';
import { createWeeklyNewsletterDraft } from '@/lib/newsletter/weekly-draft';
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  if (!authorizedCron(request.headers.get('authorization')))
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  try {
    // Best-effort: a missing ad table (fresh database) never stops the mail run.
    await createAdDateNotices().catch(() => console.error('Ad date notices failed.'));
    // shwcs asks for a review 30 days after a real conversation (SHCWS-135); best-effort.
    await createContactReviewInvitations().catch(() => console.error('Review invitations failed.'));
    // Saved-search alerts (SHCWS-47): catches anything the publish-time run missed.
    await matchSearchAlerts().catch(() => console.error('Search alerts failed.'));
    // Unanswered contact requests (SHCWS-61): reminders at 48 h and 5 days, «sin
    // respuesta» at 7. Daily, so each step lands on the first run after it is due.
    await runContactReminders().catch(() => console.error('Contact reminders failed.'));
    const result = await deliverNotifications();
    // «Tu semana en shwcs» (SHCWS-21): the first daily run of each week sends it.
    await sendWeeklyDigests().catch(() => console.error('Weekly digest failed.'));
    // Newsletter (SHCWS-124): whatever a queued campaign still owes; ops starts it right away
    // and this is the retry. Then this week's «Nuevo esta semana» draft for ops to review
    // (SHCWS-125): a draft only, nothing is sent without a person.
    await processNewsletterQueue({ budgetMs: 120_000 }).catch(() =>
      console.error('Newsletter queue failed.'),
    );
    await createWeeklyNewsletterDraft().catch(() =>
      console.error('Weekly newsletter draft failed.'),
    );
    // The review team's morning summary (SHCWS-139), best-effort like the ad notices.
    if (reviewAlertsEnabled())
      await reviewQueueDigest().catch(() => console.error('Review digest failed.'));
    const sql = authSql();
    await sql.transaction([
      sql`DELETE FROM auth_email_verifications WHERE expires_at<now()`,
      sql`DELETE FROM auth_google_states WHERE expires_at<now()`,
      sql`DELETE FROM auth_password_resets WHERE expires_at<now()`,
      sql`DELETE FROM auth_rate_limits WHERE window_start<now()-interval '2 days'`,
    ]);
    // Newsletter housekeeping (docs/newsletter.md): spent confirmation tokens, webhook ids past
    // Resend's retry window and per-recipient delivery rows 12 months after a campaign ended.
    await sql
      .transaction([
        sql`DELETE FROM newsletter_confirmations WHERE expires_at<now()-interval '1 day'`,
        sql`DELETE FROM resend_webhook_events WHERE received_at<now()-interval '30 days'`,
        sql`DELETE FROM newsletter_deliveries d USING newsletter_campaigns c WHERE c.id=d.campaign_id AND COALESCE(c.finished_at,c.cancelled_at)<now()-interval '12 months'`,
      ])
      .catch(() => console.error('Newsletter cleanup failed.'));
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
      status: result.available ? 200 : 503,
    });
  } catch {
    console.error('Scheduled mail processing failed.');
    return NextResponse.json(
      { error: 'Mail processing failed' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
