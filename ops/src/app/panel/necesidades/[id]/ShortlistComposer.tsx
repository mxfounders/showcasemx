'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Field';
import type { ListingOption } from '@/lib/data/briefs';

/**
 * Builds the buyer's short list (SHCWS-60): up to three published listings and a note.
 * The listings the brief already reached come first. One per brief; the id is generated
 * here so a retried send is the same short list.
 */
export function ShortlistComposer({
  briefId,
  options,
}: {
  briefId: string;
  options: ListingOption[];
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useRef<string | null>(null);
  const toggle = (value: string) =>
    setChosen(current =>
      current.includes(value)
        ? current.filter(item => item !== value)
        : current.length >= 3
          ? current
          : [...current, value],
    );
  const trimmed = note.trim();
  return (
    <form
      className="space-y-4"
      onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        if (!chosen.length) return setError('Elige de una a tres fichas.');
        if (trimmed.length < 10) return setError('Escribe una nota para el comprador.');
        setBusy(true);
        setError(null);
        id.current ??= crypto.randomUUID();
        try {
          const data = await api<{ message?: string }>('/api/briefs', {
            body: {
              action: 'shortlist',
              id: id.current,
              briefId,
              solutionIds: chosen,
              note: trimmed,
            },
          });
          toast('Lista corta enviada', 'success', data.message);
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend className="mb-2 text-[13px] font-medium text-fg-2">
          Fichas ({chosen.length}/3)
        </legend>
        {options.length === 0 ? (
          <p className="text-[13px] text-muted">
            Ninguna ficha publicada coincide con la búsqueda.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {options.map(option => {
              const checked = chosen.includes(option.id);
              return (
                <li key={option.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3.5 py-2.5 text-[13.5px] hover:bg-surface-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && chosen.length >= 3}
                      onChange={() => toggle(option.id)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-fg">{option.name}</span>
                      {option.matched && (
                        <Badge tone="sage" className="ml-2">
                          Le llegó la necesidad
                        </Badge>
                      )}
                      <span className="block text-[12.5px] text-muted">
                        {option.categories.join(', ')}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="shortlist-note" className="text-[13px] font-medium text-fg-2">
          Nota para el comprador
        </label>
        <textarea
          id="shortlist-note"
          value={note}
          onChange={event => setNote(event.target.value)}
          rows={4}
          maxLength={2000}
          disabled={busy}
          placeholder="Por qué estas fichas encajan con lo que pidió y qué preguntarles. La lee el comprador en su cuenta y en el correo."
          className="control py-2.5 leading-relaxed"
        />
        <p className="num text-right text-[12px] text-muted">{trimmed.length}/2000</p>
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" tone="primary" icon={MailIcon} disabled={busy}>
        {busy ? 'Enviando…' : 'Enviar lista corta'}
      </Button>
    </form>
  );
}
