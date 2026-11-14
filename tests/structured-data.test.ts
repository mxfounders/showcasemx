import assert from 'node:assert/strict';
import test from 'node:test';
import { getBlogPost } from '../src/lib/blog';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  siteJsonLd,
  solutionJsonLd,
} from '../src/lib/structured-data';

const data = {
  name: 'Cord',
  kind: 'Software',
  category: 'Ventas',
  categories: ['Ventas', 'Cobros'],
  problem: 'Cotiza, factura y cobra.',
  audience: 'Pymes',
  website: 'https://cordhq.app/',
};

test('a listing is described with its public data and only a real rating', () => {
  const rated = solutionJsonLd({
    id: 'abc',
    locale: 'es',
    data,
    publishedAt: '2026-09-03 10:00:00+00',
    reviews: { count: 3, average: 4.666 },
  });
  assert.deepEqual(rated['@type'], ['SoftwareApplication', 'Product']);
  assert.equal(rated.url, 'https://shwcs.site/es/soluciones/abc');
  // Software carries category; a Service carries serviceType instead.
  assert.equal('category' in rated ? rated.category : undefined, 'Ventas, Cobros');
  assert.deepEqual(rated.aggregateRating, {
    '@type': 'AggregateRating',
    ratingValue: 4.67,
    reviewCount: 3,
    bestRating: 5,
    worstRating: 1,
  });
  // No reviews: no rating at all, never a made-up one; no price is invented either.
  const unrated = solutionJsonLd({
    id: 'abc',
    locale: 'es',
    data,
    publishedAt: null,
    reviews: { count: 0, average: null },
  });
  assert.equal('aggregateRating' in unrated, false);
  assert.equal('offers' in unrated, false);
  assert.equal('dateModified' in unrated, false);
  // Agencies and services are a Service.
  assert.equal(
    solutionJsonLd({
      id: 'x',
      locale: 'en',
      data: { ...data, kind: 'Agencia' },
      publishedAt: null,
      reviews: { count: 0, average: null },
    })['@type'],
    'Service',
  );
  assert.ok(!JSON.stringify(rated).includes('contactEmail'));
});

test('articles, breadcrumbs, FAQ and the site search have their schema shape', () => {
  const post = getBlogPost('guardar-no-es-contactar', 'es')!;
  const article = articleJsonLd(post, 'es');
  assert.equal(article['@type'], 'Article');
  assert.equal(article.datePublished, post.publishedAt);
  assert.equal(article.headline, post.title);
  const crumbs = breadcrumbJsonLd([
    { name: 'shwcs', path: '/es' },
    { name: 'Blog', path: '/es/blog' },
  ]);
  assert.equal(crumbs.itemListElement[1].item, 'https://shwcs.site/es/blog');
  assert.equal(crumbs.itemListElement[1].position, 2);
  const faq = faqJsonLd([{ question: '¿Qué es?', answer: 'Un <strong>catálogo</strong>.' }]);
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'Un catálogo.');
  const site = JSON.stringify(siteJsonLd('en'));
  assert.ok(
    site.includes('"SearchAction"') && site.includes('https://shwcs.site/en/buscar?q={query}'),
  );
});
