import { solutionErrors, type SolutionData, type SolutionErrorCode } from './model';
// The guided editor's questions, in order. Each question's title and hint live in the
// `solutionEditor.questions` dictionary section, keyed by `id`.
export const solutionQuestions = [
  {
    id: 'identity',
    phase: 0,
    fields: ['name'],
    optional: false,
  },
  {
    id: 'categories',
    phase: 0,
    fields: ['kind', 'category'],
    optional: false,
  },
  {
    id: 'problem',
    phase: 1,
    fields: ['problem'],
    optional: false,
  },
  // Right after `problem`, on purpose: by now there's already prose to read,
  // so the editor can suggest capabilities from it on the very first pass
  // instead of only after the founder comes back later. See suggestCapabilities.
  {
    id: 'capabilities',
    phase: 1,
    fields: ['capabilities'],
    optional: false,
  },
  {
    id: 'audience',
    phase: 1,
    fields: ['audience'],
    optional: false,
  },
  {
    id: 'market',
    phase: 1,
    fields: ['industries', 'companySizes'],
    optional: false,
  },
  {
    id: 'scope',
    phase: 1,
    fields: ['scope', 'notFor'],
    optional: true,
  },
  {
    id: 'founders',
    phase: 1,
    fields: ['founders'],
    optional: true,
  },
  {
    id: 'links',
    phase: 1,
    fields: ['projectLinks'],
    optional: true,
  },
  {
    id: 'screenshots',
    phase: 1,
    fields: ['screenshots'],
    optional: true,
  },
  {
    id: 'demo',
    phase: 1,
    fields: ['demoUrl'],
    optional: true,
  },
  {
    id: 'pricing',
    phase: 2,
    fields: ['pricingModel', 'priceBand', 'pricing'],
    optional: true,
  },
  // Split from the old three-textarea `delivery`: adding setupTime chips on
  // top would have made it the heaviest screen in the form, against the
  // "una pregunta corta a la vez" rule the rest of the guided form follows.
  {
    id: 'delivery',
    phase: 2,
    fields: ['setupTime', 'implementation', 'support'],
    optional: true,
  },
  {
    id: 'integrations',
    phase: 2,
    fields: ['integrationKeys', 'integrations'],
    optional: true,
  },
  {
    id: 'compliance',
    phase: 2,
    fields: ['compliance'],
    optional: true,
  },
  {
    id: 'evidence',
    phase: 2,
    fields: ['evidence', 'evidenceUrl'],
    optional: true,
  },
  {
    id: 'contact',
    phase: 2,
    fields: ['website', 'contactEmail'],
    optional: false,
  },
  {
    id: 'review',
    phase: 3,
    fields: [],
    optional: false,
  },
] as const;
export type SolutionQuestion = (typeof solutionQuestions)[number]['id'];
export function questionIndex(question: unknown, legacyStep = 0) {
  const found = solutionQuestions.findIndex(item => item.id === question);
  return found >= 0
    ? found
    : Math.max(
        0,
        solutionQuestions.findIndex(item => item.phase === legacyStep),
      );
}
export function isSolutionQuestion(value: unknown): value is SolutionQuestion {
  return solutionQuestions.some(item => item.id === value);
}
/** Error codes for the fields of one question, in the order `solutionErrors` reports them. */
export function questionErrors(data: SolutionData, index: number): SolutionErrorCode[] {
  const errors = solutionErrors(data),
    fields: readonly string[] = solutionQuestions[index].fields;
  return Object.entries(errors).flatMap(([key, code]) =>
    code && fields.includes(key) ? [code] : [],
  );
}
