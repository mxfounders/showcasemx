import type { Dictionary } from '@/i18n/dictionary';

// The closed set of editorial and legal pages served by /[locale]/[info]. Shared by
// that route, the middleware's route check (src/lib/routes.ts) and the sitemap.
export const storyPages = [
  'aplicar',
  'criterios',
  'proceso',
  'faq',
  'el-proyecto',
  'changelog',
] as const;
export const legalPages = [
  'privacidad',
  'terminos',
  'cookies',
] as const satisfies readonly (keyof Dictionary['legal']['pages'])[];

export type InfoSlug = (typeof storyPages)[number] | (typeof legalPages)[number];

export const infoSlugs: readonly InfoSlug[] = [...storyPages, ...legalPages];

export function isInfoSlug(value: string): value is InfoSlug {
  return (infoSlugs as readonly string[]).includes(value);
}

/** Pages kept out of search results until their legal review closes (§18). */
export const unindexedInfoPages: readonly InfoSlug[] = ['privacidad', 'terminos'];
