import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  conflictsWithWebsite,
  isWorkEmailDomain,
  readReply,
  readReview,
  readReviewReport,
  reviewLevel,
  reviewWeights,
} from '../src/lib/reviews/model';
import { solutionScore } from '../src/lib/solutions/ranking';
import { countryCodes, isCountryCode } from '../src/lib/countries';
import { es } from '../src/i18n/dictionaries/es';
import { en } from '../src/i18n/dictionaries/en';
import { POST as reviewsPost } from '../src/app/api/solutions/[id]/reviews/route';

const valid = {
  name: 'Ana López',
  rating: 4,
  recommends: true,
  headline: 'Ordenó nuestra cobranza',
  useCase: 'Cobranza mensual de 300 clientes desde marzo de 2026.',
  pros: 'Los recordatorios automáticos bajaron la cartera vencida.',
  cons: 'Los reportes por vendedor todavía son limitados.',
  usageDuration: '6to12m',
  companySize: 'pyme',
  country: 'MX',
};

test('readReview accepts a complete review and normalises optional fields', () => {
  const parsed = readReview({ ...valid, name: '  Ana López  ', companySize: '', country: '' });
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  assert.equal(parsed.review.name, 'Ana López');
  assert.equal(parsed.review.companySize, null);
  assert.equal(parsed.review.country, null);
});

test('readReview names the first field that fails, with a stable code', () => {
  const cases: [Record<string, unknown>, string, string][] = [
    [{ name: '' }, 'name', 'required'],
    [{ name: 'x'.repeat(61) }, 'name', 'length'],
    [{ rating: 0 }, 'rating', 'required'],
    [{ rating: 4.5 }, 'rating', 'required'],
    [{ rating: '5' }, 'rating', 'required'],
    [{ recommends: 'yes' }, 'recommends', 'required'],
    [{ headline: 'Ok' }, 'headline', 'length'],
    [{ useCase: 'Muy corto' }, 'useCase', 'length'],
    [{ pros: '' }, 'pros', 'required'],
    [{ cons: 'x'.repeat(1501) }, 'cons', 'length'],
    [{ usageDuration: 'forever' }, 'usageDuration', 'required'],
    [{ companySize: 'huge' }, 'companySize', 'invalid'],
    [{ country: 'mx' }, 'country', 'invalid'],
    [{ country: 'ZZ' }, 'country', 'invalid'],
  ];
  for (const [patch, field, code] of cases) {
    const parsed = readReview({ ...valid, ...patch });
    assert.equal(parsed.ok, false, JSON.stringify(patch));
    if (!parsed.ok) assert.deepEqual(parsed.error, { field, code }, JSON.stringify(patch));
  }
});

test('any country can review, not a fixed market list', () => {
  for (const code of ['MX', 'US', 'ES', 'BR', 'IN', 'NG', 'JP', 'DE', 'KE'])
    assert.ok(isCountryCode(code), code);
  for (const code of ['EU', 'UN', 'ZZ', 'XX', 'mx', 'MEX'])
    assert.equal(isCountryCode(code), false, code);
  const all = countryCodes();
  assert.ok(all.length > 200, `only ${all.length} countries`);
  assert.equal(new Set(all).size, all.length);
});

test('replies and reports are bounded; an empty reply removes it', () => {
  assert.equal(readReply('  Gracias por escribir.  '), 'Gracias por escribir.');
  assert.equal(readReply('   '), null);
  assert.equal(readReply('x'.repeat(1501)), undefined);
  assert.equal(readReply(42), undefined);
  assert.deepEqual(
    readReviewReport({ reason: 'conflict', details: 'Es empleado del proveedor.' }),
    {
      reason: 'conflict',
      details: 'Es empleado del proveedor.',
    },
  );
  assert.equal(readReviewReport({ reason: 'conflict', details: 'corto' }), null);
  assert.equal(readReviewReport({ reason: 'hate', details: 'Una razón suficiente.' }), null);
});

test('verification level: unverified, a free mailbox or a company domain', () => {
  assert.equal(reviewLevel('gmail.com', false), 'unverified');
  assert.equal(reviewLevel('acme.com', false), 'unverified');
  assert.equal(reviewLevel('gmail.com', true), 'email');
  assert.equal(reviewLevel('acme.com.mx', true), 'work');
  for (const domain of [
    'gmail.com',
    'hotmail.com',
    'hotmail.co.uk',
    'outlook.es',
    'yahoo.com.mx',
    'icloud.com',
    'proton.me',
    'gmx.de',
  ])
    assert.equal(isWorkEmailDomain(domain), false, domain);
  for (const domain of ['flouvia.com', 'cordhq.app', 'empresa.mx', 'mail.acme.io'])
    assert.equal(isWorkEmailDomain(domain), true, domain);
});

test('writing from the vendor domain is a conflict of interest; free mailboxes never are', () => {
  assert.equal(conflictsWithWebsite('cordhq.app', 'cordhq.app'), true);
  assert.equal(conflictsWithWebsite('cordhq.app', 'www.cordhq.app'), true);
  assert.equal(conflictsWithWebsite('mx.cordhq.app', 'cordhq.app'), true);
  assert.equal(conflictsWithWebsite('cordhq.app', 'app.cordhq.app'), true);
  assert.equal(conflictsWithWebsite('flouvia.com', 'cordhq.app'), false);
  assert.equal(conflictsWithWebsite('gmail.com', 'gmail.com'), false);
  assert.equal(conflictsWithWebsite('acme.com', null), false);
  // A shared suffix is not the same company.
  assert.equal(conflictsWithWebsite('notcordhq.app', 'cordhq.app'), false);
});

test('reviews feed the ranking by stars and verification, and never subtract', () => {
  assert.equal(solutionScore(0, 0, 0, 0, 0), 0);
  assert.equal(solutionScore(1, 0, 0, 0), solutionScore(1, 0, 0, 0, 0));
  const fiveStarWork = 5 * reviewWeights.work;
  const oneStarEmail = 1 * reviewWeights.email;
  assert.equal(solutionScore(0, 0, 0, 0, fiveStarWork), 7.5);
  assert.ok(solutionScore(0, 0, 0, 0, oneStarEmail) > 0);
  // One five-star review outweighs one comment, the strongest signal before reviews.
  assert.ok(solutionScore(0, 0, 0, 0, 5 * reviewWeights.email) > solutionScore(0, 0, 1, 0));
});

test('every validation error has copy in both languages', () => {
  for (const field of Object.keys(es.reviews.errors.fields)) {
    assert.ok(en.reviews.errors.fields[field as keyof typeof en.reviews.errors.fields], field);
  }
  const parsed = readReview({});
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.ok(es.reviews.errors.fields[parsed.error.field]);
});

test('the reviews API rejects foreign origins, bad ids and anonymous writes before storage', async () => {
  const url = 'https://shwcs.example/api/solutions/00000000-0000-4000-8000-000000000001/reviews';
  const call = (origin: string, id = '00000000-0000-4000-8000-000000000001') =>
    reviewsPost(
      new NextRequest(url, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'save', reviewId: '00000000-0000-4000-8000-000000000002' }),
      }),
      { params: Promise.resolve({ id }) },
    );
  assert.equal((await call('https://evil.example')).status, 403);
  assert.equal((await call('https://shwcs.example', 'not-a-uuid')).status, 400);
  assert.equal((await call('https://shwcs.example')).status, 401);
});

test('review filters keep the viewer first and only offer values that exist', async () => {
  const { filterReviews, noReviewFilters, reviewFacets } =
    await import('../src/lib/reviews/filters');
  const base = {
    recommends: true,
    headline: 'Título',
    useCase: 'x',
    pros: 'x',
    cons: 'x',
    usageDuration: 'lt6m' as const,
    level: 'email' as const,
    edited: false,
    reply: null,
  };
  const reviews = [
    {
      ...base,
      id: 'a',
      name: 'A',
      rating: 5,
      companySize: 'pyme',
      country: 'MX',
      createdAt: '2026-10-01T00:00:00Z',
      mine: false,
    },
    {
      ...base,
      id: 'b',
      name: 'B',
      rating: 2,
      companySize: null,
      country: 'ES',
      createdAt: '2026-10-03T00:00:00Z',
      mine: false,
    },
    {
      ...base,
      id: 'c',
      name: 'C',
      rating: 4,
      companySize: 'pyme',
      country: null,
      createdAt: '2026-10-02T00:00:00Z',
      mine: false,
    },
    {
      ...base,
      id: 'm',
      name: 'Me',
      rating: 1,
      companySize: null,
      country: null,
      createdAt: '2026-09-01T00:00:00Z',
      mine: true,
    },
  ];
  const ids = (filters = noReviewFilters) => filterReviews(reviews, filters).map(r => r.id);
  assert.deepEqual(ids(), ['m', 'b', 'c', 'a']);
  assert.deepEqual(ids({ ...noReviewFilters, sort: 'highest' }), ['m', 'a', 'c', 'b']);
  assert.deepEqual(ids({ ...noReviewFilters, sort: 'lowest' }), ['m', 'b', 'c', 'a']);
  assert.deepEqual(ids({ ...noReviewFilters, size: 'pyme' }), ['m', 'c', 'a']);
  assert.deepEqual(ids({ ...noReviewFilters, stars: 5, country: 'MX' }), ['m', 'a']);
  assert.deepEqual(ids({ ...noReviewFilters, country: 'BR' }), ['m']);
  const facets = reviewFacets(reviews.filter(r => !r.mine));
  assert.deepEqual(facets.stars, [5, 4, 2]);
  assert.deepEqual(facets.sizes, ['pyme']);
  assert.deepEqual(facets.countries.sort(), ['ES', 'MX']);
});
