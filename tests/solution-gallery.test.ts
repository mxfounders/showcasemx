import assert from 'node:assert/strict';
import test from 'node:test';
import { solutionSlides, solutionCover } from '../src/lib/solutions/gallery';
import { solutionUi } from '../src/i18n/dictionaries/es/solutionUi';

const labels = solutionUi.gallery;

const screenshots = [
  { id: 'a', caption: 'Panel principal' },
  { id: 'b', caption: 'Reportes' },
];

test("the carousel opens with the site og:image, then the founder's screenshots in order", () => {
  const slides = solutionSlides('sol-1', 'Cord', { screenshots, hasSiteImage: true, labels });
  assert.deepEqual(
    slides.map(s => s.kind),
    ['site', 'screenshot', 'screenshot'],
  );
  assert.equal(slides[0].src, '/api/solutions/sol-1/site-image');
  assert.equal(slides[1].src, '/api/solutions/sol-1/media/a');
  assert.equal(slides[2].src, '/api/solutions/sol-1/media/b');
  assert.equal(slides[0].alt, 'Portada del sitio de Cord');
});

test('hideSiteImage removes only the site slide, screenshots stay untouched', () => {
  const slides = solutionSlides('sol-1', 'Cord', {
    screenshots,
    hasSiteImage: true,
    hideSiteImage: true,
    labels,
  });
  assert.deepEqual(
    slides.map(s => s.kind),
    ['screenshot', 'screenshot'],
  );
});

test('no site image and no screenshots is an empty carousel, not a placeholder slide', () => {
  assert.deepEqual(solutionSlides('sol-1', 'Cord', { labels }), []);
});

test('the founder can lead with their own first image; the og:image then follows the gallery', () => {
  const slides = solutionSlides('sol-1', 'Cord', {
    screenshots,
    hasSiteImage: true,
    coverSource: 'screenshot',
    labels,
  });
  assert.deepEqual(
    slides.map(s => s.key),
    ['a', 'b', 'site'],
  );
  // Without screenshots the choice has nothing to lead with: the og:image stays first.
  assert.deepEqual(
    solutionSlides('sol-1', 'Cord', { hasSiteImage: true, coverSource: 'screenshot', labels }).map(
      s => s.key,
    ),
    ['site'],
  );
});

test('the card cover is always the first slide, then static art', () => {
  const art = '/images/catalog/cord-og.jpg';
  const site = '/api/solutions/sol-1/site-image';
  const shot = '/api/solutions/sol-1/media/a';
  const both = { coverScreenshotId: 'a', hasSiteImage: true, staticArt: art };
  assert.equal(solutionCover('sol-1', both), site, 'og:image first by default');
  assert.equal(solutionCover('sol-1', { ...both, coverSource: 'screenshot' }), shot);
  assert.equal(solutionCover('sol-1', { ...both, hideSiteImage: true }), shot);
  assert.equal(
    solutionCover('sol-1', { hasSiteImage: true, hideSiteImage: true, staticArt: art }),
    art,
    'a hidden og:image is never the cover',
  );
  assert.equal(solutionCover('sol-1', { coverScreenshotId: 'a', coverSource: 'screenshot' }), shot);
  assert.equal(solutionCover('sol-1', { hasSiteImage: true, coverSource: 'screenshot' }), site);
  assert.equal(solutionCover('sol-1', { staticArt: art }), art);
  assert.equal(solutionCover('sol-1', {}), undefined);
  for (const opts of [
    both,
    { ...both, coverSource: 'screenshot' as const },
    { ...both, hideSiteImage: true },
  ])
    assert.equal(
      solutionCover('sol-1', opts),
      solutionSlides('sol-1', 'Cord', {
        screenshots: [{ id: 'a', caption: '' }],
        ...opts,
        labels,
      })[0].src,
    );
});
