import assert from 'node:assert/strict';
import test from 'node:test';
import {
  solutionCapabilities,
  solutionCategories,
  solutionIndustries,
} from '../src/lib/solutions/model';
import { categories, industries, localizedCategoryDisplayLabel } from '../src/lib/taxonomy';
import { categoryEn, industryEn } from '../src/lib/taxonomy-en';
import { solutionCategoryTones, brandColors } from '../src/lib/brand-colors';
import { categoryVocabulary, industryVocabulary } from '../src/lib/search/vocabulary';
import { previewCategories, localizedPreviewAction } from '../src/lib/catalog-preview';

// A value that can be stored must be presentable everywhere the catalogue shows it:
// a route, a tone, an English label, search vocabulary and, for categories, enough
// concrete capabilities to choose from. Adding a value without these used to leave a
// category with no page or a filter chip with no colour.
test('every category has a route, a tone, English text, vocabulary, an explorer entry and ≥5 capabilities', () => {
  for (const category of solutionCategories) {
    const entries = categories.filter(item => item.label === category);
    assert.ok(entries.length > 0, `${category} has no /explorar route`);
    assert.ok(solutionCategoryTones[category] in brandColors, `${category} has no tone`);
    for (const entry of entries) {
      assert.ok(categoryEn[entry.slug]?.label, `${entry.slug} has no English label`);
      assert.ok(categoryEn[entry.slug]?.title, `${entry.slug} has no English title`);
    }
    assert.notEqual(localizedCategoryDisplayLabel(category, 'en'), '', `${category} label empty`);
    assert.ok(
      (categoryVocabulary[category] ?? []).length >= 10,
      `${category} has too little vocabulary`,
    );
    const preview = previewCategories.find(item => item.label === category);
    assert.ok(preview, `${category} is missing from the landing explorer`);
    assert.notEqual(
      localizedPreviewAction(preview, 'en'),
      preview.action,
      `${category} has no English explorer tagline`,
    );
    const capabilities = solutionCapabilities.filter(item => item.category === category);
    assert.ok(capabilities.length >= 5, `${category} has only ${capabilities.length} capabilities`);
  }
});

test('every industry has a route, a tone, English text and vocabulary', () => {
  for (const industry of solutionIndustries) {
    const entry = industries.find(item => item.value === industry);
    assert.ok(entry, `${industry} has no /industria route`);
    assert.ok(entry.tone in brandColors, `${industry} has no tone`);
    assert.ok(industryEn[entry.slug]?.label, `${entry.slug} has no English label`);
    assert.ok(industryEn[entry.slug]?.title, `${entry.slug} has no English title`);
    assert.ok(
      (industryVocabulary[industry] ?? []).length >= 8,
      `${industry} has too little vocabulary`,
    );
  }
});

test('route slugs are unique and URL-safe', () => {
  for (const list of [categories, industries]) {
    const slugs = list.map(item => item.slug);
    assert.equal(new Set(slugs).size, slugs.length, 'duplicate slug');
    for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});
