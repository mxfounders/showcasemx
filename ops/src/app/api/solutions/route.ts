import { opsRoute } from '@/lib/api';
import { intParam, ok, oneOf, textParam } from '@/lib/http';
import { listSolutions, SOLUTION_SORTS, SOLUTION_STATUSES } from '@/lib/data/solutions';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const data = await listSolutions({
    status: oneOf(url.searchParams.get('status'), SOLUTION_STATUSES, 'pending'),
    q: textParam(url, 'q'),
    catalog: textParam(url, 'catalogKey', 20),
    category: textParam(url, 'category', 60),
    sort: oneOf(url.searchParams.get('sort'), SOLUTION_SORTS, 'updated'),
    dir: oneOf(url.searchParams.get('dir'), ['asc', 'desc'] as const, 'desc'),
    page: intParam(url, 'page', 1, 1, 10000),
  });
  return ok(data);
});
