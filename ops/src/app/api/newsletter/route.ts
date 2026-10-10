import { opsRoute } from '@/lib/api';
import { intParam, ok, oneOf, textParam } from '@/lib/http';
import { NEWSLETTER_FILTERS, newsletterOverview } from '@/lib/data/newsletter';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const filter =
    url.searchParams.get('all') === '1'
      ? 'all'
      : oneOf(url.searchParams.get('filter'), NEWSLETTER_FILTERS, 'active');
  const data = await newsletterOverview({
    filter,
    q: textParam(url, 'q'),
    page: intParam(url, 'page', 1, 1, 10000),
  });
  return ok(data);
});
