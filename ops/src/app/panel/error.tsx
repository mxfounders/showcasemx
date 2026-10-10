'use client';

import { useEffect } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta">
        <TriangleAlert aria-hidden className="size-6" />
      </span>
      <h1 className="text-lg font-semibold">No pudimos cargar esta sección</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        Puede ser un problema temporal con la base de datos. No se perdió ningún cambio que ya hayas
        confirmado.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11.5px] text-subtle">Referencia {error.digest}</p>
      )}
      <Button tone="primary" icon={RefreshCw} className="mt-5" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
