import { opsRoute } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { accountDetail } from '@/lib/data/accounts';

export const runtime = 'nodejs';

export const GET = opsRoute<{ id: string }>({}, async ({ params }) => {
  if (!isUuid(params.id)) return failure('ID inválido.', 400);
  const detail = await accountDetail(params.id);
  if (!detail) return failure('Cuenta no encontrada.', 404);
  return ok(detail);
});
