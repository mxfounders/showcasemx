'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Alert, Field } from '@/components/ui/Field';
import { PROFILE, ROLE } from '@/lib/labels';
import type { CampaignContent, CampaignCopy } from '@/lib/newsletter';

const LIMITS = { subject: 150, preheader: 200, heading: 150, body: 6000 } as const;
const PROFILES = ['founder', 'buyer', 'both', 'exploring'] as const;
const ROLES = [
  'leadership',
  'product_tech',
  'sales_marketing',
  'operations',
  'finance_procurement',
  'other',
] as const;

function CopyFields({
  value,
  onChange,
  idPrefix,
}: {
  value: CampaignCopy;
  onChange: (next: CampaignCopy) => void;
  idPrefix: string;
}) {
  const set = (key: keyof CampaignCopy) => (event: { target: { value: string } }) =>
    onChange({ ...value, [key]: event.target.value });
  return (
    <div className="space-y-3">
      <Field
        label="Asunto"
        htmlFor={`${idPrefix}-subject`}
        hint={`${value.subject.length}/${LIMITS.subject}`}
      >
        <input
          id={`${idPrefix}-subject`}
          value={value.subject}
          onChange={set('subject')}
          maxLength={LIMITS.subject}
          className="control h-9 text-[13px]"
        />
      </Field>
      <Field
        label="Texto de vista previa"
        htmlFor={`${idPrefix}-preheader`}
        hint="Lo que el cliente de correo muestra junto al asunto. Opcional."
      >
        <input
          id={`${idPrefix}-preheader`}
          value={value.preheader}
          onChange={set('preheader')}
          maxLength={LIMITS.preheader}
          className="control h-9 text-[13px]"
        />
      </Field>
      <Field label="Título" htmlFor={`${idPrefix}-heading`}>
        <input
          id={`${idPrefix}-heading`}
          value={value.heading}
          onChange={set('heading')}
          maxLength={LIMITS.heading}
          className="control h-9 text-[13px]"
        />
      </Field>
      <Field
        label="Texto"
        htmlFor={`${idPrefix}-body`}
        hint={`${value.body.length}/${LIMITS.body} · Párrafos separados por una línea en blanco; «## Subtítulo», «- elemento», **negritas** y [texto](https://… o /es/ruta). Sin HTML.`}
      >
        <textarea
          id={`${idPrefix}-body`}
          value={value.body}
          onChange={set('body')}
          maxLength={LIMITS.body}
          rows={12}
          className="control py-2 font-mono text-[12.5px] leading-relaxed"
        />
      </Field>
    </div>
  );
}

/**
 * Draft editor. Saving bumps the version, which asks for a new test before sending: the
 * product only sends the exact version that reached the test inbox.
 */
export function CampaignEditor({
  id,
  version,
  content,
  segment,
}: {
  id: string;
  version: number;
  content: CampaignContent;
  segment: { profiles: string[]; roles: string[] };
}) {
  const router = useRouter();
  const ids = useId();
  const [es, setEs] = useState(content.es);
  const [english, setEnglish] = useState(Boolean(content.en));
  const [en, setEn] = useState<CampaignCopy>(
    content.en ?? { subject: '', preheader: '', heading: '', body: '' },
  );
  const [listings, setListings] = useState(content.listings.map(item => item.solutionId));
  const [profiles, setProfiles] = useState(segment.profiles);
  const [roles, setRoles] = useState(segment.roles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter(item => item !== value) : [...list, value];

  async function save() {
    setBusy(true);
    setError('');
    try {
      const data = await api<{ version: number; reach: number }>('/api/newsletter/campaigns', {
        body: {
          action: 'update',
          id,
          version,
          es,
          en: english ? en : null,
          listings,
          segment: { profiles, roles },
        },
      });
      toast(
        `Guardada como versión ${data.version}`,
        'success',
        `Llega a ${data.reach} confirmados. Envía una prueba de esta versión antes de enviarla.`,
      );
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={event => {
        event.preventDefault();
        if (!busy) void save();
      }}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="label-micro mb-2">Español (obligatorio)</legend>
          <CopyFields value={es} onChange={setEs} idPrefix={`${ids}-es`} />
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="label-micro mb-2">Inglés</legend>
          <label className="flex items-center gap-2 text-[13px] text-fg-2">
            <input
              type="checkbox"
              checked={english}
              onChange={event => setEnglish(event.target.checked)}
            />
            Escribir una versión en inglés
          </label>
          {english ? (
            <CopyFields value={en} onChange={setEn} idPrefix={`${ids}-en`} />
          ) : (
            <p className="text-[13px] text-muted">
              Sin versión en inglés, quienes se suscribieron desde la página en inglés reciben la de
              español.
            </p>
          )}
        </fieldset>
      </div>

      {content.listings.length > 0 && (
        <fieldset>
          <legend className="label-micro mb-2">Fichas ({listings.length})</legend>
          <p className="mb-3 text-[13px] text-muted">
            Copias de las fichas publicadas con las palabras de cada fundador; no se editan aquí.
            Quita las que no quieras incluir.
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {content.listings.map(item => (
              <li key={item.solutionId} className="flex items-start gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label={`Incluir ${item.name}`}
                  checked={listings.includes(item.solutionId)}
                  onChange={() => setListings(current => toggle(current, item.solutionId))}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-fg">{item.name}</p>
                  <p className="text-[12.5px] text-muted">{item.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="label-micro mb-2">Segmento</legend>
        <p className="mb-3 text-[13px] text-muted">
          Sin marcar nada, la campaña llega a todas las suscripciones confirmadas. Las anteriores a
          la segmentación no tienen perfil: solo las alcanza una campaña sin filtro de perfil.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[13px] font-medium text-fg-2">Perfil</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {PROFILES.map(value => (
                <label key={value} className="flex items-center gap-2 text-[13px] text-fg-2">
                  <input
                    type="checkbox"
                    checked={profiles.includes(value)}
                    onChange={() => setProfiles(current => toggle(current, value))}
                  />
                  {PROFILE[value]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-fg-2">Rol</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ROLES.map(value => (
                <label key={value} className="flex items-center gap-2 text-[13px] text-fg-2">
                  <input
                    type="checkbox"
                    checked={roles.includes(value)}
                    onChange={() => setRoles(current => toggle(current, value))}
                  />
                  {ROLE[value]}
                </label>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {error && <Alert>{error}</Alert>}
      <div className="flex items-center gap-3">
        <Button type="submit" tone="primary" loading={busy}>
          Guardar como nueva versión
        </Button>
        <p className="text-[12.5px] text-muted">Guardar pide una nueva prueba antes de enviar.</p>
      </div>
    </form>
  );
}

/** Sends the required test of one exact version to one address (the operator's by default). */
export function TestSend({
  id,
  version,
  defaultTo,
}: {
  id: string;
  version: number;
  defaultTo: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          const data = await api<{ message?: string }>('/api/newsletter/campaigns', {
            body: { action: 'test', id, version, to },
          });
          toast('Prueba enviada', 'success', data.message);
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Correo de prueba" htmlFor={inputId} className="sm:w-80" error={error || null}>
        <input
          id={inputId}
          type="email"
          value={to}
          onChange={event => setTo(event.target.value)}
          className="control h-9 text-[13px]"
          required
        />
      </Field>
      <Button type="submit" tone="secondary" loading={busy}>
        Enviar prueba de la versión {version}
      </Button>
    </form>
  );
}
