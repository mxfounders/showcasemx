import { tokenize } from './normalize';
import { industryVocabulary } from './vocabulary';
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
  industries?: string[];
  companySizes?: string[];
}

// At least two distinct vocabulary hits, never one: a single generic word
// ("clientes") must not be enough to claim an industry the founder never
// declared. See docs/solution-social.md-style honesty rules in CLAUDE.md —
// this is the search-layer equivalent of "no inventar datos".
const MIN_INFERENCE_HITS = 2;

function countVocabularyHits(words: Set<string>, vocabulary: string[]): number {
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
