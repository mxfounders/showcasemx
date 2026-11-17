import { solutionsSql } from '@/lib/solutions/server';
import { contactReminderHours, planContactReminders } from './reminder-model';

export * from './reminder-model';

/** «The recipient has written something in this request», for `r` = contact_requests. */
const recipientRepliedSql = `EXISTS(SELECT 1 FROM contact_events e WHERE e.request_id=r.id AND e.actor_id=r.recipient_id)`;

/**
 * One reminder pass (SHCWS-61), run by the daily mail cron before it delivers notices.
 * Reads open requests the recipient never answered, asks reminder-model.ts which step
 * each one is due for, and writes the notices; account_notifications.source_key is unique
 * and every write is ON CONFLICT DO NOTHING, so running it twice sends nothing twice.
 * Notices follow the contact email preference and only reach verified addresses, like
 * every other contact notice (db/contact-alerts-default.sql); a suspended recipient gets
 * no reminder. Titles are stored in Spanish (CLAUDE.md §63).
 *
 * `only` limits the pass to some requests: the integration test uses it so a run never
 * touches anyone else's rows. The cron never passes it.
 */
export async function runContactReminders({ only }: { only?: readonly string[] } = {}) {
  const sql = solutionsSql();
  const scoped = Boolean(only),
    ids = [...(only ?? [])];
  const rows = await sql.query(
    `SELECT r.id::text AS id, extract(epoch FROM now()-r.created_at)/3600.0 AS age_hours
     FROM contact_requests r
     WHERE r.status='new' AND r.unanswered_at IS NULL
       AND r.created_at<=now()-make_interval(hours=>$1)
       AND NOT ${recipientRepliedSql}
       AND (NOT $2::boolean OR r.id=ANY($3::uuid[]))
     ORDER BY r.created_at LIMIT 500`,
    [contactReminderHours.first, scoped, ids],
  );
  const plan = planContactReminders(
    rows.map(row => ({ id: String(row.id), ageHours: Number(row.age_hours) })),
  );

  let reminders = 0;
  if (plan.reminders.length) {
    // Rechecks status and «no reply» in the same statement: a recipient who answered
    // after the read above gets no reminder.
    const inserted = await sql.query(
      `INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state)
       SELECT r.recipient_id,'contact',x.key,
         left(CASE WHEN x.step='first'
           THEN 'Recordatorio: '||COALESCE(NULLIF(btrim(r.details->>'company'),''),'un comprador')||' espera tu respuesta sobre '||r.project_name
           ELSE COALESCE(NULLIF(btrim(r.details->>'company'),''),'Un comprador')||' sigue esperando tu respuesta sobre '||r.project_name END,180),
         '/account/opportunities/'||r.id,
         CASE WHEN COALESCE(p.contact_email,true) AND a.email_verified_at IS NOT NULL THEN 'pending' ELSE 'disabled' END
       FROM unnest($1::uuid[],$2::text[],$3::text[]) AS x(id,key,step)
       JOIN contact_requests r ON r.id=x.id AND r.status='new' AND r.unanswered_at IS NULL
       JOIN auth_accounts a ON a.id=r.recipient_id AND a.suspended_at IS NULL
       LEFT JOIN notification_preferences p ON p.owner_id=r.recipient_id
       WHERE NOT ${recipientRepliedSql}
       ON CONFLICT (source_key) DO NOTHING RETURNING id`,
      [
        plan.reminders.map(item => item.id),
        plan.reminders.map(item => item.key),
        plan.reminders.map(item => item.step),
      ],
    );
    reminders = inserted.length;
  }

  let marked = 0,
    notified = 0;
  if (plan.unanswered.length) {
    const notify = plan.unanswered.filter(item => item.notifyBuyer);
    // Marks and notifies in one statement. The UPDATE only takes a request that is still
    // new, unmarked and unanswered, so a concurrent run or a reply in between leaves it
    // alone; the notice exists only for rows this statement marked.
    const [result] = await sql.query(
      `WITH marked AS (
         UPDATE contact_requests r SET unanswered_at=now()
         WHERE r.id=ANY($1::uuid[]) AND r.unanswered_at IS NULL AND r.status='new'
           AND NOT ${recipientRepliedSql}
         RETURNING r.id,r.buyer_id,r.project_name
       ), noticed AS (
         INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state)
         SELECT m.buyer_id,'contact',x.key,left(m.project_name||' no respondió a tu solicitud',180),
           '/account/contacts/'||m.id,
           CASE WHEN COALESCE(p.contact_email,true) AND a.email_verified_at IS NOT NULL THEN 'pending' ELSE 'disabled' END
         FROM marked m
         JOIN unnest($2::uuid[],$3::text[]) AS x(id,key) ON x.id=m.id
         JOIN auth_accounts a ON a.id=m.buyer_id AND a.suspended_at IS NULL
         LEFT JOIN notification_preferences p ON p.owner_id=m.buyer_id
         ON CONFLICT (source_key) DO NOTHING RETURNING 1
       )
       SELECT (SELECT count(*) FROM marked)::int AS marked,(SELECT count(*) FROM noticed)::int AS notified`,
      [
        plan.unanswered.map(item => item.id),
        notify.map(item => item.id),
        notify.map(item => item.key),
      ],
    );
    marked = Number(result?.marked ?? 0);
    notified = Number(result?.notified ?? 0);
  }
  return { checked: rows.length, reminders, marked, notified };
}
