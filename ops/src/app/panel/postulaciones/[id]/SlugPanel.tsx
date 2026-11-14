'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditIcon, ExternalLinkIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';
import { SLUG_ERROR, SLUG_MAX, checkSlugInput } from '@/lib/slug';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Field } from '@/components/ui/Field';
import type { SlugState } from '@/lib/data/slug';

/**
 * The listing's public address, /soluciones/<slug> (SHCWS-101). The first approval
 * assigns it from the name; an admin can rename it here. Every earlier slug keeps
 * redirecting (301) to the current one, so shared links and badges never break.
 */
export function SlugPanel({
  solutionId,
  name,
  state,
  productOrigin,
  published,
  admin,
}: {
  solutionId: string;
  name: string;
  state: SlugState;
  productOrigin: string | null;
  published: boolean;
  admin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = checkSlugInput(slug);
  const sameAsNow = check.ok && check.slug === state.slug;
  const slugError = slug.trim() && !check.ok ? SLUG_ERROR[check.error] : '';
  const valid = check.ok && !sameAsNow && reason.trim().length >= 10;
  const path = state.slug ? `/soluciones/${state.slug}` : null;

  function start() {
    setSlug(state.slug ?? '');
    setReason('');
    setError('');
    setOpen(true);
  }

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/solutions/${solutionId}/slug`, {
        body: { slug, reason: reason.trim() },
      });
      toast(
        'Dirección cambiada',
        'success',
        state.slug ? `/soluciones/${state.slug} sigue llevando a la ficha.` : undefined,
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-[13px]">
      {path ? (
        <p className="break-all font-mono text-[12.5px] text-fg-2">
          {productOrigin && published ? (
            <a
              href={`${productOrigin}/es${path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent-fg hover:underline"
            >
              {path}
              <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
            </a>
          ) : (
            path
          )}
        </p>
      ) : (
        <p className="text-muted">
          Se asigna al aprobarla por primera vez, a partir del nombre. Mientras tanto la ficha solo
          tiene su dirección por UUID.
        </p>
      )}
      {state.previous.length > 0 && (
        <div>
          <p className="text-[12px] text-muted">Direcciones anteriores, redirigen a la actual:</p>
          <ul className="mt-1 space-y-0.5">
            {state.previous.map(item => (
              <li key={item.slug} className="flex flex-wrap gap-x-2 text-[12.5px]">
                <span className="break-all font-mono text-fg-2">{`/soluciones/${item.slug}`}</span>
                {item.retiredAt && (
                  <span className="text-muted">hasta {fmtDate(item.retiredAt)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {admin && (
        <Button tone="ghost" size="xs" icon={EditIcon} onClick={start}>
          {state.slug ? 'Cambiar dirección' : 'Elegir dirección'}
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={`Dirección pública de «${name}»`}
        description="La ficha pasa a esta dirección de inmediato. La anterior queda en el historial y sigue llevando a la ficha con una redirección permanente. Si está publicada, el dueño recibe un aviso en su cuenta."
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button tone="solid" loading={busy} disabled={!valid} onClick={submit}>
              Guardar dirección
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field
            label="Dirección"
            htmlFor={`slug-${solutionId}`}
            error={slugError || null}
            hint={`shwcs.site/es/soluciones/${check.ok ? check.slug : '…'} · hasta ${SLUG_MAX} caracteres.`}
          >
            <input
              id={`slug-${solutionId}`}
              value={slug}
              onChange={event => setSlug(event.target.value)}
              maxLength={SLUG_MAX + 10}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="control h-10 font-mono"
            />
          </Field>
          <Field
            label="Motivo"
            htmlFor={`slug-reason-${solutionId}`}
            hint="Mínimo 10 caracteres. Queda en la bitácora; el dueño no lo ve."
          >
            <textarea
              id={`slug-reason-${solutionId}`}
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Por ejemplo: el proyecto cambió de nombre."
              className="control py-2.5"
            />
          </Field>
          {error && <Alert>{error}</Alert>}
        </form>
      </Dialog>
    </div>
  );
}
