import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  classifyTouch,
  impliedRef,
  landingKind,
  likelyBot,
  normalizeHost,
  normalizeTag,
  pageSteps,
  readFunnel,
  readSignupOrigin,
  signupIntent,
  storableSignupOrigin,
} from '../src/lib/attribution/classify';
import {
  badgeUrl,
  newsletterUrl,
  noticeUrl,
  shareUrl,
  tagUrl,
} from '../src/lib/attribution/conventions';
import { outboundUrl } from '../src/lib/solutions/outbound';
import { composeNotice } from '../src/lib/notifications/compose';
import { POST as visit } from '../src/app/api/visit/route';
import {
  BUYER_STEPS,
  FOUNDER_STEPS,
  conversions,
  countAccount,
  emptyCounts,
  furthest,
  readChannel,
  recentWeeks,
  sides,
  weekOf,
  type CohortAccount,
} from '../ops/src/lib/funnels';

test('tags are normalized and never carry a person', () => {
  assert.equal(normalizeTag('  Lanzamiento Noviembre '), 'lanzamiento-noviembre');
  assert.equal(normalizeTag('Campaña_Ñandú'), 'campana_nandu');
  assert.equal(normalizeTag('chatgpt.com'), 'chatgpt.com');
  // A newsletter edition date stays; a phone number does not.
  assert.equal(normalizeTag('2026-11-17'), '2026-11-17');
  assert.equal(normalizeTag('55 1234 5678'), '');
  assert.equal(normalizeTag('+52 (55) 1234-5678'), '');
  assert.equal(normalizeTag('ana@empresa.com'), '');
  assert.equal(normalizeTag('https://evil.example/x'), '');
  assert.equal(normalizeTag('a/b'), '');
  assert.equal(normalizeTag(42), '');
  assert.equal(normalizeTag('x'.repeat(80)).length, 60);
});

test('hosts keep only the domain', () => {
  assert.equal(normalizeHost('WWW.Google.com.mx'), 'google.com.mx');
  assert.equal(normalizeHost('l.facebook.com'), 'facebook.com');
  assert.equal(normalizeHost('cordhq.app:443'), 'cordhq.app');
  assert.equal(normalizeHost('localhost'), '');
  assert.equal(normalizeHost('192.168.1.10'), '');
  assert.equal(normalizeHost('evil.com/path'), '');
  assert.equal(normalizeHost(undefined), '');
});

test('the channel comes from ref, then utm, then the linking site', () => {
  const c = (touch: Parameters<typeof classifyTouch>[0]) => classifyTouch(touch);
  assert.deepEqual(c({ ref: 'badge', referrer: 'www.cordhq.app', landing: 'listing' }), {
    channel: 'badge',
    source: '',
    medium: '',
    campaign: '',
    site: 'cordhq.app',
    landing: 'listing',
  });
  assert.equal(c({ ref: 'invite' }).channel, 'invitation');
  assert.deepEqual(
    [c({ ref: 'Socio-Uno' }).channel, c({ ref: 'Socio-Uno' }).source],
    ['referral', 'socio-uno'],
  );
  // Share: the convention and the links shared before it.
  assert.deepEqual(
    [c({ source: 'whatsapp', medium: 'share', campaign: 'listing' }).channel],
    ['share'],
  );
  const legacy = c({ source: 'share', medium: 'linkedin' });
  assert.deepEqual([legacy.channel, legacy.source, legacy.medium], ['share', 'linkedin', 'share']);
  assert.equal(
    c({ source: 'newsletter', medium: 'email', campaign: '2026-11-17' }).channel,
    'newsletter',
  );
  assert.equal(c({ source: 'shwcs', medium: 'email', campaign: 'contact' }).channel, 'email');
  assert.equal(c({ source: 'google', medium: 'cpc' }).channel, 'paid');
  assert.deepEqual(
    [c({ source: 'chatgpt.com' }).channel, c({ source: 'chatgpt.com' }).source],
    ['ai', 'chatgpt'],
  );
  assert.equal(c({ source: 'linkedin', medium: 'social' }).channel, 'social');
  assert.equal(c({ source: 'linkedin' }).channel, 'social');
  assert.equal(c({ source: 'partner', medium: 'banner' }).channel, 'campaign');
  // Referrers: assistants before search (gemini.google.com is not Google search).
  assert.deepEqual(
    [c({ referrer: 'gemini.google.com' }).channel, c({ referrer: 'gemini.google.com' }).source],
    ['ai', 'gemini'],
  );
  assert.equal(c({ referrer: 'chatgpt.com' }).channel, 'ai');
  assert.equal(c({ referrer: 'www.perplexity.ai' }).channel, 'ai');
  assert.deepEqual(
    [c({ referrer: 'www.google.com.mx' }).channel, c({ referrer: 'google.es' }).source],
    ['organic', 'google'],
  );
  assert.equal(c({ referrer: 'duckduckgo.com' }).channel, 'organic');
  assert.equal(c({ referrer: 'lnkd.in' }).channel, 'social');
  assert.equal(c({ referrer: 't.co' }).source, 'x');
  assert.equal(c({ referrer: 'mail.google.com' }).channel, 'email');
  assert.deepEqual(
    [c({ referrer: 'blog.example.com' }).channel, c({ referrer: 'blog.example.com' }).source],
    ['referral', 'blog.example.com'],
  );
  // shwcs itself, or nothing at all, is a direct visit.
  assert.equal(c({ referrer: 'shwcs.site' }).channel, 'direct');
  assert.equal(c({}).channel, 'direct');
  assert.equal(c(null).channel, 'direct');
  // A tag that looked personal is dropped before classifying.
  assert.equal(c({ source: 'ana@x.com' }).channel, 'direct');
});

test('landing pages and the steps they count', () => {
  assert.equal(landingKind('/es'), 'home');
  assert.equal(landingKind('/'), 'home');
  assert.equal(landingKind('/en/explorar/cobros'), 'catalog');
  assert.equal(landingKind('/es/buscar'), 'catalog');
  assert.equal(landingKind('/es/soluciones/cord'), 'listing');
  assert.equal(landingKind('/es/aplicar'), 'apply');
  assert.equal(landingKind('/es/resenar/abc'), 'review');
  assert.equal(landingKind('/es/account/saved'), 'account');
  assert.equal(landingKind('/es/sign-up'), 'auth');
  assert.equal(landingKind('/es/faq'), 'info');
  assert.equal(landingKind('/es/blog/x'), 'blog');
  assert.deepEqual(pageSteps('/es/industria/retail'), ['browse']);
  assert.deepEqual(pageSteps('/en/aplicar'), ['apply']);
  assert.deepEqual(pageSteps('/es'), []);
  assert.equal(impliedRef('/es/resenar/abc'), 'invite');
  assert.equal(impliedRef('/es'), undefined);
});

test('funnel beacons keep only known steps, once', () => {
  assert.deepEqual(
    readFunnel({ steps: ['visit', 'listing', 'visit', 'hack'], touch: { referrer: 'google.com' } }),
    {
      steps: ['visit', 'listing'],
      touch: {
        source: undefined,
        medium: undefined,
        campaign: undefined,
        ref: undefined,
        referrer: 'google.com',
        landing: undefined,
      },
    },
  );
  assert.equal(readFunnel({ steps: [], touch: {} }), null);
  assert.equal(readFunnel({ steps: ['visit'] }), null);
  assert.equal(readFunnel('visit'), null);
});

test('a sign-up says why it came and where from', () => {
  assert.equal(signupIntent('/account/solutions/new', false), 'founder');
  assert.equal(signupIntent('/account', true), 'founder');
  assert.equal(signupIntent('/account/saved?project=catalog%3Acord', false), 'buyer');
  assert.equal(signupIntent('/account/contacts/new?solution=x', false), 'buyer');
  assert.equal(signupIntent('/resenar/abc', false), 'buyer');
  assert.equal(signupIntent('/account', false), '');
  assert.equal(signupIntent(undefined, false), '');
  const origin = readSignupOrigin({
    touch: { source: 'newsletter', medium: 'email', campaign: '2026-11-17', landing: 'home' },
    applied: false,
    next: '/account/solutions/new',
  });
  assert.equal(origin?.channel, 'newsletter');
  assert.equal(origin?.intent, 'founder');
  assert.equal(origin?.landing, 'home');
  assert.equal(readSignupOrigin(null), null);
  assert.equal(readSignupOrigin({ touch: 'x' }), null);
  // Google keeps it through the OAuth state, as a JSON string from the start link.
  const stored = storableSignupOrigin(
    JSON.stringify({ touch: { ref: 'badge', referrer: 'a.com' }, applied: true, next: '/account' }),
  );
  assert.equal(stored?.applied, true);
  assert.equal(readSignupOrigin(stored)?.channel, 'badge');
  assert.equal(storableSignupOrigin('{nope'), null);
  assert.equal(storableSignupOrigin('x'.repeat(3000)), null);
});

test('bots and scripted clients are not counted', () => {
  assert.equal(likelyBot('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
  assert.equal(likelyBot('Mozilla/5.0 HeadlessChrome/120'), true);
  assert.equal(likelyBot('curl/8.0'), true);
  assert.equal(likelyBot(null), true);
  assert.equal(likelyBot('Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605'), false);
});

test('links follow the fixed conventions without overwriting tags', () => {
  assert.equal(
    shareUrl('https://shwcs.site/es/soluciones/cord', 'whatsapp', 'listing'),
    'https://shwcs.site/es/soluciones/cord?utm_source=whatsapp&utm_medium=share&utm_campaign=listing',
  );
  assert.equal(
    badgeUrl('https://shwcs.site/es/soluciones/cord'),
    'https://shwcs.site/es/soluciones/cord?ref=badge',
  );
  assert.equal(
    noticeUrl('https://shwcs.site/es/account/opportunities/1#x', 'contact'),
    'https://shwcs.site/es/account/opportunities/1?utm_source=shwcs&utm_medium=email&utm_campaign=contact#x',
  );
  assert.equal(
    noticeUrl('/es/account', 'weekly'),
    '/es/account?utm_source=shwcs&utm_medium=email&utm_campaign=weekly',
  );
  assert.equal(
    newsletterUrl('https://shwcs.site/es', '2026-11-17'),
    'https://shwcs.site/es?utm_source=newsletter&utm_medium=email&utm_campaign=2026-11-17',
  );
  // Whoever tagged a link first wins.
  assert.equal(
    tagUrl('https://shwcs.site/?utm_source=x', { ref: 'badge' }),
    'https://shwcs.site/?utm_source=x',
  );
  assert.equal(tagUrl('https://shwcs.site/?ref=y', { source: 'a' }), 'https://shwcs.site/?ref=y');
  assert.equal(tagUrl('javascript:alert(1)', { source: 'a' }), 'javascript:alert(1)');
  // Outbound links to a project's site keep their existing tags (SHCWS-19).
  assert.equal(
    outboundUrl('https://cordhq.app/'),
    'https://cordhq.app/?utm_source=shwcs&utm_medium=listing',
  );
});

test('notice emails tag links back into shwcs, never security ones', () => {
  const base = {
    origin: 'https://shwcs.site',
    email: { subject: 's', heading: 'h', button: 'Abrir', paragraphs: ['p'], text: 't' },
    footerNote: '',
    accountId: '00000000-0000-4000-8000-000000000000',
    secret: '',
  };
  const contact = composeNotice({
    ...base,
    category: 'contact',
    buttonHref: 'https://shwcs.site/es/account/contacts/1',
  });
  assert.match(contact.text, /utm_medium=email&utm_campaign=contact/);
  const security = composeNotice({
    ...base,
    category: 'security',
    buttonHref: 'https://shwcs.site/es/forgot-password',
  });
  assert.doesNotMatch(security.text, /utm_/);
  const outside = composeNotice({
    ...base,
    category: 'contact',
    buttonHref: 'https://cordhq.app/',
  });
  assert.doesNotMatch(outside.text, /utm_/);
});

test('visit beacon: same origin only, nothing with DNT/GPC or from bots', async () => {
  const request = (
    headers: Record<string, string>,
    body: unknown = { steps: ['visit'], touch: {} },
  ) =>
    new NextRequest('https://shwcs.site/api/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  assert.equal((await visit(request({ origin: 'https://evil.example' }))).status, 403);
  assert.equal((await visit(request({ origin: 'https://shwcs.site', dnt: '1' }))).status, 204);
  assert.equal(
    (await visit(request({ origin: 'https://shwcs.site', 'sec-gpc': '1' }))).status,
    204,
  );
  assert.equal(
    (await visit(request({ origin: 'https://shwcs.site' }, { steps: ['nope'] }))).status,
    400,
  );
  assert.equal(
    (await visit(request({ origin: 'https://shwcs.site', 'user-agent': 'Googlebot/2.1' }))).status,
    204,
  );
});

test('funnel weeks start on Monday and list oldest first', () => {
  assert.equal(weekOf('2026-11-17'), '2026-11-16');
  assert.equal(weekOf('2026-11-16'), '2026-11-16');
  assert.equal(weekOf('2026-11-22'), '2026-11-16');
  assert.deepEqual(recentWeeks('2026-11-17', 3), ['2026-11-02', '2026-11-09', '2026-11-16']);
  assert.equal(readChannel('organic'), 'organic');
  assert.equal(readChannel('unknown'), 'unknown');
  assert.equal(readChannel('nope'), null);
});

test('funnel steps convert from the step before, never from nothing', () => {
  const steps = [{ key: 'a' }, { key: 'b' }, { key: 'c' }] as const;
  assert.deepEqual(conversions(steps, { a: 200, b: 50, c: 0 }), [
    { key: 'a', value: 200, rate: null },
    { key: 'b', value: 50, rate: 25 },
    { key: 'c', value: 0, rate: 0 },
  ]);
  assert.deepEqual(
    conversions(steps, { a: 0, b: 0, c: 0 }).map(row => row.rate),
    [null, null, null],
  );
  assert.equal(furthest([true, false, true]), 3);
  assert.equal(furthest([false, false]), 0);
});

test('accounts land in the buyer or founder funnel and count up to their furthest step', () => {
  const account = (patch: Partial<CohortAccount>): CohortAccount => ({
    week: '2026-11-16',
    channel: 'organic',
    intent: '',
    profile: null,
    onboarded: false,
    saved: false,
    requested: false,
    answered: false,
    drafted: false,
    submitted: false,
    published: false,
    firstRequest: false,
    firstReply: false,
    ...patch,
  });
  assert.deepEqual(sides(account({})), { founder: false, buyer: true });
  assert.deepEqual(sides(account({ intent: 'founder' })), { founder: true, buyer: false });
  assert.deepEqual(sides(account({ profile: 'both' })), { founder: true, buyer: true });
  assert.deepEqual(sides(account({ drafted: true, profile: 'buyer' })), {
    founder: true,
    buyer: true,
  });

  const buyer = emptyCounts(BUYER_STEPS);
  const founder = emptyCounts(FOUNDER_STEPS);
  // Wrote to a founder without saving anything: still passed «guardar».
  countAccount(account({ requested: true }), buyer, founder);
  countAccount(
    account({ intent: 'founder', onboarded: true, drafted: true, published: true }),
    buyer,
    founder,
  );
  assert.deepEqual([buyer.registered, buyer.saved, buyer.requested, buyer.answered], [1, 1, 1, 0]);
  assert.deepEqual(
    [
      founder.registered,
      founder.onboarded,
      founder.drafted,
      founder.submitted,
      founder.published,
      founder.firstRequest,
    ],
    [1, 1, 1, 1, 1, 0],
  );
});
