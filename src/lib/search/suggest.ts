import { tokenize } from './normalize';
import { capabilityVocabulary, categoryVocabulary, industryVocabulary } from './vocabulary';
import {
  solutionCapabilities,
  solutionCategories,
  solutionIndustries,
} from '@/lib/solutions/model';

/**
 * Suggestions for the registration form, read from what the founder wrote (or what their
 * own site says about itself). They are one-click chips the founder confirms: nothing is
 * ever selected on its own.
 *
 * Matching is a little looser than search on purpose — a word matches a vocabulary term
 * by its root («cotiza» ↔ «cotizaciones», «cobra» ↔ «cobranza») — and stricter where it
 * matters: each distinct term counts once, and words that describe every business
 * («cliente», «empresa», «equipo»…) never count, so they cannot drag in a category.
 */
const generic = new Set([
  'cliente',
  'clientes',
  'customer',
  'customers',
  'client',
  'clients',
  'empresa',
  'empresas',
  'company',
  'companies',
  'business',
  'negocio',
  'negocios',
  'equipo',
  'equipos',
  'team',
  'teams',
  'servicio',
  'servicios',
  'service',
  'services',
  'software',
  'plataforma',
  'platform',
  'sistema',
  'system',
  'gestion',
  'management',
  'control',
]);

/** Same word, or the same root: a shared prefix of five letters or more. */
function sameRoot(a: string, b: string) {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  if (shorter < 5) return false;
  let common = 0;
  while (common < shorter && a[common] === b[common]) common++;
  return common >= 5 && common >= shorter - 3;
}

function matchedTerms(words: readonly string[], vocabulary: readonly string[] | undefined) {
  const found = new Set<string>();
  for (const term of vocabulary ?? []) {
    const parts = tokenize(term).filter(part => !generic.has(part));
    if (parts.length && parts.every(part => words.some(word => sameRoot(word, part))))
      found.add(parts.join(' '));
  }
  return found;
}

function wordsOf(...values: (string | undefined)[]) {
  return [...new Set(tokenize(values.filter(Boolean).join(' ')))].filter(
    word => !generic.has(word),
  );
}

type Subject = { name?: string; problem?: string; audience?: string; scope?: string };

/** Categories the text points at, strongest first, excluding those already chosen. */
export function suggestCategories(subject: Subject, chosen: readonly string[] = [], limit = 3) {
  const words = wordsOf(subject.name, subject.problem, subject.audience, subject.scope);
  if (!words.length) return [];
  const scored = solutionCategories.map(category => {
    // A category also counts the capabilities under it: «cotizaciones y facturación»
    // says Ventas and Cobros even if neither word appears.
    const terms = matchedTerms(words, categoryVocabulary[category]);
    for (const item of solutionCapabilities)
      if (item.category === category)
        for (const term of matchedTerms(words, capabilityVocabulary[item.id])) terms.add(term);
    return { category, score: terms.size };
  });
  // A distant runner-up is noise («marcas» pulling in Legal): keep only categories at
  // least half as strong as the best one, counting the ones already chosen, so adding
  // the right ones never promotes a weak suggestion into view.
  const best = Math.max(0, ...scored.map(item => item.score));
  return scored
    .filter(item => !chosen.includes(item.category) && item.score >= 2 && item.score * 2 >= best)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.category);
}

/** Capabilities under the chosen categories that the text names, strongest first. */
export function suggestCapabilityIds(
  subject: Subject,
  categories: readonly string[],
  chosen: readonly string[] = [],
  limit = 6,
): string[] {
  const words = wordsOf(subject.name, subject.problem, subject.audience, subject.scope);
  if (!words.length || !categories.length) return [];
  return solutionCapabilities
    .filter(item => categories.includes(item.category) && !chosen.includes(item.id))
    .map(item => ({ id: item.id, score: matchedTerms(words, capabilityVocabulary[item.id]).size }))
    .filter(item => item.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.id);
}

/** Industries the text names, for the «Para quién» step. */
export function suggestIndustries(subject: Subject, chosen: readonly string[] = [], limit = 3) {
  const words = wordsOf(subject.name, subject.problem, subject.audience);
  if (!words.length) return [];
  return solutionIndustries
    .filter(industry => !chosen.includes(industry))
    .map(industry => ({ industry, score: matchedTerms(words, industryVocabulary[industry]).size }))
    .filter(item => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.industry);
}
