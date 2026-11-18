import { authSql } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { publicProducts, type PublishedProduct } from '@/lib/solutions/public';
import { splitNewListings, weekOf } from '@/lib/solutions/new-this-week';
import type { Dictionary } from '@/i18n/dictionary';
import { campaignLimits, type CampaignContent, type CampaignListing } from './content';

/**
 * «Nuevo esta semana» by email (SHCWS-125): a draft campaign built from the same list /nuevo
 * shows (listings first approved in the last seven days, newest first, never by votes). It is
 * only a draft: someone in ops reviews it, sends the required test and then sends it. Nothing
 * here sends anything. One draft per week (the Monday in Mexico City, like /nuevo's archive).
 */
type Listed = Pick<
  PublishedProduct,
  'solutionId' | 'name' | 'description' | 'detailUrl' | 'categories'
>;

function summary(value: string) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= 240) return text;
  return `${text.slice(0, 239).replace(/\s+\S*$/, '')}…`;
}

export function weeklyListings(products: readonly Listed[]): CampaignListing[] {
  return products
    .filter(
      product =>
        product.solutionId && /^\/soluciones\/[A-Za-z0-9-]{1,80}$/.test(product.detailUrl ?? ''),
    )
    .slice(0, campaignLimits.listings)
    .map(product => ({
      solutionId: String(product.solutionId),
      name: product.name.slice(0, campaignLimits.listingName),
      summary: summary(product.description ?? ''),
      path: String(product.detailUrl),
      category: product.categories?.[0] ?? null,
    }));
}

export function weeklyDraftContent(
  listings: CampaignListing[],
  copy: {
    es: Dictionary['newsletter']['mail']['weekly'];
    en: Dictionary['newsletter']['mail']['weekly'];
  },
): CampaignContent {
  const version = (locale: 'es' | 'en') => {
    const words = copy[locale];
    const subject =
      listings.length === 1
        ? words.subjectOne.replace('{name}', listings[0].name)
        : words.subjectMany.replace('{count}', String(listings.length));
    return {
      subject: subject.slice(0, campaignLimits.subject),
      preheader: listings
        .map(item => item.name)
        .join(' · ')
        .slice(0, campaignLimits.preheader),
      heading: words.heading,
      body: `${words.intro}\n\n${words.cta}`,
    };
  };
  return { es: version('es'), en: version('en'), listings };
}

async function copies() {
  return {
    es: (await getDictionary('es')).newsletter.mail.weekly,
    en: (await getDictionary('en')).newsletter.mail.weekly,
  };
}

/**
 * Creates this week's draft if there are new listings and none exists yet. With `refresh`,
 * rebuilds the listings of that draft instead (a new version, so it needs a new test).
 */
export async function createWeeklyNewsletterDraft({
  now = new Date(),
  refresh,
  products,
}: { now?: Date; refresh?: string; products?: PublishedProduct[] } = {}) {
  const catalog = products ?? (await publicProducts());
  const listings = weeklyListings(splitNewListings(catalog, now).current);
  const sql = authSql();
  if (refresh) {
    const content = weeklyDraftContent(listings, await copies());
    const rows =
      await sql`UPDATE newsletter_campaigns SET content = ${JSON.stringify(content)}::jsonb,
        version = version + 1, updated_at = now()
      WHERE id = ${refresh} AND kind = 'new_this_week' AND status = 'draft' AND ${listings.length} > 0
      RETURNING id::text, version`;
    return { id: rows[0] ? String(rows[0].id) : null, created: false, listings: listings.length };
  }
  if (!listings.length) return { id: null, created: false, listings: 0 };
  const content = weeklyDraftContent(listings, await copies());
  const rows = await sql`INSERT INTO newsletter_campaigns (kind, week, content, segment)
    VALUES ('new_this_week', ${weekOf(now)}::date, ${JSON.stringify(content)}::jsonb, '{}'::jsonb)
    ON CONFLICT (week) WHERE kind = 'new_this_week' DO NOTHING RETURNING id::text`;
  return {
    id: rows[0] ? String(rows[0].id) : null,
    created: rows.length > 0,
    listings: listings.length,
  };
}
