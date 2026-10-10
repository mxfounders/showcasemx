import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { isLocale } from '../src/i18n/config';
import { negotiateLocale, requestLocale } from '../src/i18n/negotiate';
import { localePath, stripLocale } from '../src/i18n/paths';
import { middleware } from '../src/middleware';

test('isLocale accepts only supported locales', () => {
  assert.equal(isLocale('es'), true);
  assert.equal(isLocale('en'), true);
  assert.equal(isLocale('fr'), false);
  assert.equal(isLocale(''), false);
});

test('negotiateLocale picks the best supported language and falls back to Spanish', () => {
  assert.equal(negotiateLocale('en-US,en;q=0.9'), 'en');
  assert.equal(negotiateLocale('fr-FR,en;q=0.5'), 'en');
  assert.equal(negotiateLocale('es-MX'), 'es');
  assert.equal(negotiateLocale('de-DE'), 'es');
  assert.equal(negotiateLocale('*'), 'es');
  assert.equal(negotiateLocale(null), 'es');
});

test('requestLocale follows the page that issued the request before the browser preference', () => {
  const request = (headers: Record<string, string>) =>
    new Request('http://localhost:3000/api/library', { headers });
  assert.equal(
    requestLocale(
      request({ referer: 'http://localhost:3000/en/account', 'accept-language': 'es' }),
    ),
    'en',
  );
  assert.equal(
    requestLocale(
      request({ referer: 'http://localhost:3000/es/account', 'accept-language': 'en' }),
    ),
    'es',
  );
  assert.equal(
    requestLocale(request({ referer: 'http://localhost:3000/', 'accept-language': 'en' })),
    'en',
  );
  assert.equal(requestLocale(request({ referer: 'not a url', 'accept-language': 'en-GB' })), 'en');
  assert.equal(requestLocale(request({})), 'es');
});

test('middleware prefixes the locale and keeps the query string', () => {
  const response = middleware(
    new NextRequest('http://localhost:3000/sign-in?next=%2Faccount%2Fsaved', {
      headers: { 'accept-language': 'en' },
    }),
  );
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get('location'),
    'http://localhost:3000/en/sign-in?next=%2Faccount%2Fsaved',
  );
});

test('middleware keeps the language of the page a bare internal link came from', () => {
  const response = middleware(
    new NextRequest('http://localhost:3000/account/saved', {
      headers: { referer: 'http://localhost:3000/en/account', 'accept-language': 'es' },
    }),
  );
  assert.equal(response.headers.get('location'), 'http://localhost:3000/en/account/saved');
});

test('middleware forwards the route locale to the page as a request header', () => {
  const response = middleware(new NextRequest('http://localhost:3000/en/blog'));
  assert.equal(response.headers.get('x-middleware-request-x-locale'), 'en');
});

test('localePath prefixes internal paths once and leaves everything else alone', () => {
  assert.equal(localePath('/account/saved', 'en'), '/en/account/saved');
  assert.equal(localePath('/sign-in?next=%2Faccount', 'es'), '/es/sign-in?next=%2Faccount');
  assert.equal(localePath('/', 'en'), '/en');
  assert.equal(localePath('/#catalogo', 'en'), '/en#catalogo');
  assert.equal(localePath('/?q=cobros', 'es'), '/es?q=cobros');
  // Already localized (navigationHref, language switcher) or not a page at all.
  assert.equal(localePath('/en/account', 'es'), '/en/account');
  assert.equal(localePath('/es', 'en'), '/es');
  assert.equal(localePath('/api/account/avatar', 'en'), '/api/account/avatar');
  assert.equal(localePath('https://cordhq.app/', 'en'), 'https://cordhq.app/');
  assert.equal(localePath('//evil.example', 'en'), '//evil.example');
  assert.equal(localePath('#top', 'en'), '#top');
  assert.equal(localePath('mailto:hola@shwcs.site', 'en'), 'mailto:hola@shwcs.site');
  // A path that merely starts with the letters of a locale is still prefixed.
  assert.equal(localePath('/estadisticas', 'en'), '/en/estadisticas');
});

test('stripLocale returns the route comparable with semantic hrefs', () => {
  assert.equal(stripLocale('/en/account/saved'), '/account/saved');
  assert.equal(stripLocale('/es'), '/');
  assert.equal(stripLocale('/estadisticas'), '/estadisticas');
});
