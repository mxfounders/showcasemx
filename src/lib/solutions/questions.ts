import { solutionErrors, type SolutionData, type SolutionErrorCode } from './model';

/**
 * The editor in two parts (docs/guided-solution-form.md):
 *
 * - Three short required steps, in order: what it is, where it fits, who it is for. They
 *   hold everything a listing needs to be submitted, so a founder can finish in minutes.
 * - The final screen (`review`): a live preview, the private contact and the submit
 *   button, plus every optional section as a card the founder can open in any order.
 *
 * Each id's title and hint live in the `solutionEditor.questions` dictionary section.
 * `phase` is the legacy 0..3 `step` column, still validated by the API.
 */
export const solutionQuestions = [
  // Website, name, kind and the one-paragraph description. The website comes first in
  // the flow (on /account/solutions/new) so name and description can be read from it.
  { id: 'basics', phase: 0, fields: ['website', 'name', 'kind', 'problem'], optional: false },
  // Categories and, under each, the concrete capabilities, suggested from the text.
  { id: 'fit', phase: 1, fields: ['category', 'capabilities'], optional: false },
  { id: 'audience', phase: 1, fields: ['audience', 'industries', 'companySizes'], optional: false },
  { id: 'review', phase: 3, fields: ['contactEmail'], optional: false },
  // Optional sections, opened from the review screen.
  { id: 'screenshots', phase: 2, fields: ['screenshots'], optional: true },
  { id: 'demo', phase: 2, fields: ['demoUrl'], optional: true },
  { id: 'pricing', phase: 2, fields: ['pricingModel', 'priceBand', 'pricing'], optional: true },
  { id: 'delivery', phase: 2, fields: ['setupTime', 'implementation', 'support'], optional: true },
  { id: 'integrations', phase: 2, fields: ['integrationKeys', 'integrations'], optional: true },
  { id: 'compliance', phase: 2, fields: ['compliance'], optional: true },
  { id: 'scope', phase: 2, fields: ['scope', 'notFor'], optional: true },
  { id: 'founders', phase: 2, fields: ['founders'], optional: true },
  { id: 'links', phase: 2, fields: ['projectLinks'], optional: true },
  { id: 'evidence', phase: 2, fields: ['evidence', 'evidenceUrl'], optional: true },
] as const;
export type SolutionQuestion = (typeof solutionQuestions)[number]['id'];

/** The required, linear part of the editor; everything after `review` is optional. */
export const requiredQuestions = solutionQuestions.filter(item => !item.optional);
export const optionalQuestions = solutionQuestions.filter(item => item.optional);

/**
 * Ids saved by the previous 18-question editor, so a draft saved before this version
 * resumes at the equivalent step (and a tab left open on the old editor can still save).
 */
const legacyQuestions: Record<string, SolutionQuestion> = {
  identity: 'basics',
  categories: 'basics',
  problem: 'basics',
  capabilities: 'fit',
  market: 'audience',
  contact: 'review',
};
const legacyPhases: Record<string, number> = {
  identity: 0,
  categories: 0,
  problem: 1,
  capabilities: 1,
  market: 1,
  contact: 2,
};

/** Own keys only: «constructor» must never resolve through Object.prototype. */
const own = <T>(map: Record<string, T>, key: string) =>
  Object.hasOwn(map, key) ? map[key] : undefined;

export function questionIndex(question: unknown, legacyStep = 0) {
  const saved =
    typeof question === 'string' ? (own(legacyQuestions, question) ?? question) : undefined;
  const found = solutionQuestions.findIndex(item => item.id === saved);
  if (found >= 0) return found;
  // No saved question: the first required step of the saved phase. Old phase 2 (pricing
  // and contact, near the end of the previous editor) and 3 resume at the review screen.
  const byPhase = requiredQuestions.find(item => item.phase === legacyStep)?.id;
  const fallback = byPhase ?? (legacyStep >= 2 ? 'review' : 'basics');
  return solutionQuestions.findIndex(item => item.id === fallback);
}

export function isSolutionQuestion(value: unknown): value is SolutionQuestion {
  return solutionQuestions.some(item => item.id === value);
}

/** The phase the API expects with a question id, including the legacy ids. */
export function questionPhase(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  return solutionQuestions.find(item => item.id === value)?.phase ?? own(legacyPhases, value);
}

/** Error codes for the fields of one question, in the order `solutionErrors` reports them. */
export function questionErrors(data: SolutionData, index: number): SolutionErrorCode[] {
  const errors = solutionErrors(data),
    fields: readonly string[] = solutionQuestions[index].fields;
  return Object.entries(errors).flatMap(([key, code]) =>
    code && fields.includes(key) ? [code] : [],
  );
}

/** Whether an optional section already says something, for its card on the review screen. */
export function sectionFilled(data: SolutionData, id: SolutionQuestion) {
  switch (id) {
    case 'screenshots':
      return !!data.screenshots?.length;
    case 'demo':
      return !!data.demoUrl;
    case 'pricing':
      return !!(data.pricingModel?.length || data.priceBand || data.pricing);
    case 'delivery':
      return !!(data.setupTime || data.implementation || data.support);
    case 'integrations':
      return data.integrationKeys !== undefined || !!data.integrations;
    case 'compliance':
      return !!data.compliance?.length;
    case 'scope':
      return !!(data.scope || data.notFor);
    case 'founders':
      return !!data.founders?.length;
    case 'links':
      return !!data.projectLinks?.length;
    case 'evidence':
      return !!(data.evidence || data.evidenceUrl);
    default:
      return false;
  }
}
