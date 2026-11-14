import { contactSystemMessages, type ContactStatus } from './model';

/**
 * The conversation of a contact request as people read it (SHCWS-168): oldest first,
 * messages from each side, and status changes as small system lines.
 *
 * Events come from `contact_events`. Since db/contact-messages.sql a message has
 * kind = 'message'; older rows are all kind = 'status', and before the thread existed the
 * recipient's reply travelled inside the status change, so a status event whose text is
 * not one of the fixed system messages is also shown as that person's message.
 */
export type ThreadEvent = {
  id: string;
  actor_id: string;
  status: ContactStatus;
  message: string;
  created_at: string;
  kind?: string | null;
};

export type ThreadItem =
  | { type: 'message'; id: string; mine: boolean; text: string; at: string }
  | {
      type: 'status';
      id: string;
      mine: boolean;
      /** What happened, for its label. */
      change: 'started' | 'closed' | 'reopened' | 'withdrawn';
      at: string;
    };

const systemTexts = new Set<string>(Object.values(contactSystemMessages));

type Change = Extract<ThreadItem, { type: 'status' }>['change'];

function change(previous: ContactStatus | null, next: ContactStatus): Change | 'created' | null {
  if (previous === null) return 'created';
  if (previous === next) return null;
  if (next === 'conversation') return previous === 'closed' ? 'reopened' : 'started';
  if (next === 'closed') return 'closed';
  if (next === 'withdrawn') return 'withdrawn';
  return null;
}

export function buildThread(events: readonly ThreadEvent[], viewer: string): ThreadItem[] {
  const ordered = [...events].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || Number(a.id) - Number(b.id),
  );
  const items: ThreadItem[] = [];
  let previous: ContactStatus | null = null;
  for (const event of ordered) {
    const mine = event.actor_id === viewer;
    const happened = change(previous, event.status);
    // The opening request is shown by the caller (the buyer's need as the first message),
    // so its system line is left out.
    if (happened && happened !== 'created')
      items.push({
        type: 'status',
        id: `${event.id}-status`,
        mine,
        change: happened,
        at: event.created_at,
      });
    const text = event.message.trim();
    if (text && (event.kind === 'message' || !systemTexts.has(text)) && happened !== 'created')
      items.push({ type: 'message', id: event.id, mine, text, at: event.created_at });
    previous = event.status;
  }
  return items;
}

/**
 * Whose move it is: while the request is open, whoever did not speak last. Closed or
 * withdrawn conversations wait on nobody.
 */
export function whoseTurn(
  events: readonly ThreadEvent[],
  status: ContactStatus,
  viewer: string,
): { turn: 'mine' | 'theirs' | 'none'; since: string | null } {
  if (status !== 'new' && status !== 'conversation') return { turn: 'none', since: null };
  const last = [...events].sort(
    (a, b) => b.created_at.localeCompare(a.created_at) || Number(b.id) - Number(a.id),
  )[0];
  if (!last) return { turn: 'none', since: null };
  return { turn: last.actor_id === viewer ? 'theirs' : 'mine', since: last.created_at };
}

export const messageMaxLength = 2000;

/** A message as sent: trimmed, 1–2000 characters. */
export function readMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= 1 && text.length <= messageMaxLength ? text : null;
}
