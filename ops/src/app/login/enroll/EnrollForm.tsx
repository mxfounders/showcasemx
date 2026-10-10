'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Field';
import { OtpInput } from '@/components/ui/OtpInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/cn';

interface StartData {
  secret: string;
  qrDataUri: string;
  backupCodes: string[];
  email: string;
}

const STEPS = ['Escanea', 'Guarda respaldo', 'Confirma'];

export default function EnrollForm() {
  const router = useRouter();
  const [data, setData] = useState<StartData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<'secret' | 'codes' | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'start' }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && json.ok) setData(json);
        else if (res.status === 409) router.replace('/login/totp');
        else if (res.status === 401) router.replace('/login?reason=expired');
        else setLoadError(json.error ?? 'No se pudo generar el código QR.');
      } catch {
        if (!cancelled) setLoadError('No se pudo conectar. Revisa tu conexión.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function copy(text: string, which: 'secret' | 'codes') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  function download() {
    if (!data) return;
    const body = `Códigos de respaldo de shwcs ops\nCuenta: ${data.email}\nGenerados: ${new Date().toISOString()}\n\nCada código funciona una sola vez.\n\n${data.backupCodes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shwcs-ops-codigos-de-respaldo.txt';
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }

  async function confirm(value: string) {
    if (submitting || !/^\d{6}$/.test(value)) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'confirm', code: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        router.replace('/panel');
        return;
      }
      if (res.status === 401 && /expirada/i.test(json.error ?? '')) {
        router.replace('/login?reason=expired');
        return;
      }
      setError(json.error ?? 'Código incorrecto.');
      setCode('');
    } catch {
      setError('No se pudo conectar. Revisa tu conexión.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError)
    return (
      <div className="space-y-4">
        <Alert>{loadError}</Alert>
        <a
          href="/login"
          className="block text-center text-sm font-medium text-accent-fg hover:underline"
        >
          Volver a iniciar sesión
        </a>
      </div>
    );

  if (!data)
    return (
      <div className="flex flex-col items-center gap-3" aria-busy="true">
        <Skeleton className="size-[200px] rounded-2xl" />
        <Skeleton className="h-4 w-48" />
      </div>
    );

  return (
    <div className="space-y-6">
      <ol className="flex gap-1.5" aria-label="Progreso">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <span
              className={cn('block h-1 rounded-full', index <= step ? 'bg-accent' : 'bg-surface-3')}
            />
            <span
              className={cn(
                'mt-1.5 block text-[11.5px] font-medium',
                index === step ? 'text-fg' : 'text-muted',
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.qrDataUri}
              alt="Código QR para tu app autenticadora"
              width={200}
              height={200}
              className="rounded-2xl border border-line bg-white p-2"
            />
          </div>
          <div>
            <p className="text-center text-[12.5px] text-muted">
              ¿No puedes escanear? Escribe esta clave en tu app:
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
              <code className="flex-1 break-all font-mono text-[12px] tracking-wider text-fg">
                {data.secret.match(/.{1,4}/g)?.join(' ')}
              </code>
              <button
                type="button"
                onClick={() => copy(data.secret, 'secret')}
                className="rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-fg"
                aria-label="Copiar clave"
              >
                {copied === 'secret' ? (
                  <Check aria-hidden className="size-4 text-sage" />
                ) : (
                  <Copy aria-hidden className="size-4" />
                )}
              </button>
            </div>
          </div>
          <Button tone="solid" size="md" className="h-11 w-full" onClick={() => setStep(1)}>
            Ya lo agregué
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber/30 bg-amber-soft p-4">
            <p className="text-[13px] font-semibold text-amber">
              Guarda estos códigos ahora. No volverán a mostrarse.
            </p>
            <p className="mt-0.5 text-[12.5px] text-amber/90">
              Te dejan entrar si pierdes tu teléfono. Cada uno sirve una vez.
            </p>
            <div className="num mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[13px] text-fg">
              {data.backupCodes.map(c => (
                <span key={c}>
                  {c.slice(0, 4)} {c.slice(4)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              tone="secondary"
              icon={copied === 'codes' ? Check : Copy}
              className="flex-1"
              onClick={() => {
                void copy(data.backupCodes.join('\n'), 'codes');
                setSaved(true);
              }}
            >
              Copiar
            </Button>
            <Button tone="secondary" icon={Download} className="flex-1" onClick={download}>
              Descargar .txt
            </Button>
          </div>
          <label className="flex items-start gap-2.5 text-[13px] text-fg-2">
            <input
              type="checkbox"
              checked={saved}
              onChange={event => setSaved(event.target.checked)}
              className="mt-0.5 size-4 accent-[rgb(var(--accent))]"
            />
            Guardé mis códigos de respaldo en un lugar seguro.
          </label>
          <Button
            tone="solid"
            size="md"
            className="h-11 w-full"
            disabled={!saved}
            onClick={() => setStep(2)}
          >
            Continuar
          </Button>
        </div>
      )}

      {step === 2 && (
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void confirm(code);
          }}
        >
          <p className="text-center text-[13px] text-muted">
            Escribe el código que muestra tu app ahora mismo.
          </p>
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={confirm}
            autoFocus
            disabled={submitting}
            invalid={Boolean(error)}
          />
          {error && <Alert>{error}</Alert>}
          <Button
            type="submit"
            tone="solid"
            size="md"
            loading={submitting}
            disabled={code.length !== 6}
            className="h-11 w-full"
          >
            Confirmar y entrar
          </Button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="block w-full text-center text-[12.5px] text-muted hover:text-fg"
          >
            Volver a ver el código QR
          </button>
        </form>
      )}
    </div>
  );
}
