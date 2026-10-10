import { opsRoute } from '@/lib/api';
import { audit } from '@/lib/audit';
import { ok } from '@/lib/http';
import { hashBackupCode } from '@/lib/crypto';
import { generateBackupCodes } from '@/lib/totp';

export const runtime = 'nodejs';

/** Replaces every backup code. Shown once; only hashes are stored. */
export const POST = opsRoute(
  { elevated: true, limit: ['backup-codes', 6, 60] },
  async ({ user, sql, ip }) => {
    const codes = generateBackupCodes(10);
    await sql`UPDATE solution_reviewers SET backup_codes = ${codes.map(hashBackupCode)} WHERE account_id = ${user.id}`;
    await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'backup_codes_regenerated',
      subjectType: 'account',
      subjectId: user.id,
      ip,
    });
    return ok({ codes });
  },
);
