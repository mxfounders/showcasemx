// The closed set of slugs served by app/[locale]/(marketing)/[info]. Lives
// outside the page so navigation tests can check footer and navbar links
// against it without importing the page's components.
export const storyPages = [
  'aplicar',
  'criterios',
  'proceso',
  'faq',
  'el-proyecto',
  'changelog',
] as const;
export const legalPages = ['privacidad', 'terminos', 'cookies'] as const;

export type InfoSlug = (typeof storyPages)[number] | (typeof legalPages)[number];

export const infoSlugs: readonly InfoSlug[] = [...storyPages, ...legalPages];

export function isInfoSlug(value: string): value is InfoSlug {
  return (infoSlugs as readonly string[]).includes(value);
}

/** Info pages that ask search engines not to index them; the sitemap leaves them out. */
export const noindexInfoSlugs: readonly InfoSlug[] = ['privacidad', 'terminos'];
