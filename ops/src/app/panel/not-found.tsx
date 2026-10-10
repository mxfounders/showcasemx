import { SearchX } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-3 text-muted">
        <SearchX aria-hidden className="size-6" />
      </span>
      <h1 className="text-lg font-semibold">No encontramos esto</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        El registro no existe, se eliminó o no tienes permiso para verlo.
      </p>
      <ButtonLink href="/panel" tone="primary" className="mt-5">
        Volver al inicio
      </ButtonLink>
    </div>
  );
}
