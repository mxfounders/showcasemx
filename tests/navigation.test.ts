import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { i18n } from '../src/i18n/config';
import { getDictionary } from '../src/i18n/get-dictionary';
import { getPostSummaries } from '../src/lib/blog';
import { isInfoSlug, noindexInfoSlugs } from '../src/lib/info-pages';
import { localized, staticPages } from '../src/lib/sitemap';
import { availableNavigation, navigationHref } from '../src/lib/navigation-destinations';
import { categories, collections, industries } from '../src/lib/taxonomy';

const localeRoot = join(process.cwd(), 'src/app/[locale]');
// Route groups like (marketing) don't add a URL segment.
const roots = [
  localeRoot,
  ...readdirSync(localeRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('('))
    .map(entry => join(localeRoot, entry.name)),
];

/** True when a locale-less path is served by a page of this app. */
function resolves(path: string): boolean {
  const clean = path.split('#')[0].split('?')[0].replace(/\/$/, '');
  if (clean === '') return true;
  const [first, second, ...rest] = clean.slice(1).split('/');
  if (rest.length === 0) {
    if (first === 'explorar' && second) return categories.some(item => item.slug === second);
    if (first === 'industria' && second) return industries.some(item => item.slug === second);
    if (first === 'colecciones' && second) return collections.some(item => item.slug === second);
    if (first === 'blog' && second)
      return getPostSummaries('es').some(post => post.slug === second);
    if (!second && isInfoSlug(first)) return true;
  }
  const segments = clean.slice(1).split('/');
  return roots.some(root => existsSync(join(root, ...segments, 'page.tsx')));
}

type Column = { links: readonly { href: string }[] };

function footerLinks(sections: readonly { cols: readonly Column[] }[]) {
  return sections.flatMap(section => section.cols.flatMap(col => col.links.map(link => link.href)));
}

function navbarLinks(
  menus: Record<string, { columns: readonly Column[]; featured: { href: string } }>,
) {
  return Object.values(menus).flatMap(menu => [
    menu.featured.href,
    ...menu.columns.flatMap(col => col.links.map(link => link.href)),
  ]);
}

test('the resolver itself tells real routes from missing ones', () => {
  assert.equal(resolves('/'), true);
  assert.equal(resolves('/explorar/cobros'), true);
  assert.equal(resolves('/explorar/no-existe'), false);
  assert.equal(resolves('/criterios'), true);
  assert.equal(resolves('/comunidad'), true);
  assert.equal(resolves('/account/opportunities'), true);
  assert.equal(resolves('/sponsor'), false);
});

test('no visible footer or navbar link leads to a 404', async () => {
  for (const locale of i18n.locales) {
    const dict = await getDictionary(locale);
    const hrefs = [...footerLinks(dict.footer.sections), ...navbarLinks(dict.navbar.menus)];
    assert.ok(hrefs.length > 10, `${locale}: expected the menus to have links`);
    for (const href of hrefs.filter(availableNavigation)) {
      const target = navigationHref(href, locale);
      assert.ok(target.startsWith(`/${locale}`), `${locale}: ${href} lost its locale`);
      const path = target.slice(`/${locale}`.length) || '/';
      assert.ok(resolves(path), `${locale}: ${href} → ${target} has no page`);
    }
  }
});

test('the sitemap lists only real, indexable public pages, each with its translations', () => {
  const pages = staticPages();
  for (const page of pages) assert.ok(resolves(page.path || '/'), `${page.path} has no page`);
  for (const slug of noindexInfoSlugs)
    assert.ok(!pages.some(page => page.path === `/${slug}`), `${slug} is noindex`);
  assert.ok(!pages.some(page => /\/(account|sign-in|sign-up)/.test(page.path)));
  const entries = pages.flatMap(localized);
  assert.equal(entries.length, pages.length * i18n.locales.length);
  for (const entry of entries) {
    assert.ok(entry.url.startsWith('https://shwcs.site/'));
    assert.deepEqual(Object.keys(entry.alternates?.languages ?? {}).sort(), ['en', 'es']);
  }
});
