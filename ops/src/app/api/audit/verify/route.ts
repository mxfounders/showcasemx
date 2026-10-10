import { opsRoute } from '@/lib/api';
import { audit } from '@/lib/audit';
import { ok } from '@/lib/http';
import { verifyAuditChain } from '@/lib/data/audit';

export const runtime = 'nodejs';

export const POST = opsRoute(
  { admin: true, limit: ['audit-verify', 30, 120] },
  async ({ user, ip }) => {
    const status = await verifyAuditChain();
    await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'audit_chain_verified',
      subjectType: 'audit',
      subjectId: String(status.headSeq ?? 0),
      metadata: {
        total: status.total,
        firstBrokenSeq: status.firstBrokenSeq,
        headHash: status.headHash,
      },
      ip,
    });
    return ok({ status });
  },
);
