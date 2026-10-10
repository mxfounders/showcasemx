'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, KeyRound, ShieldCheck, ShieldEllipsis } from 'lucide-react';
import { api, errorMessage, requestElevation } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { mmss, remaining, useSession } from '@/components/shell/SessionContext';
import type { ChainStatus } from '@/lib/data/audit';
import { Alert } from '@/components/ui/Field';
import { fmtDateTime, fmtNumber } from '@/lib/format';

export function SecureModeCard() {
  const { elevatedUntil, skewMs } = useSession();
  const left = remaining(elevatedUntil, skewMs);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${left > 0 ? 'bg-accent-soft text-accent-fg' : 'bg-surface-3 text-muted'}`}
        >
          {left > 0 ? (
            <ShieldCheck aria-hidden className="size-5" />
          ) : (
            <ShieldEllipsis aria-hidden className="size-5" />
          )}
        </span>
        <div>
          <p className="text-[14px] font-medium">
            {left > 0 ? `Activo · ${mmss(left)} restantes` : 'Inactivo'}
          </p>
          <p className="text-[12.5px] text-muted">
            Suspender cuentas, cambiar el equipo y exportar datos piden un código nuevo cada 10
            minutos.
          </p>
        </div>
      </div>
      {left <= 0 && (
        <Button
          tone="primary"
          onClick={() =>
            requestElevation(
              'Activa el modo seguro para desbloquear acciones críticas durante 10 minutos.',
            )
          }
        >
          Activar
        </Button>
      )}
    </div>
  );
}

export function BackupCodesButton({ left }: { left: number }) {
  const router = useRouter();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function regenerate() {
    setBusy(true);
    try {
      const data = await api<{ codes: string[] }>('/api/me/backup-codes', { body: {} });
      setCodes(data.codes);
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!codes) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          `Códigos de respaldo de shwcs ops\nGenerados: ${new Date().toISOString()}\n\n${codes.join('\n')}\n`,
        ],
        { type: 'text/plain' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shwcs-ops-codigos-de-respaldo.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${left <= 2 ? 'bg-amber-soft text-amber' : 'bg-surface-3 text-muted'}`}
          >
            <KeyRound aria-hidden className="size-5" />
          </span>
          <div>
            <p className="text-[14px] font-medium">{left} códigos de respaldo disponibles</p>
            <p className="text-[12.5px] text-muted">
              {left <= 2
                ? 'Te quedan pocos: genera nuevos.'
                : 'Cada uno sirve una vez si pierdes tu teléfono.'}
            </p>
          </div>
        </div>
        <Button tone="secondary" loading={busy} onClick={regenerate}>
          Generar nuevos
        </Button>
      </div>
      <Dialog
        open={codes !== null}
        onClose={() => setCodes(null)}
        title="Tus nuevos códigos de respaldo"
        description="Los anteriores dejaron de funcionar. Guárdalos ahora: no volverán a mostrarse."
        footer={
          <Button tone="solid" onClick={() => setCodes(null)}>
            Ya los guardé
          </Button>
        }
      >
        <div className="num grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl border border-line bg-surface-2 p-4 font-mono text-[13.5px]">
          {codes?.map(code => (
            <span key={code}>
              {code.slice(0, 4)} {code.slice(4)}
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            tone="secondary"
            icon={copied ? Check : Copy}
            className="flex-1"
            onClick={async () => {
              await navigator.clipboard.writeText(codes?.join('\n') ?? '').catch(() => undefined);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            Copiar
          </Button>
          <Button tone="secondary" icon={Download} className="flex-1" onClick={download}>
            Descargar .txt
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function ChainVerifier({ initial }: { initial: ChainStatus }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const ok = status.available && status.firstBrokenSeq === null;
  return (
    <div className="space-y-3">
      {!status.available ? (
        <Alert tone="amber" title="La cadena no está disponible">
          Aplica db/ops-hardening.sql en esta base para activar la bitácora encadenada.
        </Alert>
      ) : ok ? (
        <Alert tone="sage" title={`Íntegra · ${fmtNumber(status.total)} eventos verificados`}>
          Cada evento lleva el hash del anterior; ninguno fue editado, borrado ni insertado fuera de
          orden.
        </Alert>
      ) : (
        <Alert title={`Cadena rota en el evento #${status.firstBrokenSeq}`}>
          Alguien modificó la bitácora saltándose sus protecciones. Exporta la bitácora y revisa los
          eventos alrededor de ese número.
        </Alert>
      )}
      {status.headHash && (
        <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
          <p className="label-micro">Huella actual · evento #{status.headSeq}</p>
          <p className="mt-1 break-all font-mono text-[11.5px] text-fg-2">{status.headHash}</p>
          <p className="mt-1.5 text-[11.5px] text-muted">
            Anótala fuera del sistema de vez en cuando: si alguien reescribiera toda la cadena, la
            huella ya no coincidiría.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-muted">Verificada {fmtDateTime(status.verifiedAt)}</span>
        <Button
          tone="secondary"
          size="sm"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const data = await api<{ status: ChainStatus }>('/api/audit/verify', { body: {} });
              setStatus(data.status);
              toast(
                data.status.firstBrokenSeq === null
                  ? 'Bitácora íntegra'
                  : 'La bitácora tiene una ruptura',
                data.status.firstBrokenSeq === null ? 'success' : 'error',
              );
            } catch (err) {
              toast(errorMessage(err), 'error');
            } finally {
              setBusy(false);
            }
          }}
        >
          Verificar ahora
        </Button>
      </div>
    </div>
  );
}
