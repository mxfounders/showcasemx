import { opsRoute } from '@/lib/api';
import { ok, oneOf, textParam } from '@/lib/http';
import { DOMAIN_FILTERS, listDomains } from '@/lib/data/domains';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const data = await listDomains(
    oneOf(url.searchParams.get('filter'), DOMAIN_FILTERS, 'all'),
    textParam(url, 'q'),
  );
  return ok(data);
});
