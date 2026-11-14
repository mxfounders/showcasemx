import { commonText } from '@/i18n/common';

/**
 * How a project answers the contact requests it receives (SHCWS-52): «Suele responder en
 * menos de 48 h · 9 de 10 respondidas». Computed from real requests and the dates in
 * contact_events, never estimated, and shown only with enough of them to mean something.
 *
 * - Window: requests created in the last 90 days.
 * - Only requests from accounts with a verified email count, like every other ranking
 *   signal (CLAUDE.md §55): a founder can't build a record with throwaway accounts.
 * - A response is the first event the receiving account writes (each status change
 *   carries a reply the buyer sees, CLAUDE.md §9).
 * - Not counted yet: a request still unanswered within its first 72 hours (too early to
 *   call it unanswered), and one the buyer withdrew before any reply.
 */
export interface ResponseSignal {
  /** Median hours from the request to the first reply; null when none was answered. */
  medianHours: number | null;
  answered: number;
  requests: number;
}

export const responseWindowDays = 90;
export const responseMinimumRequests = 3;

/** Answers at least 8 of 10 requests, with half of the replies inside 48 hours. */
export function isFastResponder(signal?: ResponseSignal | null): boolean {
  return Boolean(
    signal &&
    signal.medianHours !== null &&
    signal.medianHours <= 48 &&
    signal.answered / signal.requests >= 0.8,
  );
}

/**
 * A moderate ranking bonus, at most 2 points (what one save weighs): the share of
 * requests answered, in full when the median reply comes within 48 hours, half within a
 * week, nothing slower. Published in /criterios.
 */
export function responseRankBonus(signal?: ResponseSignal | null): number {
  if (!signal || signal.medianHours === null) return 0;
  const speed = signal.medianHours <= 48 ? 1 : signal.medianHours <= 168 ? 0.5 : 0;
  return 2 * (signal.answered / signal.requests) * speed;
}

/**
 * The two halves of the sentence, in the visitor's language. The speed is always an upper
 * bound («menos de 48 h»), and null when no request was answered: then only the count
 * shows («0 de 3 respondidas»), which is exactly what a buyer needs to know.
 */
export function formatResponseSignal(signal: ResponseSignal, locale: string) {
  const text = commonText(locale);
  const hours = signal.medianHours;
  const speed =
    hours === null
      ? null
      : hours <= 48
        ? text.responseWithinHours.replace('{hours}', hours <= 24 ? '24' : '48')
        : text.responseWithinDays.replace('{days}', String(Math.ceil(hours / 24)));
  return {
    speed,
    rate: text.responseRate
      .replace('{answered}', String(signal.answered))
      .replace('{requests}', String(signal.requests)),
  };
}
