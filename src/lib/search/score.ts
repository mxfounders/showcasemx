import { tokenize } from './normalize';
import { expandVocabulary } from './vocabulary';
import { capabilityLabels } from '@/lib/taxonomy';
import { capabilityEn } from '@/lib/taxonomy-en';

// A searchable thing: the fields catalog-search and (later) the saved library
// score against. Only `name`/`description`/`feature` are required; everything
// else is optional so a bare PreviewProduct still fits.
export interface SearchableProduct {
  name: string;
  description: string;
  feature: string;
  provider?: string;
  categories?: string[];
  industries?: string[];
  companySizes?: string[];
  capabilities?: string[];
  keywords?: string[];
}

// Filler words a buyer types around the real query, in both languages ("quiero",
// "necesito", "para mi empresa" / "I need", "for my company").
const STOPWORDS = new Set(
  [
    'quiero necesito busco para mi mis una un el la los las de del a al en y o que me con por como',
    'queremos necesitamos buscamos nuestro nuestra nuestros nuestras su sus se le les lo nos',
    'tengo tenemos hay hacer puedo poder pueda sirva ayude este esta estos estas ese esa eso',
    'mas muy todo todos toda todas cada sin sobre entre desde donde cuando algo alguien otro otra',
    'empresa negocio tiempo organizar ayuda solucion soluciones',
    'i we want need looking find for my our the an of to in on and or that with by as is are get',
    'me us your can could would should some any so it its this these those from at be',
    'company business time help solution solutions',
  ]
    .join(' ')
    .split(' '),
);

// Words that say what *kind* of thing a buyer wants, not what it should do: «software»,
// «un sistema», «una app», «una plataforma», «para mis clientes». Every listing is one of
// those, so next to a real need they only add noise: «sistema para mi restaurante» is
// about the restaurant, «que mis clientes paguen» is about getting paid (SHCWS-41). They
// still count when they are the whole query, so «software» or «app» alone searches.
const GENERIC = new Set(
  [
    'software softwares sistema sistemas plataforma plataformas herramienta herramientas',
    'programa programas app apps aplicacion aplicaciones servicio servicios proveedor proveedores',
    'cliente clientes equipo gestion manejo control controlar administrar gestionar manejar llevar',
    'empresas negocios companies businesses',
    'system systems platform platforms tool tools program programs application applications',
    'service services provider providers vendor vendors client clients customer customers team',
    'management manage',
  ]
    .join(' ')
    .split(' '),
);

/**
 * The words of a query that carry its meaning: without fillers, and without the generic
 * words above when something more specific is left.
 */
export function queryTokens(query: string): string[] {
  const tokens = tokenize(query).filter(token => token.length > 0 && !STOPWORDS.has(token));
  const specific = tokens.filter(token => !GENERIC.has(token));
  return specific.length ? specific : tokens;
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

// Endings a buyer conjugates or derives around the same root: «cobren», «cobro» and
// «cobrar» are one verb; «facturen» and «facturación», «cotice» and «cotización» too.
// Longest first. English «-ing»/«-ed» ride along («invoicing» ~ «invoice»).
const ENDINGS = [
  'amientos',
  'imientos',
  'aciones',
  'iciones',
  'amiento',
  'imiento',
  'ieron',
  'acion',
  'icion',
  'iendo',
  'ando',
  'aron',
  'aran',
  'eran',
  'ados',
  'adas',
  'idos',
  'idas',
  'amos',
  'emos',
  'imos',
  'ado',
  'ada',
  'ido',
  'ida',
  'ing',
  'ed',
  'ar',
  'er',
  'ir',
  'an',
  'en',
  'as',
  'es',
  'os',
  'a',
  'e',
  'o',
];

/**
 * The root a word shares with its conjugations, or null when it has none worth comparing.
 * A root keeps at least four letters, so short words never fold together («pago» and
 * «pages», «dato» and «date» stay apart; the few short verbs buyers use, like «paguen»,
 * are spelled out in the vocabulary instead). Spelling changes before an «e» are undone:
 * «cotice» ~ «cotizar», «busque» ~ «buscar», «pague» ~ «pagar».
 */
export function wordRoot(word: string): string | null {
  for (const ending of ENDINGS) {
    if (!word.endsWith(ending)) continue;
    let root = word.slice(0, -ending.length);
    if (root.endsWith('gu')) root = root.slice(0, -1);
    else if (root.endsWith('qu')) root = `${root.slice(0, -2)}c`;
    else if (root.endsWith('z')) root = `${root.slice(0, -1)}c`;
    if (root.length >= 4) return root;
  }
  return null;
}

// Singular candidates for a word, so plurals compare equal in both languages without a
// real stemmer: pagos/pago, cotizaciones/cotizacion, quotes/quote, companies/company.
function singulars(word: string): string[] {
  const forms = [word];
  if (word.length > 3 && word.endsWith('s')) forms.push(word.slice(0, -1));
  if (word.length > 4 && word.endsWith('es')) forms.push(word.slice(0, -2));
  if (word.length > 4 && word.endsWith('ies')) forms.push(`${word.slice(0, -3)}y`);
  return forms;
}

function roots(word: string): string[] {
  return singulars(word)
    .map(wordRoot)
    .filter((root): root is string => root !== null);
}

// How strongly a query token matches a document word: 1 if they're equal, if their stems
// are equal (singular/plural) or if they share a root («cobren» ~ «cobro», «facturen» ~
// «facturación», see wordRoot); ½ if they only share a long prefix («facturar» ~
// «facturables»), weaker evidence than a shared root; 0 otherwise. Words under 4
// characters only match exactly. The prefix must be 7 letters, or 6 when both words are
// longer: 5 would fold contrato ~ control, and a whole six-letter word is not a prefix of
// a longer one («custom» is not «customer»).
export function matchStrength(queryToken: string, word: string): number {
  if (queryToken === word) return 1;
  if (queryToken.length < 4 || word.length < 4) return 0;
  const forms = singulars(word);
  if (singulars(queryToken).some(form => forms.includes(form))) return 1;
  const wordRoots = roots(word);
  if (wordRoots.length && roots(queryToken).some(root => wordRoots.includes(root))) return 1;
  const common = commonPrefixLength(queryToken, word);
  return common >= 7 || (common >= 6 && Math.min(queryToken.length, word.length) > 6) ? 0.5 : 0;
}

function bestMatch(token: string, words: readonly string[]): number {
  let best = 0;
  for (const word of words) {
    best = Math.max(best, matchStrength(token, word));
    if (best === 1) break;
  }
  return best;
}

// Literal fields carry the strongest evidence, weighted by how much a hit
// there means: a query word in the product name is worth far more than the
// same word buried in a description. Expanded vocabulary (what a declared
// category/industry implies) is the weakest signal — enough to surface a
// Ventas product for "cotización" or "mayoreo", but never enough to outrank
// a product that literally says so.
const WEIGHTS = { name: 6, facet: 4, feature: 3, description: 2, provider: 1, vocabulary: 1.5 };

interface Scored<T> {
  product: T;
  score: number;
  matchedAll: boolean;
  /** Some query word hit the product's own text or declared facets, not just implied vocabulary. */
  literal: boolean;
}

function scoreProduct<T extends SearchableProduct>(
  tokens: readonly string[],
  product: T,
): Scored<T> {
  const nameWords = tokenize(product.name);
  // Both languages: a declared capability is equally strong evidence for an English query.
  const capabilityLabelWords = (product.capabilities ?? [])
    .flatMap(id => [capabilityLabels[id], capabilityEn[id]])
    .filter((label): label is string => Boolean(label));
  const facetWords = tokenize(
    [
      ...(product.categories ?? []),
      ...(product.industries ?? []),
      ...(product.companySizes ?? []),
      ...capabilityLabelWords,
    ].join(' '),
  );
  const featureWords = tokenize(product.feature);
  const descriptionWords = tokenize(product.description);
  const providerWords = tokenize(product.provider ?? '');
  const vocabularyWords = tokenize(
    [
      ...expandVocabulary(product.categories, product.industries, product.capabilities),
      ...(product.keywords ?? []),
    ].join(' '),
  );

  let score = 0;
  let matched = 0;
  let literal = false;
  for (const token of tokens) {
    let hit = false;
    for (const [words, weight] of [
      [nameWords, WEIGHTS.name],
      [facetWords, WEIGHTS.facet],
      [featureWords, WEIGHTS.feature],
      [descriptionWords, WEIGHTS.description],
      [providerWords, WEIGHTS.provider],
    ] as const) {
      const strength = bestMatch(token, words);
      if (strength > 0) {
        score += weight * strength;
        hit = true;
      }
    }
    if (hit) literal = true;
    const implied = bestMatch(token, vocabularyWords);
    if (implied > 0) {
      score += WEIGHTS.vocabulary * implied;
      hit = true;
    }
    if (hit) matched += 1;
  }
  return { product, score, matchedAll: matched === tokens.length, literal };
}

// A reusable scorer for one query, for callers that need to keep their own
// data structure around each product (the saved library filters entries, not
// bare products). Returns null when the query has no usable tokens; otherwise
// a function giving 0 (no match) or a positive relevance score.
//
// `requireLiteral` drops products that match only through implied vocabulary. Inside a
// category page every product shares that category's vocabulary, so without it any
// word of the field ("recordatorios" on Cobros) would keep the whole page (SHCWS-45).
export function makeQueryScorer(
  query: string,
  { requireLiteral = false }: { requireLiteral?: boolean } = {},
): ((product: SearchableProduct) => number) | null {
  const tokens = queryTokens(query);
  if (!tokens.length) return null;
  return product => {
    const scored = scoreProduct(tokens, product);
    return requireLiteral && !scored.literal ? 0 : scored.score;
  };
}

// Ranks products against a free-text query. Products that match every token
// of the query come first (the "all words present" intent), then by score,
// then by an optional caller tie-break (catalog priority, real interaction).
export function rankSearch<T extends SearchableProduct>(
  query: string,
  products: readonly T[],
  tieBreak?: (a: T, b: T) => number,
): T[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];
  return products
    .map(product => scoreProduct(tokens, product))
    .filter(result => result.score > 0)
    .sort(
      (a, b) =>
        Number(b.matchedAll) - Number(a.matchedAll) ||
        b.score - a.score ||
        (tieBreak ? tieBreak(a.product, b.product) : 0),
    )
    .map(result => result.product);
}
