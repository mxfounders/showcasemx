import { opsRoute } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { contactTimeline } from '@/lib/data/contacts';

export const runtime = 'nodejs';

/** State transitions only — never the request details or reply messages. */
export const GET = opsRoute<{ id: string }>({}, async ({ params }) => {
  if (!isUuid(params.id)) return failure('ID inválido.', 400);
  return ok({ events: await contactTimeline(params.id) });
});
