import { opsRoute } from '@/lib/api';
import { ok, textParam } from '@/lib/http';
import { globalSearch } from '@/lib/data/search';

export const runtime = 'nodejs';

export const GET = opsRoute({ limit: ['search', 1200, 3000] }, async ({ url }) =>
  ok({ results: await globalSearch(textParam(url, 'q')) }),
);
