'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

interface Shot {
  id: string;
  caption: string;
  width: number | null;
  height: number | null;
}

function Thumb({ shot, onOpen }: { shot: Shot; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="m-0">
      <button
        type="button"
        onClick={onOpen}
        disabled={failed}
        className="group block w-full overflow-hidden rounded-xl border border-line bg-surface-2"
      >
        {failed ? (
          <span className="flex aspect-[16/10] flex-col items-center justify-center gap-2 px-4 text-center text-[12px] text-muted">
            <ImageOff aria-hidden className="size-5" />
            No se pudo cargar. Revisa OPS_MEDIA_SECRET y PRODUCT_APP_ORIGIN.
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${shot.id}`}
            alt={shot.caption || 'Captura de la ficha'}
            loading="lazy"
            onError={() => setFailed(true)}
            className="aspect-[16/10] w-full object-contain transition group-hover:scale-[1.01]"
          />
        )}
      </button>
      <figcaption className="mt-1.5 truncate text-[12px] text-muted">
        {shot.caption || 'Sin descripción'}
        {shot.width && shot.height ? ` · ${shot.width}×${shot.height}` : ''}
      </figcaption>
    </figure>
  );
}

export function Gallery({ shots }: { shots: Shot[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open !== null ? shots[open] : null;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {shots.map((shot, index) => (
          <Thumb key={shot.id} shot={shot} onOpen={() => setOpen(index)} />
        ))}
      </div>
      <Dialog
        open={current !== null}
        onClose={() => setOpen(null)}
        size="lg"
        title={current?.caption || 'Captura'}
        description={open !== null ? `${open + 1} de ${shots.length}` : undefined}
        footer={
          shots.length > 1 ? (
            <>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-surface-3"
                aria-label="Anterior"
                onClick={() =>
                  setOpen(i => (i === null ? 0 : (i - 1 + shots.length) % shots.length))
                }
              >
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-surface-3"
                aria-label="Siguiente"
                onClick={() => setOpen(i => (i === null ? 0 : (i + 1) % shots.length))}
              >
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </>
          ) : undefined
        }
      >
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${current.id}`}
            alt={current.caption || 'Captura'}
            className="max-h-[70vh] w-full rounded-xl bg-surface-2 object-contain"
          />
        )}
      </Dialog>
    </>
  );
}
