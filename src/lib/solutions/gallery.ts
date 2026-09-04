import type { SolutionScreenshot } from './model';

export type SolutionSlide = { key: string; src: string; alt: string; caption?: string; kind: 'site' | 'screenshot' };

/**
 * All the images a ficha's carousel shows, og:image first — see CLAUDE.md §53.
 * Deliberately a different order from solutionCover() below: the carousel wants
 * the wide, hero-shaped og:image up front; grid thumbnails want the founder's
 * own curated screenshot instead, since a marketing og:image rarely survives
 * being cropped to a small square tile.
 */
export function solutionSlides(solutionId: string, name: string, opts: {
  screenshots?: SolutionScreenshot[];
  hasSiteImage?: boolean;
  hideSiteImage?: boolean;
}): SolutionSlide[] {
  const slides: SolutionSlide[] = [];
  if (opts.hasSiteImage && !opts.hideSiteImage) {
    slides.push({ key: 'site', src: `/api/solutions/${solutionId}/site-image`, alt: `Portada del sitio de ${name || 'la solución'}`, caption: 'Portada tomada de su sitio', kind: 'site' });
  }
  for (const shot of opts.screenshots ?? []) {
    slides.push({ key: shot.id, src: `/api/solutions/${solutionId}/media/${shot.id}`, alt: shot.caption || `Captura de ${name || 'la solución'}`, caption: shot.caption, kind: 'screenshot' });
  }
  return slides;
}

/**
 * The single rule for a ficha's grid thumbnail — catalogue cards, library,
 * and the founder's own dashboard. Order: the founder's own curated first
 * screenshot, then the site's own og:image, then any locally-shipped
 * catalogue art (Cord/Flouvia only). Never a remote URL: the first two are our
 * own re-encoded copies. Deliberately NOT what the carousel uses above — three
 * files (public.ts, library/server.ts, account/page.tsx) used to each encode
 * their own version of this order; this is now the one place it lives.
 */
export function solutionCover(solutionId: string, opts: {
  coverScreenshotId?: string;
  hasSiteImage?: boolean;
  staticArt?: string;
}): string | undefined {
  if (opts.coverScreenshotId) return `/api/solutions/${solutionId}/media/${opts.coverScreenshotId}`;
  if (opts.hasSiteImage) return `/api/solutions/${solutionId}/site-image`;
  return opts.staticArt;
}
