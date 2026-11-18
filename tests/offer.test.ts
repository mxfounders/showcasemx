import assert from 'node:assert/strict';
import test from 'node:test';
import {
  maxSolutionScreenshots,
  readOfferFacts,
  readSolutionData,
  solutionErrors,
  type SolutionData,
} from '../src/lib/solutions/model';
import { offerSections, offerValues, planPrice, resourceLinks } from '../src/lib/solutions/offer';
import { optionalQuestions, sectionFilled } from '../src/lib/solutions/questions';
import { mergeSiteDraft, readDraftOutput } from '../src/lib/solutions/site-draft';
import { solutionMarkdown } from '../src/lib/machine-readable';

const base: SolutionData = {
  name: 'Atlas',
  kind: 'Software',
  category: 'Cobros',
  problem: 'Ayuda a organizar cobros y facturas pendientes.',
  audience: 'Pequeñas empresas y equipos de finanzas.',
  website: 'https://atlas.example.com',
  contactEmail: 'founder@example.com',
  industries: [],
  companySizes: [],
  capabilities: ['facturacion-cfdi'],
};

const offer = {
  plans: [
    { name: ' Free ', price: 0, includes: '5 envíos al mes' },
    { name: 'Starter', price: 12, currency: 'USD', unit: 'suscripcion-mensual' },
    { name: 'Developer' },
  ],
  tryOptions: ['plan-gratis', 'sin-tarjeta', 'plan-gratis'],
  developerTools: ['api-rest', 'webhooks', 'mcp'],
  resources: {
    docs: 'https://docs.atlas.example.com',
    status: ' https://status.atlas.example.com ',
  },
  supportChannels: ['correo', 'centro-ayuda'],
  supportResponse: 'menos-24-horas',
  onboarding: ['autoservicio'],
  exitTerms: ['cancela-cuando-quieras', 'exporta-tus-datos'],
};

test('the offer fields validate against closed lists and stay optional', () => {
  const data = readSolutionData({ ...base, ...offer });
  assert.ok(data);
  assert.equal(data.plans?.[0].name, 'Free');
  assert.equal(data.plans?.[2].price, undefined);
  assert.deepEqual(data.tryOptions, ['plan-gratis', 'sin-tarjeta']);
  assert.equal(data.resources?.status, 'https://status.atlas.example.com');
  // Nothing new is required: a listing without them still submits.
  assert.deepEqual(solutionErrors(base), {});
  assert.deepEqual(solutionErrors(data), {});
  for (const bad of [
    { tryOptions: ['gratis-para-siempre'] },
    { developerTools: ['soap'] },
    { supportResponse: 'inmediato' },
    { slaUptime: 80 },
    { slaUptime: 101 },
    { trialDays: 0 },
    { plans: [{ name: 'x'.repeat(41) }] },
    { plans: [{ name: 'Pro', currency: 'PESOS' }] },
    { plans: Array.from({ length: 7 }, () => ({ name: 'Pro' })) },
    { resources: { docs: 42 } },
  ])
    assert.equal(readSolutionData({ ...base, ...bad }), null, JSON.stringify(bad));
  // An unknown resource kind is dropped like any unknown key, not a reason to reject.
  assert.deepEqual(
    readSolutionData({ ...base, resources: { blog: 'https://x.example.com' } })?.resources,
    undefined,
  );
});

test('submitting asks for a plan name, a priced plan’s currency and safe links', () => {
  assert.equal(solutionErrors({ ...base, plans: [{ name: '', price: 0 }] }).plans, 'plansInvalid');
  assert.equal(
    solutionErrors({ ...base, plans: [{ name: 'Pro', price: 30 }] }).plans,
    'plansInvalid',
  );
  assert.equal(solutionErrors({ ...base, plans: [{ name: 'Pro' }] }).plans, undefined);
  assert.equal(
    solutionErrors({ ...base, resources: { docs: 'javascript:alert(1)' } }).resources,
    'resourcesInvalid',
  );
});

test('a listing shows up to eight images', () => {
  const shots = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `00000000-0000-4000-8000-00000000000${index}`,
      caption: 'Una imagen',
    }));
  assert.equal(maxSolutionScreenshots, 8);
  assert.ok(readSolutionData({ ...base, screenshots: shots(8) }));
  assert.equal(readSolutionData({ ...base, screenshots: shots(9) }), null);
});

test('plans and the rest read the same everywhere, in each language', () => {
  assert.equal(planPrice({ name: 'Free', price: 0 }, 'es'), 'Gratis');
  assert.equal(planPrice({ name: 'Dev' }, 'en'), 'Custom');
  assert.equal(
    planPrice({ name: 'Pro', price: 30, currency: 'USD', unit: 'suscripcion-mensual' }, 'es'),
    '$30 USD/mes',
  );
  const data = readSolutionData({
    ...base,
    ...offer,
    trialDays: 14,
    tryOptions: ['prueba-gratis'],
  });
  assert.ok(data);
  const values = offerValues(data, 'en');
  assert.deepEqual(values.tryOptions, ['14-day free trial']);
  assert.deepEqual(values.exitTerms, ['Cancel anytime', 'Export your data']);
  assert.equal(values.supportResponse, 'Under 24 hours');
  assert.deepEqual(
    resourceLinks(data, 'es').map(link => link.label),
    ['Documentación', 'Estado del servicio'],
  );
  assert.deepEqual(offerSections(base), { plans: false, technical: false, service: false });
  assert.deepEqual(offerSections(data), { plans: true, technical: true, service: true });
});

test('the editor counts the new optional sections as filled only when declared', () => {
  const ids = optionalQuestions.map(item => item.id);
  assert.ok(ids.includes('service') && ids.includes('developers'));
  assert.equal(sectionFilled(base, 'service'), false);
  assert.equal(sectionFilled({ ...base, exitTerms: ['codigo-es-tuyo'] }, 'service'), true);
  assert.equal(
    sectionFilled({ ...base, resources: { docs: 'https://d.example.com' } }, 'developers'),
    true,
  );
  assert.equal(sectionFilled({ ...base, tryOptions: ['demo-publica'] }, 'pricing'), true);
});

test('the comparator reads the offer fields and ignores SQL nulls', () => {
  assert.deepEqual(readOfferFacts(null), {});
  const facts = readOfferFacts({ plans: null, tryOptions: ['plan-gratis'], slaUptime: null });
  assert.deepEqual(facts, { tryOptions: ['plan-gratis'] });
  assert.deepEqual(readOfferFacts({ tryOptions: ['no-existe'] }), {});
});

test('the AI draft proposes plans and links only from what the site shows', () => {
  const site = {
    pages: [{ url: 'https://atlas.example.com/', title: '', text: '' }],
    anchors: [{ url: 'https://docs.atlas.example.com/', text: 'Docs' }],
  };
  const { patch } = readDraftOutput(
    {
      plans: [
        { name: 'Free', price: 0, currency: null, unit: null, includes: 'Para empezar' },
        { name: 'Pro', price: 30, currency: 'usd', unit: 'suscripcion-mensual', includes: null },
        { name: 'Raro', price: 50, currency: null, unit: null, includes: null },
      ],
      tryOptions: ['plan-gratis', 'inventado'],
      trialDays: 14,
      developerTools: ['api-rest'],
      resources: {
        docs: 'https://docs.atlas.example.com/',
        api: null,
        changelog: 'https://otro.example.com/cambios',
        status: null,
        roadmap: null,
        help: null,
        community: null,
      },
      supportResponse: 'menos-1-hora',
      slaUptime: 50,
      sources: [],
    },
    site as never,
  );
  assert.deepEqual(patch.plans, [
    { name: 'Free', price: 0, includes: 'Para empezar' },
    { name: 'Pro', price: 30, currency: 'USD', unit: 'suscripcion-mensual' },
    { name: 'Raro' },
  ]);
  assert.deepEqual(patch.tryOptions, ['plan-gratis']);
  // No trial length without a declared trial; no SLA below the accepted range.
  assert.equal(patch.trialDays, undefined);
  assert.equal(patch.slaUptime, undefined);
  // A link counts only when it appears on the site.
  assert.deepEqual(patch.resources, { docs: 'https://docs.atlas.example.com/' });
  const merged = mergeSiteDraft({ ...base, plans: [{ name: 'Mío' }] }, patch);
  assert.deepEqual(merged.data.plans, [{ name: 'Mío' }]);
  assert.deepEqual(merged.data.developerTools, ['api-rest']);
});

test('the Markdown view lists plans, support and technical pages', () => {
  const data = readSolutionData({ ...base, ...offer });
  assert.ok(data);
  const markdown = solutionMarkdown({
    path: '/soluciones/atlas',
    data,
    publishedAt: null,
    domainVerified: false,
    generatedAt: new Date('2026-11-18T12:00:00Z'),
  });
  assert.match(
    markdown,
    /## Planes\n\nCómo probarlo: Plan gratis · Sin tarjeta\n- \*\*Free\*\* · Gratis · 5 envíos al mes/,
  );
  assert.match(markdown, /- \*\*Developer\*\* · A la medida/);
  assert.match(markdown, /## Soporte y contrato\n\n- Canales: Correo, Centro de ayuda/);
  assert.match(markdown, /## Para equipos técnicos\n\n- API REST\n- Webhooks/);
  assert.match(markdown, /- Documentación: https:\/\/docs\.atlas\.example\.com/);
  assert.ok(!markdown.includes('founder@example.com'));
});
