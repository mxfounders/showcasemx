/**
 * Public questions and answers on a listing (SHCWS-57, db/solution-questions.sql).
 *
 * Shared by the API and the form, so an inline error is exactly the one the server
 * returns. Validation answers with stable codes that the `questions` dictionary
 * translates (§63).
 */

export const questionLimits = {
  name: 60,
  body: [10, 500],
  answer: 2000,
  reportDetails: [10, 2000],
} as const;

export const questionReportReasons = ['spam', 'abuse', 'impersonation', 'other'] as const;
export type QuestionReportReason = (typeof questionReportReasons)[number];

export type QuestionError = 'name' | 'body';

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function readQuestion(
  input: unknown,
): { ok: true; name: string; body: string } | { ok: false; field: QuestionError } {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const name = text(value.name);
  if (!name || name.length > questionLimits.name) return { ok: false, field: 'name' };
  const body = text(value.body);
  const [min, max] = questionLimits.body;
  if (body.length < min || body.length > max) return { ok: false, field: 'body' };
  return { ok: true, name, body };
}

/** The owner's answer; an empty string removes it, anything invalid is undefined. */
export function readAnswer(value: unknown): string | null | undefined {
  if (typeof value !== 'string') return undefined;
  const answer = value.trim();
  if (!answer) return null;
  return answer.length <= questionLimits.answer ? answer : undefined;
}

export function readQuestionReport(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  const details = text(body.details);
  const [min, max] = questionLimits.reportDetails;
  if (!questionReportReasons.some(reason => reason === body.reason)) return null;
  if (details.length < min || details.length > max) return null;
  return { reason: body.reason as QuestionReportReason, details };
}
