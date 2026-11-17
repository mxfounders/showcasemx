'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircleIcon,
  LockIcon,
  RadioUnselectedIcon,
  UndoIcon,
  VerifiedIcon,
} from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';
import { SAT_69B, VERIFICATION_CHECKS, checkLabel } from '@/lib/recognition';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, Field } from '@/components/ui/Field';
import { ActionButton } from '@/components/actions/ActionButton';
import type { VerificationState } from '@/lib/data/recognition';

export interface VerificationSignals {
  /** Host the public check would be tied to now (published website, else the draft's). */
  currentHost: string | null;
  /** Set when the draft points at another host than the published version. */
  draftHost: string | null;
  domainProof: { domain: string; verified: boolean; fresh: boolean; expired: boolean } | null;
  /** Owner account email domain equals (or is the parent of) the website host. */
  emailDomain: string | null;
  emailMatches: boolean;
}

function Signal({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px] leading-snug">
      {ok ? (
        <CheckCircleIcon aria-hidden className="mt-px size-4 shrink-0 text-sage" />
      ) : (
        <RadioUnselectedIcon aria-hidden className="mt-px size-4 shrink-0 text-subtle" />
      )}
      <span className={ok ? 'text-fg-2' : 'text-muted'}>{children}</span>
      <span className="sr-only">{ok ? '(sí)' : '(no)'}</span>
    </li>
  );
}

/**
 * «Verificado por shwcs»: the team confirms the listing is real and grants a public,
 * dated check tied to the website host. Founders never ask for it with a document.
 * The tax identity lives here too (internal): it powers the 69-B lookup and the
 * «Compra comprobada» review level, and is never published.
 */
export function VerificationPanel({
  solutionId,
  canVerify,
  state,
  signals,
  countries,
}: {
  solutionId: string;
  canVerify: boolean;
  state: VerificationState;
  signals: VerificationSignals;
  countries: { value: string; label: string }[];
}) {
  const router = useRouter();
  const ids = useId();
  const verification = state.verification;
  const tax = state.taxIdentity;
  const stale =
    !!verification && !!signals.currentHost && verification.host !== signals.currentHost;

  const [formOpen, setFormOpen] = useState(!verification && canVerify);
  const [checks, setChecks] = useState<string[]>(verification?.checks ?? []);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [taxOpen, setTaxOpen] = useState(false);
  const [country, setCountry] = useState(tax?.country ?? 'MX');
  const [taxId, setTaxId] = useState(tax?.taxId ?? '');
  const [taxReason, setTaxReason] = useState('');
  const [taxBusy, setTaxBusy] = useState(false);
  const [taxError, setTaxError] = useState('');

  const required = VERIFICATION_CHECKS.filter(c => c.required).map(c => c.id as string);
  const ready = required.every(c => checks.includes(c)) && note.trim().length >= 10;

  async function verify() {
    setBusy(true);
    setError('');
    try {
      await api('/api/verification', {
        body: { action: 'verify', solutionId, checks, note: note.trim() },
      });
      toast('Ficha verificada', 'success', 'La palomita se muestra mientras siga publicada.');
      setFormOpen(false);
      setNote('');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveTax() {
    setTaxBusy(true);
    setTaxError('');
    try {
      await api('/api/verification', {
        body: { action: 'tax-save', solutionId, country, taxId, reason: taxReason.trim() },
      });
      toast('Identidad fiscal guardada', 'success');
      setTaxOpen(false);
      setTaxReason('');
      router.refresh();
    } catch (err) {
      setTaxError(errorMessage(err));
    } finally {
      setTaxBusy(false);
    }
  }

  const situation = tax?.situation ? SAT_69B[tax.situation] : null;

  return (
    <div className="space-y-4 text-[13px]">
      {verification ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stale ? 'amber' : 'blue'} icon={VerifiedIcon}>
              {stale ? 'Verificación sin efecto' : 'Verificada'}
            </Badge>
            <span className="text-[12.5px] text-muted">
              {fmtDate(verification.verifiedAt)} · {verification.verifiedByEmail ?? 'ops'}
            </span>
          </div>
          <p className="font-mono text-[12.5px]">{verification.host}</p>
          {stale && (
            <Alert tone="amber">
              La verificación quedó en otro dominio; ya no se muestra en público. El sitio actual es{' '}
              <span className="font-mono">{signals.currentHost}</span>.
            </Alert>
          )}
          <ul className="space-y-1">
            {verification.checks.map(check => (
              <Signal key={check} ok>
                {checkLabel(check)}
              </Signal>
            ))}
          </ul>
          {verification.note && (
            <p className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-fg-2">
              <span className="label-micro mr-1.5">Nota interna</span>
              {verification.note}
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted">
          Sin verificar: el público no ve la palomita. La verificación la decide el equipo, no se
          solicita con documentos.
        </p>
      )}

      <div>
        <p className="label-micro mb-2">Señales</p>
        <ul className="space-y-1.5">
          <Signal ok={!!signals.domainProof?.verified && !signals.domainProof.expired}>
            {signals.domainProof
              ? signals.domainProof.verified
                ? `TXT comprobado en ${signals.domainProof.domain}${signals.domainProof.fresh ? '' : ' · revalidar (+90 días)'}`
                : `TXT pendiente en ${signals.domainProof.domain}${signals.domainProof.expired ? ' · desafío vencido' : ''}`
              : 'Sin prueba TXT del dominio (opcional para el fundador)'}
          </Signal>
          <Signal ok={signals.emailMatches}>
            {signals.emailDomain
              ? signals.emailMatches
                ? `El correo del propietario es del dominio (@${signals.emailDomain})`
                : `El correo del propietario es @${signals.emailDomain}, no del sitio`
              : 'Sin correo del propietario'}
          </Signal>
          {signals.draftHost && (
            <Signal ok={false}>
              El borrador cambia el sitio a <span className="font-mono">{signals.draftHost}</span>
            </Signal>
          )}
          {situation && (
            <li className="pt-0.5">
              <Badge tone={situation.tone} dot>
                {situation.label}
              </Badge>
            </li>
          )}
        </ul>
        <p className="mt-2 text-[11.5px] text-muted">
          Son indicios para decidir, nunca verifican por sí solos.
        </p>
      </div>

      {canVerify && !formOpen && (
        <div className="flex flex-wrap gap-2">
          <Button
            tone="primary"
            size="sm"
            icon={VerifiedIcon}
            onClick={() => {
              setChecks(verification?.checks ?? []);
              setFormOpen(true);
            }}
          >
            {verification ? 'Volver a verificar' : 'Verificar'}
          </Button>
          {verification && (
            <ActionButton
              label="Retirar verificación"
              tone="danger"
              size="sm"
              icon={<UndoIcon />}
              endpoint="/api/verification"
              payload={{ action: 'revoke', solutionId }}
              success="Verificación retirada"
              confirm={{
                title: '¿Retirar la verificación?',
                description:
                  'La palomita deja de mostrarse en la ficha, el catálogo y las insignias. Queda en la bitácora.',
                destructive: true,
                confirmLabel: 'Retirar',
              }}
            />
          )}
        </div>
      )}
      {!canVerify && !verification && (
        <p className="text-[12px] text-muted">
          Se verifica cuando la ficha está publicada o enviada a revisión.
        </p>
      )}
      {!canVerify && verification && (
        <ActionButton
          label="Retirar verificación"
          tone="danger"
          size="sm"
          icon={<UndoIcon />}
          endpoint="/api/verification"
          payload={{ action: 'revoke', solutionId }}
          success="Verificación retirada"
          confirm={{
            title: '¿Retirar la verificación?',
            description: 'La palomita deja de mostrarse. Queda en la bitácora.',
            destructive: true,
            confirmLabel: 'Retirar',
          }}
        />
      )}

      {canVerify && formOpen && (
        <form
          className="space-y-3 rounded-xl border border-line p-3.5"
          onSubmit={event => {
            event.preventDefault();
            if (ready && !busy) void verify();
          }}
        >
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[13px] font-medium text-fg-2">Lo que confirmaste</legend>
            {VERIFICATION_CHECKS.map(check => (
              <label key={check.id} className="flex items-start gap-2.5 text-[12.5px] text-fg-2">
                <input
                  type="checkbox"
                  checked={checks.includes(check.id)}
                  onChange={event =>
                    setChecks(current =>
                      event.target.checked
                        ? [...current, check.id]
                        : current.filter(c => c !== check.id),
                    )
                  }
                  className="mt-0.5 size-4 shrink-0 accent-[rgb(var(--accent))]"
                />
                <span>
                  {check.label}
                  {!check.required && <span className="ml-1 text-subtle">(si aplica)</span>}
                </span>
              </label>
            ))}
          </fieldset>
          <Field
            label="Nota interna"
            htmlFor={`${ids}-note`}
            hint="Cómo lo comprobaste. Solo la ve el equipo; queda en la bitácora."
          >
            <textarea
              id={`${ids}-note`}
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={3}
              maxLength={1000}
              className="control py-2 leading-relaxed"
              placeholder="Probé la demo, hablé con la fundadora por videollamada…"
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              tone="success"
              size="sm"
              icon={VerifiedIcon}
              disabled={!ready}
              loading={busy}
            >
              {verification ? 'Actualizar verificación' : 'Verificar ficha'}
            </Button>
            <Button tone="ghost" size="sm" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
          </div>
          {!ready && (
            <p className="text-[11.5px] text-muted">
              Marca las tres comprobaciones obligatorias y escribe una nota de 10 caracteres o más.
            </p>
          )}
        </form>
      )}

      <div className="border-t border-line pt-4">
        <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-fg-2">
          <LockIcon aria-hidden className="size-3.5 text-subtle" /> Identidad fiscal
        </p>
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted">
          Uso interno. Nunca se publica. Habilita la consulta de la lista 69-B y el nivel “Compra
          comprobada” en reseñas.
        </p>
        {tax && !taxOpen && (
          <div className="mb-2.5 space-y-1">
            <p>
              <span className="text-muted">{tax.country} · </span>
              <span className="font-mono">{tax.taxId}</span>
            </p>
            <p className="text-[11.5px] text-muted">Actualizada {fmtDate(tax.updatedAt)}</p>
          </div>
        )}
        {!taxOpen ? (
          <div className="flex flex-wrap gap-2">
            <Button tone="secondary" size="xs" onClick={() => setTaxOpen(true)}>
              {tax ? 'Cambiar' : 'Registrar identidad fiscal'}
            </Button>
            {tax && (
              <ActionButton
                label="Borrar"
                tone="ghost"
                size="xs"
                endpoint="/api/verification"
                payload={{ action: 'tax-delete', solutionId }}
                success="Identidad fiscal borrada"
                confirm={{
                  title: '¿Borrar la identidad fiscal?',
                  description:
                    'Deja de consultarse la lista 69-B y las reseñas ya no pueden comprobar compras con CFDI.',
                  destructive: true,
                  confirmLabel: 'Borrar',
                }}
              />
            )}
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={event => {
              event.preventDefault();
              if (!taxBusy) void saveTax();
            }}
          >
            <Field label="País" htmlFor={`${ids}-country`}>
              <select
                id={`${ids}-country`}
                value={country}
                onChange={event => setCountry(event.target.value)}
                className="control h-9 text-[13px]"
              >
                {countries.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={country === 'MX' ? 'RFC' : 'Identificador fiscal'} htmlFor={`${ids}-tax`}>
              <input
                id={`${ids}-tax`}
                value={taxId}
                onChange={event => setTaxId(event.target.value)}
                maxLength={40}
                autoComplete="off"
                spellCheck={false}
                className="control h-9 font-mono text-[13px] uppercase"
              />
            </Field>
            <Field
              label="Motivo"
              htmlFor={`${ids}-tax-reason`}
              hint="Queda en la bitácora sin el identificador."
            >
              <input
                id={`${ids}-tax-reason`}
                value={taxReason}
                onChange={event => setTaxReason(event.target.value)}
                maxLength={1000}
                className="control h-9 text-[13px]"
                placeholder="Confirmado en la constancia de situación fiscal"
              />
            </Field>
            {taxError && <Alert>{taxError}</Alert>}
            <div className="flex gap-2">
              <Button
                type="submit"
                tone="primary"
                size="sm"
                disabled={!taxId.trim() || taxReason.trim().length < 10}
                loading={taxBusy}
              >
                Guardar
              </Button>
              <Button tone="ghost" size="sm" onClick={() => setTaxOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
