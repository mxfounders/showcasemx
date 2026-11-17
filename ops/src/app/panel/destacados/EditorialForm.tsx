'use client';

import { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StarIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Alert, Field } from '@/components/ui/Field';

/**
 * «Selección shwcs» for a month. The note is public (why the team chose it); the reason
 * stays in the audit log. Listings the operator owns are listed but cannot be chosen:
 * picking your own project would be a conflict of interest, and the API refuses it too.
 */
export function EditorialForm({
  candidates,
  defaultMonth,
}: {
  candidates: { id: string; name: string; own: boolean }[];
  defaultMonth: string;
}) {
  const router = useRouter();
  const ids = useId();
  const [query, setQuery] = useState('');
  const [solutionId, setSolutionId] = useState('');
  const [month, setMonth] = useState(defaultMonth);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? candidates.filter(c => c.name.toLowerCase().includes(term)) : candidates;
  }, [candidates, query]);

  const ready =
    !!solutionId &&
    /^\d{4}-\d{2}$/.test(month) &&
    note.trim().length >= 10 &&
    note.trim().length <= 280 &&
    reason.trim().length >= 10;

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api('/api/awards', {
        body: {
          action: 'create-editorial',
          solutionId,
          month,
          note: note.trim(),
          reason: reason.trim(),
        },
      });
      toast('Selección shwcs creada', 'success', 'Ya se muestra en la ficha y en sus insignias.');
      setSolutionId('');
      setNote('');
      setReason('');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!candidates.length)
    return <p className="text-[13px] text-muted">No hay fichas publicadas para elegir.</p>;

  return (
    <form
      className="grid gap-4 lg:grid-cols-2"
      onSubmit={event => {
        event.preventDefault();
        if (ready && !busy) void submit();
      }}
    >
      <div className="space-y-3">
        <Field label="Buscar ficha" htmlFor={`${ids}-q`}>
          <input
            id={`${ids}-q`}
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="control h-9 text-[13px]"
            placeholder="Nombre de la ficha publicada…"
          />
        </Field>
        <Field
          label="Ficha"
          htmlFor={`${ids}-solution`}
          hint="Las fichas de tu propia cuenta aparecen deshabilitadas: elegirlas sería un conflicto de interés."
        >
          <select
            id={`${ids}-solution`}
            value={solutionId}
            onChange={event => setSolutionId(event.target.value)}
            className="control py-1.5 text-[13px]"
            size={Math.min(8, Math.max(3, visible.length + 1))}
          >
            <option value="">Elige una ficha…</option>
            {visible.map(candidate => (
              <option key={candidate.id} value={candidate.id} disabled={candidate.own}>
                {candidate.name}
                {candidate.own ? ' (tuya)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mes" htmlFor={`${ids}-month`}>
          <input
            id={`${ids}-month`}
            type="month"
            value={month}
            onChange={event => setMonth(event.target.value)}
            className="control h-9 text-[13px]"
          />
        </Field>
      </div>
      <div className="space-y-3">
        <Field
          label="Por qué la elegimos (público)"
          htmlFor={`${ids}-note`}
          hint={`${note.trim().length}/280 · Se muestra en la ficha. Concreto y verificable.`}
        >
          <textarea
            id={`${ids}-note`}
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={4}
            maxLength={280}
            className="control py-2 leading-relaxed"
            placeholder="Resuelve la conciliación bancaria de pymes sin pedir integración con el banco."
          />
        </Field>
        <Field label="Motivo interno" htmlFor={`${ids}-reason`} hint="Queda en la bitácora de ops.">
          <input
            id={`${ids}-reason`}
            value={reason}
            onChange={event => setReason(event.target.value)}
            maxLength={1000}
            className="control h-9 text-[13px]"
            placeholder="Elegida en la revisión editorial de noviembre"
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button
          type="submit"
          tone="success"
          size="md"
          icon={StarIcon}
          disabled={!ready}
          loading={busy}
        >
          Elegir como Selección shwcs
        </Button>
      </div>
    </form>
  );
}
