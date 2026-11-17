/**
 * Reminders and escalation for contact requests nobody answered (SHCWS-61). Pure rules,
 * no database: src/lib/contacts/reminders.ts runs them from the daily mail cron.
 *
 * «No reply» means the receiving account has not written anything since the request was
 * created: no message and no status change. Such a request is always still «nueva»,
 * because the recipient's first message or change moves it out of that status for good.
 *
 * - 48 hours: a reminder to the recipient.
 * - 5 days: a second reminder, which says what happens at 7 days.
 * - 7 days: the request is marked «sin respuesta» (contact_requests.unanswered_at), the
 *   buyer gets a notice with similar listings or the way to ask shwcs for help, and it
 *   counts against the project's response signal even if the buyer withdraws it later.
 *
 * The cron runs once a day (Vercel Hobby, CLAUDE.md §42), so «48 hours» means the first
 * daily run after 48 hours have passed, up to a day later. Only the latest step that is
 * due is acted on: a run that was missed never sends the 48-hour reminder on day 5.
 */
export const contactReminderHours = {
  first: 48,
  second: 120,
  unanswered: 168,
} as const;

/**
 * The buyer hears about «sin respuesta» only while it is news: up to a week after the
 * step fell due. An older request found by a first run (a new environment, a long
 * outage) is still marked, silently, so the label and the signal are right.
 */
export const unansweredNoticeWindowHours = contactReminderHours.unanswered + 168;

export type ContactReminderStep = 'first' | 'second' | 'unanswered';

/** The latest step due for an unanswered request of this age, or null before 48 h. */
export function dueContactStep(ageHours: number): ContactReminderStep | null {
  if (!Number.isFinite(ageHours)) return null;
  if (ageHours >= contactReminderHours.unanswered) return 'unanswered';
  if (ageHours >= contactReminderHours.second) return 'second';
  if (ageHours >= contactReminderHours.first) return 'first';
  return null;
}

/**
 * The notice's source_key, unique in account_notifications: writing a step twice is a
 * no-op (ON CONFLICT DO NOTHING), which is what makes the pass safe to run again.
 */
export function contactReminderKey(requestId: string, step: ContactReminderStep) {
  if (step === 'unanswered') return `contact-unanswered:${requestId}`;
  return `contact-reminder:${requestId}:${step === 'first' ? '48h' : '5d'}`;
}

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const keyPattern = new RegExp(
  `^(?:contact-reminder:(${uuid}):(48h|5d)|contact-unanswered:(${uuid}))$`,
);

/** The request and step a source_key stands for, or null for any other notice. */
export function readContactReminderKey(
  key: string,
): { requestId: string; step: ContactReminderStep } | null {
  const match = keyPattern.exec(key);
  if (!match) return null;
  if (match[3]) return { requestId: match[3], step: 'unanswered' };
  return { requestId: match[1], step: match[2] === '48h' ? 'first' : 'second' };
}

export type ContactReminderPlan = {
  /** Reminders to the recipient. */
  reminders: Array<{ id: string; step: 'first' | 'second'; key: string }>;
  /** Requests to mark «sin respuesta», and whether the buyer gets a notice. */
  unanswered: Array<{ id: string; key: string; notifyBuyer: boolean }>;
};

/** What one run does with the open, unanswered requests it found. */
export function planContactReminders(
  rows: ReadonlyArray<{ id: string; ageHours: number }>,
): ContactReminderPlan {
  const plan: ContactReminderPlan = { reminders: [], unanswered: [] };
  for (const { id, ageHours } of rows) {
    const step = dueContactStep(ageHours);
    if (step === 'unanswered')
      plan.unanswered.push({
        id,
        key: contactReminderKey(id, step),
        notifyBuyer: ageHours < unansweredNoticeWindowHours,
      });
    else if (step) plan.reminders.push({ id, step, key: contactReminderKey(id, step) });
  }
  return plan;
}

/** Whole days since the request, as the emails say it («hace 2 días»); at least 1. */
export function daysWaiting(createdAt: string | Date, now = new Date()) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 1;
  return Math.max(1, Math.floor((now.getTime() - created) / 86_400_000));
}
