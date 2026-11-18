import type { SolutionCoverSource, SolutionScreenshot } from './model';

/** Texts for the slides, from the `solutionUi.gallery` dictionary; `{name}` is filled in. */
export type SlideLabels = {
  siteAlt: string;
  siteCaption: string;
  screenshotAlt: string;
  unnamed: string;
};

export type SolutionSlide = {
  key: string;
  src: string;
  alt: string;
  caption?: string;
  kind: 'site' | 'screenshot';
};

/**
 * All the images a ficha's carousel shows. The site's og:image leads unless the founder
 * chose their own first image (coverSource 'screenshot'); then it follows the gallery.
 * hideSiteImage drops it altogether. The same choice picks the card cover below, so a
 * listing's first slide and its thumbnail are always the same image.
 */
export function solutionSlides(
  solutionId: string,
  name: string,
  opts: {
    screenshots?: SolutionScreenshot[];
    hasSiteImage?: boolean;
    hideSiteImage?: boolean;
    coverSource?: SolutionCoverSource;
    labels: SlideLabels;
  },
): SolutionSlide[] {
  const named = (template: string) => template.replace('{name}', () => name || opts.labels.unnamed);
  const site: SolutionSlide[] =
    opts.hasSiteImage && !opts.hideSiteImage
      ? [
          {
            key: 'site',
            src: `/api/solutions/${solutionId}/site-image`,
            alt: named(opts.labels.siteAlt),
            caption: opts.labels.siteCaption,
            kind: 'site',
          },
        ]
      : [];
  const shots: SolutionSlide[] = (opts.screenshots ?? []).map(shot => ({
    key: shot.id,
    src: `/api/solutions/${solutionId}/media/${shot.id}`,
    alt: shot.caption || named(opts.labels.screenshotAlt),
    caption: shot.caption,
    kind: 'screenshot',
  }));
  return opts.coverSource === 'screenshot' && shots.length
    ? [...shots, ...site]
    : [...site, ...shots];
}

/**
 * The single rule for a ficha's thumbnail — catalogue cards, library, and the founder's
 * own dashboard: the first image of solutionSlides() above, then any locally shipped
 * catalogue art (Cord/Flouvia only). Never a remote URL: the first two are our own
 * re-encoded copies. public.ts, library/server.ts and account/page.tsx all call this.
 */
export function solutionCover(
  solutionId: string,
  opts: {
    coverScreenshotId?: string;
    hasSiteImage?: boolean;
    hideSiteImage?: boolean;
    coverSource?: SolutionCoverSource;
    staticArt?: string;
  },
): string | undefined {
  const site =
    opts.hasSiteImage && !opts.hideSiteImage
      ? `/api/solutions/${solutionId}/site-image`
      : undefined;
  const shot = opts.coverScreenshotId
    ? `/api/solutions/${solutionId}/media/${opts.coverScreenshotId}`
    : undefined;
  return (opts.coverSource === 'screenshot' ? (shot ?? site) : (site ?? shot)) ?? opts.staticArt;
}

/** The stored coverSource, as read back from a SQL text column. */
export function readCoverSource(value: unknown): SolutionCoverSource | undefined {
  return value === 'screenshot' ? 'screenshot' : undefined;
}
