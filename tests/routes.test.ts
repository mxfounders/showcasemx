import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import test from 'node:test';
import { NextRequest } from 'next/server';
import * as staticInfo from 'next/dist/build/analysis/get-page-static-info';
import { getBlogSlugs } from '../src/lib/blog';
import { infoSlugs } from '../src/lib/info-pages';
import { isPagePath } from '../src/lib/routes';
import { categories, collections, industries } from '../src/lib/taxonomy';
import { config, middleware } from '../src/middleware';

// The compiler Next itself runs on `config.matcher`; exported, but not in its types.
const { getMiddlewareMatchers } = staticInfo as unknown as {
  getMiddlewareMatchers: (matcher: string[], nextConfig: object) => { regexp: string }[];
};

const appDir = join(__dirname, '..', 'src', 'app');
const localeDir = join(appDir, '[locale]');
const uuid = '3f2b8c1e-5d4a-4f6b-9c7e-2a1d0b9e8f7a';

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pageFiles(path);
    return name === 'page.tsx' ? [path] : [];
  });
}

// Every concrete URL each page under [locale] can serve, with the real slug sets the
// routes prerender. A new page directory fails here until src/lib/routes.ts knows it.
function samplePaths(file: string): string[][] {
  const segments = relative(localeDir, file)
    .split(sep)
    .slice(0, -1)
    .filter(segment => !/^\(.*\)$/.test(segment));
  if (segments.includes('[...catchAll]')) return [];
  let paths: string[][] = [[]];
  segments.forEach((segment, index) => {
    const parent = segments[index - 1];
    const values =
      segment === '[info]'
        ? [...infoSlugs]
        : segment === '[slug]'
          ? parent === 'explorar'
            ? categories.map(item => item.slug)
            : parent === 'industria'
              ? industries.map(item => item.slug)
              : parent === 'colecciones'
                ? collections.map(item => item.slug)
                : getBlogSlugs()
          : segment === '[id]'
            ? [uuid]
            : segment === '[token]'
              ? ['0123456789abcdef0123456789abcdef']
              : [segment];
    paths = paths.flatMap(path => values.map(value => [...path, value]));
  });
  return paths;
}

test('every page under [locale] is a known path', () => {
  const files = pageFiles(localeDir);
  assert.ok(files.length > 40);
  for (const file of files)
    for (const path of samplePaths(file))
      assert.equal(isPagePath(path), true, `/${path.join('/')} (${relative(appDir, file)})`);
});

test('paths no page can serve are rejected', () => {
  for (const path of [
    ['wp-login.php'],
    ['.env'],
    ['xmlrpc.php'],
    ['robots.txt'],
    ['wp-admin'],
    ['admin'],
    ['explorar'],
    ['explorar', 'cobros', 'extra'],
    ['soluciones', 'not-a-uuid'],
    ['comunidad', uuid, 'x'],
    ['blog', 'Not_A_Slug'],
    ['blog', 'no-existe'],
    ['explorar', 'foo'],
    ['industria', 'cobros'],
    ['colecciones', 'foo'],
    ['newsletter', 'other'],
    ['terminos', 'x'],
    ['account', '.env'],
  ])
    assert.equal(isPagePath(path), false, `/${path.join('/')}`);
});

const request = (path: string, language = 'es') =>
  new NextRequest(`http://localhost:3000${path}`, { headers: { 'accept-language': language } });

test('middleware answers impossible paths with a small real 404 in the right language', async () => {
  for (const [path, language, title] of [
    ['/wp-login.php', 'es', 'Página no encontrada'],
    ['/.env', 'en', 'Page not found'],
    ['/es/wp-admin', 'en', 'Página no encontrada'],
    ['/en/soluciones/not-a-uuid', 'es', 'Page not found'],
  ]) {
    const response = await middleware(request(path, language));
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
    const body = await response.text();
    assert.ok(body.includes(title), path);
    assert.ok(body.length < 4096, `${path} is ${body.length} bytes`);
  }
});

test('middleware still redirects real unprefixed pages and passes real ones through', () => {
  const redirect = middleware(request('/terminos'));
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get('location'), 'http://localhost:3000/es/terminos');

  for (const path of [
    '/es',
    '/en/explorar/cobros',
    `/es/soluciones/${uuid}`,
    // Transport forms of a page are judged as the page.
    '/es/comunidad.rsc',
    '/es/comunidad.prefetch.rsc',
    '/es/comunidad.segments/_tree.segment.rsc',
  ]) {
    const response = middleware(request(path));
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get('x-middleware-request-x-locale'), path);
  }
});

const nextSpecialFiles = new Set(['global-error', 'layout', 'not-found', 'error', 'loading']);

const metadataRoutes: Record<string, string> = {
  manifest: 'manifest.webmanifest',
  robots: 'robots.txt',
  sitemap: 'sitemap.xml',
};

test('the middleware skips every file the site serves and nothing else', () => {
  const [{ regexp }] = getMiddlewareMatchers(config.matcher, {});
  const runs = (path: string) => new RegExp(regexp).test(path);

  const served = ['/api/health', '/api/v1/unknown', '/_next/static/chunks/main.js'];
  // Route handlers outside [locale]: src/app/llms.txt and src/app/soluciones/[file].
  served.push('/llms.txt', `/soluciones/${uuid}.md`, '/relay/static/array.js');
  served.push('/_vercel/insights/script.js');
  for (const name of readdirSync(join(__dirname, '..', 'public'))) {
    const isDir = statSync(join(__dirname, '..', 'public', name)).isDirectory();
    served.push(isDir ? `/${name}/file.png` : `/${name}`);
  }
  for (const name of readdirSync(appDir)) {
    if (statSync(join(appDir, name)).isDirectory() || name.endsWith('.css')) continue;
    const route = name.match(/^(.+)\.tsx?$/)?.[1];
    // Next's special files (error screens, layouts) render inside a route; they are not URLs.
    if (route && nextSpecialFiles.has(route)) continue;
    if (route) {
      assert.ok(metadataRoutes[route], `src/app/${name}: add its URL to the matcher and here`);
      served.push(`/${metadataRoutes[route]}`);
    } else served.push(`/${name}`);
  }
  for (const path of served) assert.equal(runs(path), false, `${path} must skip middleware`);

  for (const path of [
    '/',
    '/es',
    '/es/comunidad',
    '/wp-login.php',
    '/.env',
    '/robots.txt.bak',
    '/api',
  ])
    assert.equal(runs(path), true, `${path} must reach middleware`);
});

test('a page share image is a known path wherever the page is', () => {
  assert.equal(isPagePath(['explorar', categories[0].slug, 'opengraph-image']), true);
  assert.equal(isPagePath(['soluciones', uuid, 'opengraph-image-1a2b3c']), true);
  assert.equal(isPagePath(['explorar', 'no-existe', 'opengraph-image']), false);
  assert.equal(isPagePath(['resenar', 'not-a-token']), false);
  assert.equal(isPagePath(['weekly', 'unsubscribe']), true);
});
