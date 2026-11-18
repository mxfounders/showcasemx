import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  briefConsentVersion,
  briefFit,
  briefState,
  maxMatchesPerBrief,
  pickMatches,
  readBrief,
  readProposal,
  type MatchListing,
} from '../src/lib/briefs/model';
import { briefHref, readBriefPrefill } from '../src/lib/briefs/links';
import { authReturnTo } from '../src/lib/auth/return-to';
import { timelines } from '../src/lib/contacts/model';
import { groupDemandByTopic } from '../src/lib/search/demand-topics';
import { briefMatchEmail, briefProposalEmail } from '../src/lib/notifications/brief-email';
import {
  createNoticeUnsubscribeToken,
  readNoticeUnsubscribeToken,
} from '../src/lib/notifications/unsubscribe-token';
import { POST } from '../src/app/api/briefs/route';

const uuid = (n: number) => `6f1c2a40-1b2c-4d3e-8f40-${String(n).padStart(12, '0')}`;
const brief = (patch: Record<string, unknown> = {}) => ({
  problem: 'Cobramos a 60 distribuidores y conciliamos los pagos a mano en Excel.',
  budget: 'hasta 500 USD al mes',
  timeline: timelines[1],
  companySize: 'pyme',
  industry: 'Retail',
  country: 'MX',
  categories: ['Cobros'],
  capabilities: [],
  ...patch,
});
const listing = (patch: Partial<MatchListing> = {}): MatchListing => ({
  id: uuid(1),
  ownerId: uuid(100),
  name: 'Cobra Fácil',
  categories: ['Cobros'],
  ...patch,
});

test('a brief needs the problem, a known category, a size and a timeline', () => {
  const read = readBrief(brief());
  assert.ok(read);
  assert.equal(read.country, 'MX');
  assert.deepEqual(read.categories, ['Cobros']);
  assert.equal(readBrief(brief({ problem: 'muy corto' })), null);
  assert.equal(readBrief(brief({ categories: [] })), null);
  assert.equal(readBrief(brief({ categories: ['Inventado'] })), null);
  assert.equal(readBrief(brief({ categories: ['Cobros', 'Cobros'] })), null);
  assert.equal(
    readBrief(brief({ categories: ['Cobros', 'Ventas', 'Legal', 'Nómina'] })),
    null,
    'four categories',
  );
  assert.equal(readBrief(brief({ companySize: 'gigante' })), null);
  assert.equal(readBrief(brief({ timeline: 'mañana' })), null);
  assert.equal(readBrief(brief({ industry: 'Minería espacial' })), null);
  assert.equal(readBrief(brief({ country: 'XX' })), null);
  assert.equal(readBrief(brief({ industry: '', country: '' }))?.industry, null);
});

test('a capability only counts under a chosen category', () => {
  assert.ok(readBrief(brief({ capabilities: ['conciliacion-bancaria'] })));
  assert.equal(readBrief(brief({ capabilities: ['crm-pipeline'] })), null, 'CRM belongs to Ventas');
  assert.equal(readBrief(brief({ capabilities: ['no-existe'] })), null);
});

test('a proposal needs a listing, a message, a price and a timeline', () => {
  const ok = {
    solutionId: uuid(1),
    message: 'Lo resolvemos en dos semanas.',
    price: '199 USD',
    timeline: '2 semanas',
  };
  assert.deepEqual(readProposal(ok), ok);
  assert.equal(readProposal({ ...ok, message: 'corto' }), null);
  assert.equal(readProposal({ ...ok, price: '' }), null);
  assert.equal(readProposal({ ...ok, solutionId: 'cord' }), null);
});

test('matching: category is required and a declared answer closes the question', () => {
  const read = readBrief(brief())!;
  assert.ok(briefFit(read, listing()), 'never answered industry or size: still a fit');
  assert.equal(briefFit(read, listing({ categories: ['Ventas'] })), null);
  assert.equal(
    briefFit(read, listing({ industries: ['Salud'] })),
    null,
    'declared another industry',
  );
  assert.ok(briefFit(read, listing({ industries: [] })), 'serves any industry');
  assert.equal(briefFit(read, listing({ companySizes: ['corporativo'] })), null);
  assert.ok(
    briefFit(read, listing({ industries: ['Retail'], companySizes: ['pyme'] }))! >
      briefFit(read, listing())!,
    'a declared fit ranks above an unknown one',
  );
});

test('matching: asked capabilities exclude a listing that declared none of them', () => {
  const read = readBrief(brief({ capabilities: ['conciliacion-bancaria'] }))!;
  assert.equal(briefFit(read, listing({ capabilities: ['cobranza-recordatorios'] })), null);
  assert.ok(briefFit(read, listing({ capabilities: ['conciliacion-bancaria'] })));
  assert.ok(briefFit(read, listing({ capabilities: undefined })), 'never declared: kept');
});

test('a brief never goes to the buyer’s own listing and stops at the limit', () => {
  const read = readBrief(brief())!;
  const listings = Array.from({ length: maxMatchesPerBrief + 5 }, (_, n) =>
    listing({ id: uuid(n + 1), ownerId: uuid(100 + n) }),
  );
  const picked = pickMatches(read, uuid(100), listings);
  assert.equal(picked.length, maxMatchesPerBrief);
  assert.ok(picked.every(item => item.ownerId !== uuid(100)));
  assert.equal(pickMatches(read, uuid(999), listings, 0).length, 0);
});

test('state: hidden wins, then closed, then expired', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 1000).toISOString();
  assert.equal(briefState({ hidden_at: past, closed_at: past, expires_at: past }), 'hidden');
  assert.equal(briefState({ hidden_at: null, closed_at: past, expires_at: future }), 'closed');
  assert.equal(briefState({ hidden_at: null, closed_at: null, expires_at: past }), 'expired');
  assert.equal(briefState({ hidden_at: null, closed_at: null, expires_at: future }), 'open');
});

test('links pre-fill a bounded need and a known category, kept through sign-in', () => {
  assert.equal(briefHref(), '/account/briefs/new');
  const href = briefHref('  cobrar   a tiempo ', 'Cobros');
  assert.equal(href, '/account/briefs/new?necesidad=cobrar+a+tiempo&categoria=Cobros');
  assert.deepEqual(readBriefPrefill({ necesidad: 'x'.repeat(500), categoria: 'Inventada' }), {
    problem: 'x'.repeat(200),
    categories: [],
  });
  assert.equal(authReturnTo(href), href);
  assert.equal(
    authReturnTo('/account/briefs/new?necesidad=hola&categoria=Nope&next=https://evil.test'),
    '/account/briefs/new?necesidad=hola',
  );
  assert.equal(authReturnTo(`/account/needs/${uuid(1)}`), `/account/needs/${uuid(1)}`);
  assert.equal(authReturnTo('/account/needs/../../evil'), '/account');
});

test('searches with no results group by the topic their words point at', () => {
  const groups = groupDemandByTopic([
    { query: 'cobranza', searches: 3, empty: 3 },
    { query: 'cobrar facturas atrasadas', searches: 2, empty: 2 },
    { query: 'zzzz qqqq', searches: 4, empty: 4 },
  ]);
  const cobros = groups.find(group => group.value === 'Cobros');
  assert.ok(cobros);
  assert.equal(cobros.empty, 5);
  assert.equal(groups.at(-1)?.kind, 'none', 'searches with no topic go last');
});

test('the founder’s email never names the buyer and escapes what they wrote', () => {
  const email = briefMatchEmail({
    title: 'Una empresa busca algo que encaja con Cobra Fácil',
    briefId: uuid(1),
    origin: 'https://shwcs.site',
    brief: {
      problem: 'Necesitamos <script>alert(1)</script> conciliar pagos',
      categories: ['Cobros'],
      company_size: 'pyme',
      timeline: timelines[0],
      budget: '',
    },
  });
  const html = email.paragraphs.join('');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal(email.button.href, `https://shwcs.site/es/account/needs/${uuid(1)}`);
  const proposal = briefProposalEmail({
    title: 'Cobra Fácil te envió una propuesta',
    briefId: uuid(1),
    origin: 'https://shwcs.site',
    proposal: { name: 'Cobra Fácil', price: '199 USD', timeline: '2 semanas' },
  });
  assert.equal(proposal.button.href, `https://shwcs.site/es/account/briefs/${uuid(1)}`);
});

test('brief notices can be turned off with one click', () => {
  const secret = 's'.repeat(32);
  const token = createNoticeUnsubscribeToken(uuid(1), 'brief', secret);
  assert.ok(token);
  assert.deepEqual(readNoticeUnsubscribeToken(token, secret), {
    accountId: uuid(1),
    category: 'brief',
  });
});

test('the briefs API requires the same origin and a session', async () => {
  const url = 'http://localhost:3000/api/briefs';
  for (const [origin, status] of [
    ['https://evil.test', 403],
    ['http://localhost:3000', 401],
  ] as const) {
    const request = new NextRequest(url, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        ...brief(),
        action: 'create',
        id: uuid(1),
        consent: true,
        consentVersion: briefConsentVersion,
      }),
    });
    assert.equal((await POST(request)).status, status);
  }
});
