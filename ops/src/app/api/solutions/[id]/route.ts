import { opsRoute } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { solutionDetail } from '@/lib/data/solutions';

export const runtime = 'nodejs';

export const GET = opsRoute<{ id: string }>({}, async ({ params }) => {
  if (!isUuid(params.id)) return failure('ID inválido.', 400);
  const detail = await solutionDetail(params.id);
  if (!detail) return failure('No encontrada.', 404);
  return ok(detail);
});
