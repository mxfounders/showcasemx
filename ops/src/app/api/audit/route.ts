import { opsRoute } from '@/lib/api';
import { ok, textParam } from '@/lib/http';
import { listAudit } from '@/lib/data/audit';

export const runtime = 'nodejs';

export const GET = opsRoute({ admin: true }, async ({ url }) => {
  const cursor = url.searchParams.get('cursor');
  const data = await listAudit({
    actor: textParam(url, 'actor', 254),
    action: textParam(url, 'action', 80),
    subjectType: textParam(url, 'subjectType', 40),
    subjectId: textParam(url, 'subjectId', 254),
    q: textParam(url, 'q'),
    from: textParam(url, 'from', 10),
    to: textParam(url, 'to', 10),
    cursor: cursor && /^\d{1,18}$/.test(cursor) ? Number(cursor) : null,
  });
  return ok(data);
});
