import { opsRoute } from '@/lib/api';
import { intParam, ok, oneOf, textParam } from '@/lib/http';
import { ACCOUNT_FILTERS, ACCOUNT_SORTS, listAccounts } from '@/lib/data/accounts';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const data = await listAccounts({
    filter: oneOf(url.searchParams.get('filter'), ACCOUNT_FILTERS, 'all'),
    q: textParam(url, 'q'),
    sort: oneOf(url.searchParams.get('sort'), ACCOUNT_SORTS, 'created'),
    dir: oneOf(url.searchParams.get('dir'), ['asc', 'desc'] as const, 'desc'),
    page: intParam(url, 'page', 1, 1, 10000),
  });
  return ok(data);
});
