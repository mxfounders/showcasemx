import { opsRoute } from '@/lib/api';
import { intParam, ok, oneOf, textParam } from '@/lib/http';
import { CONTACT_STATUSES, listContacts } from '@/lib/data/contacts';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) =>
  ok(
    await listContacts({
      status: oneOf(url.searchParams.get('status'), CONTACT_STATUSES, 'all'),
      q: textParam(url, 'q'),
      page: intParam(url, 'page', 1, 1, 10000),
    }),
  ),
);
