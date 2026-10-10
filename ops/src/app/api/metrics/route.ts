import { opsRoute } from '@/lib/api';
import { ok, oneOf } from '@/lib/http';
import { METRIC_RANGES, platformMetrics } from '@/lib/data/metrics';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const data = await platformMetrics(oneOf(url.searchParams.get('range'), METRIC_RANGES, '30'));
  return ok({ ...data, days: data.series });
});
