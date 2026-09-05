import { tokenize } from './normalize';
import { industryVocabulary, capabilityVocabulary } from './vocabulary';
import { solutionCapabilities } from '@/lib/solutions/model';
import type { Industry } from '@/lib/taxonomy';

// The tri-state a solution declares for industries/companySizes (see
// src/lib/solutions/model.ts): undefined = never answered; [] = "fits any",
// a deliberate answer; [...] = a specific list. `matchFacet` resolves that
// tri-state and adds a fourth, softer level for the real gap: a product that
// never answered but whose own text strongly suggests the value anyway.
export type FacetMatch = 'declared' | 'any' | 'inferred' | 'none';

export interface FacetSubject {
  name?: string;
  description?: string;
  feature?: string;
  scope?: string;
  industries?: string[];
  companySizes?: string[];
  capabilities?: string[];
}

// At least two distinct vocabulary hits, never one: a single generic word
// ("clientes") must not be enough to claim an industry the founder never
// declared. See docs/solution-social.md-style honesty rules in CLAUDE.md —
// this is the search-layer equivalent of "no inventar datos".
const MIN_INFERENCE_HITS = 2;

export function countVocabularyHits(words: Set<string>, vocabulary: string[]): number {
  let hits = 0;
  for (const term of vocabulary) if (tokenize(term).every(part => words.has(part))) hits++;
  return hits;
}

// Declaring closes the question: if a founder declared industries and this
// value isn't among them, that's a real 'none' — never softened into
// 'inferred' just because the product's text happens to mention the value
// too. Inference only ever fills an actual gap (undefined), never overrides
// a declared answer.
export function matchIndustry(subject: FacetSubject, value: string): FacetMatch {
  if (subject.industries !== undefined) {
    if (subject.industries.length === 0) return 'any';
    return subject.industries.includes(value) ? 'declared' : 'none';
  }
  const vocabulary = industryVocabulary[value as Industry];
  if (!vocabulary) return 'none';
  const words = new Set(tokenize([subject.name, subject.description, subject.feature].filter(Boolean).join(' ')));
  return countVocabularyHits(words, vocabulary) >= MIN_INFERENCE_HITS ? 'inferred' : 'none';
}

// Company size isn't reliably inferable from free text the way an industry
// is (nothing in a product's description reads as "we serve 11-100 person
// companies"), so this only ever resolves the declared tri-state.
export function matchCompanySize(subject: {companySizes?: string[]}, value: string): FacetMatch {
  if (subject.companySizes !== undefined) {
    if (subject.companySizes.length === 0) return 'any';
    return subject.companySizes.includes(value) ? 'declared' : 'none';
  }
  return 'none';
}

// Editorial collections (src/lib/taxonomy.ts matchesCollection) and strict
// filters must never grow by inference — only a real "match" or "fits any".
export function isRealMatch(level: FacetMatch): boolean {
  return level === 'declared' || level === 'any';
}

// Capabilities have no "any" state (see solutions/model.ts): a solution
// either declared this one or it didn't, so this only ever returns
// 'declared' | 'inferred' | 'none' — never 'any'. Declaring still closes the
// question exactly like matchIndustry: once capabilities is a real list, a
// value missing from it is 'none', never softened by inference.
export function matchCapability(subject: FacetSubject, id: string): FacetMatch {
  if (subject.capabilities !== undefined) return subject.capabilities.includes(id) ? 'declared' : 'none';
  const vocabulary = capabilityVocabulary[id];
  if (!vocabulary) return 'none';
  const words = new Set(tokenize([subject.name, subject.description, subject.feature, subject.scope].filter(Boolean).join(' ')));
  return countVocabularyHits(words, vocabulary) >= MIN_INFERENCE_HITS ? 'inferred' : 'none';
}

// Reads what the founder has already typed (problem/audience/scope/name) and
// proposes capabilities they haven't marked yet, scoped to categories they
// already declared. Never auto-selects anything — the editor renders these
// as one-click chips the founder confirms, the honest version of "the system
// detects it": pre-fill, never publish without confirmation.
export function suggestCapabilities(subject: { name?: string; problem?: string; audience?: string; scope?: string; categories?: string[]; capabilities?: string[] }): string[] {
  const categories = new Set(subject.categories ?? []);
  if (!categories.size) return [];
  const declared = new Set(subject.capabilities ?? []);
  const words = new Set(tokenize([subject.name, subject.problem, subject.audience, subject.scope].filter(Boolean).join(' ')));
  return solutionCapabilities
    .filter(item => categories.has(item.category) && !declared.has(item.id))
    .filter(item => countVocabularyHits(words, capabilityVocabulary[item.id] ?? []) >= MIN_INFERENCE_HITS)
    .map(item => item.id);
}
