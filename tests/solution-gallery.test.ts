import assert from 'node:assert/strict';
import test from 'node:test';
import { solutionSlides, solutionCover } from '../src/lib/solutions/gallery';

const screenshots = [{ id: 'a', caption: 'Panel principal' }, { id: 'b', caption: 'Reportes' }];

test('the carousel opens with the site og:image, then the founder\'s screenshots in order', () => {
  const slides = solutionSlides('sol-1', 'Cord', { screenshots, hasSiteImage: true });
  assert.deepEqual(slides.map(s => s.kind), ['site', 'screenshot', 'screenshot']);
  assert.equal(slides[0].src, '/api/solutions/sol-1/site-image');
  assert.equal(slides[1].src, '/api/solutions/sol-1/media/a');
  assert.equal(slides[2].src, '/api/solutions/sol-1/media/b');
});

test('hideSiteImage removes only the site slide, screenshots stay untouched', () => {
  const slides = solutionSlides('sol-1', 'Cord', { screenshots, hasSiteImage: true, hideSiteImage: true });
  assert.deepEqual(slides.map(s => s.kind), ['screenshot', 'screenshot']);
});

test('no site image and no screenshots is an empty carousel, not a placeholder slide', () => {
  assert.deepEqual(solutionSlides('sol-1', 'Cord', {}), []);
});

test('grid covers prefer the founder\'s own screenshot over the site og:image, over static art — the opposite priority from the carousel', () => {
  assert.equal(solutionCover('sol-1', { coverScreenshotId: 'a', hasSiteImage: true, staticArt: '/images/catalog/cord-og.jpg' }), '/api/solutions/sol-1/media/a');
  assert.equal(solutionCover('sol-1', { hasSiteImage: true, staticArt: '/images/catalog/cord-og.jpg' }), '/api/solutions/sol-1/site-image');
  assert.equal(solutionCover('sol-1', { staticArt: '/images/catalog/cord-og.jpg' }), '/images/catalog/cord-og.jpg');
  assert.equal(solutionCover('sol-1', {}), undefined);
});
