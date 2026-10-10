'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle2, MessageSquareWarning, Undo2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Field';

type Action = 'publish' | 'changes_requested' | 'reject' | 'withdraw';

const TEMPLATES: Record<Action, string[]> = {
  publish: [
    'Gracias. Tu ficha cumple los criterios editoriales y ya está publicada en el catálogo.',
  ],
  changes_requested: [
    'Para publicar necesitamos que precises a qué cliente le sirve y qué problema concreto resuelve.',
    'Agrega al menos una captura real del producto y el rango de precio o cómo cotizan.',
    'El sitio web no carga o no corresponde al proyecto. Revisa el enlace y vuelve a enviar.',
  ],
  reject: [
    'Por ahora el proyecto no encaja con el catálogo de soluciones B2B para empresas mexicanas.',
  ],
  withdraw: ['Retiramos la publicación mientras se corrige información que ya no es vigente.'],
};

const LABEL: Record<Action, string> = {
  publish: 'publicada',
  changes_requested: 'devuelta con cambios',
  reject: 'rechazada',
  withdraw: 'retirada del catálogo',
};

export function DecisionPanel({
  solutionId,
  status,
  version,
  nextHref,
}: {
  solutionId: string;
  status: string;
  version: number;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<Action | null>(null);
  const reviewable = status === 'pending' || status === 'changes_requested';
  const published = status === 'published';
  const valid = message.trim().length >= 5;

  if (!reviewable && !published)
    return (
      <p className="text-[13px] text-muted">
        {status === 'draft'
          ? 'Es un borrador: el fundador todavía no lo envía a revisión.'
          : 'Esta ficha fue rechazada. Si el fundador la corrige y la reenvía, volverá a la cola.'}
      </p>
    );

  async function decide(action: Action) {
    setBusy(action);
    setError('');
    try {
      await api('/api/review', { body: { solutionId, action, message: message.trim(), version } });
      toast(`Ficha ${LABEL[action]}`, 'success', 'El fundador verá tu mensaje en su historial.');
      setConfirm(null);
      setMessage('');
      if (nextHref && action !== 'withdraw') router.push(nextHref);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  const templates = published
    ? TEMPLATES.withdraw
    : [...TEMPLATES.publish, ...TEMPLATES.changes_requested, ...TEMPLATES.reject];

  return (
    <div className="space-y-3">
      <label htmlFor="decision-message" className="text-[13px] font-medium text-fg-2">
        Mensaje para el fundador
      </label>
      <div className="flex flex-wrap gap-1.5">
        {templates.map(template => (
          <button
            key={template}
            type="button"
            onClick={() => setMessage(template)}
            title={template}
            className="max-w-full truncate rounded-full border border-line px-2.5 py-1 text-[11.5px] text-muted transition hover:border-accent/40 hover:text-accent-fg"
          >
            {template.slice(0, 34)}…
          </button>
        ))}
      </div>
      <textarea
        id="decision-message"
        value={message}
        onChange={event => setMessage(event.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="Visible en el historial del fundador. Sé concreto: qué falta o por qué."
        className="control py-2.5 leading-relaxed"
      />
      <p className="num text-right text-[11.5px] text-muted">{message.trim().length}/2000</p>
      {error && <Alert>{error}</Alert>}
      {reviewable ? (
        <div className="grid gap-2">
          <Button
            tone="success"
            size="md"
            icon={CheckCircle2}
            disabled={!valid || busy !== null}
            loading={busy === 'publish'}
            onClick={() => decide('publish')}
          >
            Publicar
          </Button>
          <div className="grid grid-cols-2 gap-2">
            {status === 'pending' && (
              <Button
                tone="secondary"
                icon={MessageSquareWarning}
                disabled={!valid || busy !== null}
                loading={busy === 'changes_requested'}
                onClick={() => decide('changes_requested')}
              >
                Pedir cambios
              </Button>
            )}
            <Button
              tone="danger"
              icon={Ban}
              disabled={!valid || busy !== null}
              className={status === 'pending' ? '' : 'col-span-2'}
              onClick={() => setConfirm('reject')}
            >
              Rechazar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          tone="danger"
          size="md"
          icon={Undo2}
          className="w-full"
          disabled={!valid || busy !== null}
          onClick={() => setConfirm('withdraw')}
        >
          Retirar del catálogo
        </Button>
      )}
      {!valid && (
        <p className="text-[12px] text-muted">
          Escribe un mensaje de al menos 5 caracteres para decidir.
        </p>
      )}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'withdraw' ? '¿Retirar esta ficha del catálogo?' : '¿Rechazar esta ficha?'
        }
        description={
          confirm === 'withdraw'
            ? 'Deja de ser pública de inmediato. El borrador, las capturas y las solicitudes existentes se conservan.'
            : 'El fundador recibirá tu mensaje. Si ya tenía una versión pública, esa se mantiene.'
        }
        footer={
          <>
            <Button tone="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              tone="danger"
              loading={busy !== null}
              onClick={() => confirm && decide(confirm)}
            >
              {confirm === 'withdraw' ? 'Retirar' : 'Rechazar'}
            </Button>
          </>
        }
      >
        <blockquote className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-fg-2">
          «{message.trim()}»
        </blockquote>
      </Dialog>
    </div>
  );
}
