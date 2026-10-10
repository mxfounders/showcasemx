import assert from 'node:assert/strict';
import test from 'node:test';
import {
  categories,
  industries,
  companySizes,
  offerings,
  collections,
  localizedCategories,
  localizedIndustries,
  localizedCompanySizes,
  localizedOfferingOptions,
  localizedCategoryDisplayLabel,
  localizedCapabilityLabel,
  localizedIntegrationOptions,
  localizedPricingModelOptions,
  localizedPriceBandOptions,
  localizedSetupTimeOptions,
  localizedComplianceOptions,
  localizedCollections,
  localizedLinkKind,
} from '../src/lib/taxonomy';
import {
  categoryEn,
  industryEn,
  companySizeEn,
  offeringEn,
  capabilityEn,
  integrationEn,
  pricingModelEn,
  priceBandEn,
  setupTimeEn,
  complianceEn,
  collectionEn,
  publicLinkKindEn,
} from '../src/lib/taxonomy-en';
import {
  solutionCapabilities,
  solutionIntegrations,
  solutionPricingModels,
  solutionPriceBands,
  solutionSetupTimes,
  solutionCompliance,
} from '../src/lib/solutions/model';
import { solutionChecklist } from '../src/lib/solutions/completeness';
import { publicLinkKinds } from '../src/lib/solutions/profile';

// Every English override map is keyed only by slugs/values/ids that actually
// exist — no leftover key from a rename, and no typo that silently never
// matches. Mirrors the vocabulary-hygiene tests in tests/search.test.ts.
test('every taxonomy-en.ts key matches a real canonical slug/value/id', () => {
  for (const key of Object.keys(categoryEn))
    assert.ok(
      categories.some(c => c.slug === key),
      `categoryEn has unknown slug ${key}`,
    );
  for (const key of Object.keys(industryEn))
    assert.ok(
      industries.some(i => i.slug === key),
      `industryEn has unknown slug ${key}`,
    );
  for (const key of Object.keys(companySizeEn))
    assert.ok(
      companySizes.some(s => s.value === key),
      `companySizeEn has unknown value ${key}`,
    );
  for (const key of Object.keys(offeringEn))
    assert.ok(
      (offerings as readonly string[]).includes(key),
      `offeringEn has unknown value ${key}`,
    );
  for (const key of Object.keys(capabilityEn))
    assert.ok(
      solutionCapabilities.some(c => c.id === key),
      `capabilityEn has unknown id ${key}`,
    );
  for (const key of Object.keys(integrationEn))
    assert.ok(
      (solutionIntegrations as readonly string[]).includes(key),
      `integrationEn has unknown id ${key}`,
    );
  for (const key of Object.keys(pricingModelEn))
    assert.ok(
      (solutionPricingModels as readonly string[]).includes(key),
      `pricingModelEn has unknown id ${key}`,
    );
  for (const key of Object.keys(priceBandEn))
    assert.ok(
      (solutionPriceBands as readonly string[]).includes(key),
      `priceBandEn has unknown id ${key}`,
    );
  for (const key of Object.keys(setupTimeEn))
    assert.ok(
      (solutionSetupTimes as readonly string[]).includes(key),
      `setupTimeEn has unknown id ${key}`,
    );
  for (const key of Object.keys(complianceEn))
    assert.ok(
      (solutionCompliance as readonly string[]).includes(key),
      `complianceEn has unknown id ${key}`,
    );
  for (const key of Object.keys(collectionEn))
    assert.ok(
      collections.some(c => c.slug === key),
      `collectionEn has unknown slug ${key}`,
    );
  for (const key of Object.keys(publicLinkKindEn))
    assert.ok(
      (publicLinkKinds as readonly string[]).includes(key),
      `publicLinkKindEn has unknown kind ${key}`,
    );
});

// Every canonical entry actually has an English translation — a silent gap
// here means the catalog page falls back to Spanish for one row/option.
test('every capability/integration/pricing/price-band/setup-time/compliance id has an English translation', () => {
  for (const item of solutionCapabilities)
    assert.ok(capabilityEn[item.id], `no English label for capability ${item.id}`);
  for (const id of solutionIntegrations)
    assert.ok(integrationEn[id], `no English label for integration ${id}`);
  for (const id of solutionPricingModels)
    assert.ok(pricingModelEn[id], `no English label for pricing model ${id}`);
  for (const id of solutionPriceBands)
    assert.ok(priceBandEn[id], `no English label for price band ${id}`);
  for (const id of solutionSetupTimes)
    assert.ok(setupTimeEn[id], `no English label for setup time ${id}`);
  for (const id of solutionCompliance)
    assert.ok(complianceEn[id], `no English label for compliance ${id}`);
  for (const item of categories)
    assert.ok(categoryEn[item.slug], `no English entry for category ${item.slug}`);
  for (const item of industries)
    assert.ok(industryEn[item.slug], `no English entry for industry ${item.slug}`);
  for (const item of companySizes)
    assert.ok(companySizeEn[item.value], `no English entry for company size ${item.value}`);
  for (const item of collections)
    assert.ok(collectionEn[item.slug], `no English entry for collection ${item.slug}`);
});

test('locale !== "en" (absent included) returns the Spanish arrays completely unchanged, matching-value stable', () => {
  assert.deepEqual(localizedCategories(undefined), categories);
  assert.deepEqual(localizedCategories('es'), categories);
  assert.deepEqual(localizedIndustries(undefined), industries);
  assert.deepEqual(localizedCompanySizes(undefined), companySizes);
  assert.deepEqual(localizedCollections(undefined), collections);
});

test('localizedCategories("en") translates title/description but never the canonical label used for matching', () => {
  const en = localizedCategories('en');
  const cobros = en.find(item => item.slug === 'cobros')!;
  assert.equal(cobros.label, 'Cobros'); // stays canonical — this is what product.category is compared against
  assert.equal(cobros.title, 'Billing & Accounts Receivable');
  assert.notEqual(cobros.description, categories.find(c => c.slug === 'cobros')!.description);
});

test('localizedCategoryDisplayLabel translates only the shown text, never the matched value', () => {
  assert.equal(localizedCategoryDisplayLabel('Cobros', 'en'), 'Billing');
  assert.equal(localizedCategoryDisplayLabel('Cobros', 'es'), 'Cobros');
  assert.equal(localizedCategoryDisplayLabel('Cobros', undefined), 'Cobros');
  // an unknown value degrades to itself rather than throwing
  assert.equal(localizedCategoryDisplayLabel('Marte', 'en'), 'Marte');
});

test('localizedIndustries/CompanySizes separate value (canonical) from label (localized)', () => {
  const retail = localizedIndustries('en').find(item => item.value === 'Retail')!;
  assert.equal(retail.value, 'Retail');
  assert.equal(retail.label, 'Retail & E-commerce');
  const pyme = localizedCompanySizes('en').find(item => item.value === 'pyme')!;
  assert.equal(pyme.value, 'pyme');
  assert.equal(pyme.label, 'SMB');
});

test('localizedOfferingOptions/Capability/Integration/PricingModel/PriceBand/SetupTime/Compliance keep value canonical and only localize label', () => {
  assert.equal(localizedOfferingOptions('en').find(o => o.value === 'Software')!.label, 'Software');
  assert.equal(localizedOfferingOptions('en').find(o => o.value === 'Agencia')!.label, 'Agency');
  assert.equal(localizedCapabilityLabel('mayoreo-b2b', 'en'), 'B2B wholesale sales');
  assert.equal(localizedCapabilityLabel('mayoreo-b2b', 'es'), 'Ventas de mayoreo B2B');
  assert.equal(localizedCapabilityLabel('no-existe', 'en'), 'no-existe'); // degrades to the id, never throws
  assert.equal(localizedIntegrationOptions('en').find(o => o.value === 'stripe')!.label, 'Stripe');
  assert.equal(
    localizedPricingModelOptions('en').find(o => o.value === 'por-hora')!.label,
    'Per hour',
  );
  assert.equal(
    localizedPriceBandOptions('en').find(o => o.value === 'mas-50000')!.label,
    'Over $2,500 USD/month',
  );
  assert.equal(
    localizedSetupTimeOptions('en').find(o => o.value === 'mismo-dia')!.label,
    'Same day',
  );
  assert.equal(
    localizedComplianceOptions('en').find(o => o.value === 'nom-151')!.label,
    'Local e-signature standards',
  );
});

test('localizedLinkKind translates only the four generic kinds; brand names pass through untouched', () => {
  assert.equal(localizedLinkKind('Sitio web', 'en'), 'Website');
  assert.equal(localizedLinkKind('Sitio web', 'es'), 'Sitio web');
  assert.equal(localizedLinkKind('LinkedIn', 'en'), 'LinkedIn');
  assert.equal(localizedLinkKind('TikTok', 'en'), 'TikTok');
});

test('solutionChecklist(data,"en") translates label/hint without changing any `done` computation', () => {
  const data = {
    name: '',
    kind: '',
    category: '',
    problem: '',
    audience: '',
    website: '',
    contactEmail: '',
  } as import('../src/lib/solutions/model').SolutionData;
  const es = solutionChecklist(data),
    en = solutionChecklist(data, 'en');
  assert.deepEqual(
    es.map(i => i.done),
    en.map(i => i.done),
  );
  assert.equal(es.find(i => i.key === 'basics')!.label, 'Identidad y categorías');
  assert.equal(en.find(i => i.key === 'basics')!.label, 'Identity and categories');
  assert.equal(
    en.find(i => i.key === 'readiness')!.hint,
    'How long it takes to start and what it connects to.',
  );
});
