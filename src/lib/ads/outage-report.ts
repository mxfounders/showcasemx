/**
 * An outage report as a monitor outside Vercel sends it (SHCWS-179). One JSON shape for
 * every reporter, so an uptime service only needs its webhook body configured:
 *
 *   { "source": "uptime", "incident": "<its id>", "event": "up",
 *     "startedAt": "<ISO or Unix seconds>", "endedAt": "…", "durationSeconds": 18000 }
 *
 * Two of startedAt, endedAt and durationSeconds are enough. Numbers may come as strings
 * (webhook templates fill variables as text). A report whose `event` says the site went
 * down is ignored: only a recovery knows how long the outage lasted.
 */
export type OutageReport = {
  source: string;
  externalId: string;
  startedAt: Date;
  endedAt: Date;
};

export type OutageReportError =
  'body' | 'source' | 'incident' | 'times' | 'order' | 'future' | 'tooOld' | 'tooLong';

/** Oldest outage accepted: older days are past the terms' 30-day claim window anyway. */
export const outageMaxAgeDays = 60;
/** Longest single window: a month-long pause (October 2026) fits; a corrupt one does not. */
export const outageMaxDays = 45;

const sourcePattern = /^[a-z0-9][a-z0-9_-]{0,39}$/i;

/** A time as ISO text, Unix seconds or Unix milliseconds (as a number or numeric text). */
function readTime(value: unknown): Date | null {
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    // Seconds until the year 33658; anything larger is already milliseconds.
    return new Date(number < 1e12 ? number * 1000 : number);
  }
  if (typeof value !== 'string' || value.length > 40) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function readSeconds(value: unknown): number | null {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function readOutageReport(
  value: unknown,
  now: Date = new Date(),
):
  | { ok: true; report: OutageReport }
  | { ok: true; ignored: true }
  | { ok: false; error: OutageReportError } {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { ok: false, error: 'body' };
  const input = value as Record<string, unknown>;

  if (typeof input.event === 'string' && /^(down|started|open(ed)?)$/i.test(input.event.trim())) {
    return { ok: true, ignored: true };
  }
  const source = input.source === undefined ? 'uptime' : input.source;
  if (typeof source !== 'string' || !sourcePattern.test(source)) {
    return { ok: false, error: 'source' };
  }

  let started = readTime(input.startedAt);
  let ended = readTime(input.endedAt);
  const seconds = readSeconds(input.durationSeconds);
  if (started && !ended && seconds) ended = new Date(started.getTime() + seconds * 1000);
  if (!started && ended && seconds) started = new Date(ended.getTime() - seconds * 1000);
  if (!started || !ended) return { ok: false, error: 'times' };
  if (ended.getTime() <= started.getTime()) return { ok: false, error: 'order' };
  if (ended.getTime() > now.getTime() + 5 * 60_000) return { ok: false, error: 'future' };
  if (started.getTime() < now.getTime() - outageMaxAgeDays * 86_400_000) {
    return { ok: false, error: 'tooOld' };
  }
  if (ended.getTime() - started.getTime() > outageMaxDays * 86_400_000) {
    return { ok: false, error: 'tooLong' };
  }

  // The reporter's id for the incident; without one, its start is the incident.
  const incident = input.incident ?? started.toISOString();
  if (
    (typeof incident !== 'string' && typeof incident !== 'number') ||
    String(incident).trim() === '' ||
    String(incident).length > 200
  ) {
    return { ok: false, error: 'incident' };
  }

  return {
    ok: true,
    report: {
      source: source.toLowerCase(),
      externalId: String(incident).trim(),
      startedAt: started,
      endedAt: ended,
    },
  };
}
