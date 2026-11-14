import { unstable_cache } from 'next/cache';
import { solutionsSql } from '@/lib/solutions/server';
import { adPlacementStatus, placementReach, type PlacementStatus } from './server';
import { addDays, adToday, reachDays } from './model';

/**
 * What /anunciate shows a sponsor (SHCWS-73): page views per placement over the last
 * {@link reachDays} days, who has an account, newsletter subscribers and the public
 * rates. Every number comes from the database at the time it was read and is shown
 * with its dates; none is estimated.
 *
 * Breakdowns of people wait for {@link audienceMinimum}: below it a percentage could
 * point at someone, so the page only says «fewer than N».
 */
export const audienceMinimum = 100;

export const accountProfiles = ['buyer', 'founder', 'both', 'exploring'] as const;
export type AccountProfile = (typeof accountProfiles)[number];

export type MediaKitPlacement = PlacementStatus & {
  /** Page views in the window, or null when the page was never measured. */
  views: number | null;
  /** First measured day, when measuring started inside the window. */
  since: string | null;
};

export type MediaKit = {
  /** First and last day counted (today is not over, so it is left out). */
  from: string;
  to: string;
  placements: MediaKitPlacement[];
  /** Category pages with views in the window, most viewed first. */
  categories: { slug: string; views: number }[];
  accounts: {
    total: number | null;
    /** Share per declared profile, only from {@link audienceMinimum} accounts up. */
    profiles: Record<AccountProfile | 'unknown', number> | null;
  };
  /** Active subscribers, only from {@link audienceMinimum} up. */
  subscribers: number | null;
  readAt: string;
};

async function read(): Promise<MediaKit> {
  const today = adToday();
  const sql = solutionsSql();
  const [placements, reach, people, newsletter] = await Promise.all([
    adPlacementStatus(),
    placementReach(),
    sql`SELECT profile, count(*)::int AS n FROM auth_accounts
      WHERE suspended_at IS NULL GROUP BY profile`,
    sql`SELECT count(*)::int AS n FROM newsletter_subscribers WHERE unsubscribed_at IS NULL`,
  ]);
  const total = people.reduce((sum, row) => sum + Number(row.n), 0);
  const profiles =
    total >= audienceMinimum
      ? Object.fromEntries(
          [...accountProfiles, 'unknown' as const].map(profile => [
            profile,
            Number(people.find(row => (row.profile ?? 'unknown') === profile)?.n ?? 0) / total,
          ]),
        )
      : null;
  const subscribers = Number(newsletter[0]?.n ?? 0);
  const categoryViews = Object.entries(reach)
    .filter(([key, value]) => key.startsWith('category:') && value.views > 0)
    .map(([key, value]) => ({ slug: key.slice('category:'.length), views: value.views }))
    .sort((a, b) => b.views - a.views);
  const placementViews = (placement: string) => {
    const keys = Object.keys(reach).filter(key => key.startsWith(`${placement}:`));
    if (!keys.length) return { views: null, since: null };
    const since = keys
      .map(key => reach[key].since)
      .filter((day): day is string => !!day)
      .sort()[0];
    return { views: keys.reduce((sum, key) => sum + reach[key].views, 0), since: since ?? null };
  };
  return {
    from: addDays(today, -reachDays),
    to: addDays(today, -1),
    placements: placements.map(item => ({ ...item, ...placementViews(item.placement) })),
    categories: categoryViews,
    accounts: {
      total: total >= audienceMinimum ? total : null,
      profiles: profiles as MediaKit['accounts']['profiles'],
    },
    subscribers: subscribers >= audienceMinimum ? subscribers : null,
    readAt: new Date().toISOString(),
  };
}

/** Read at most once an hour: the page is public and crawled; the numbers move daily. */
export const mediaKitData = unstable_cache(read, ['media-kit'], { revalidate: 3600 });
