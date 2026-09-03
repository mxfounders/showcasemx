'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StartData {
  secret: string;
  qrDataUri: string;
  backupCodes: string[];
}

export default function EnrollForm() {
  const router = useRouter();
  const [data, setData] = useState<StartData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
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
        if (res.ok && json.ok) {
          setData({ secret: json.secret, qrDataUri: json.qrDataUri, backupCodes: json.backupCodes });
        } else if (res.status === 409) {
          router.replace('/login/totp');
        } else if (res.status === 401) {
          router.replace('/login');
        } else {
          setLoadError(json.error ?? 'No se pudo generar el código QR.');
        }
      } catch {
        if (!cancelled) setLoadError('No se pudo conectar. Revisa tu conexión.');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) { setError('Ingresa el código de 6 dígitos de tu app.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'confirm', code: code.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        router.replace('/panel');
      } else if (res.status === 401) {
        router.replace('/login');
      } else {
        setError(json.error ?? 'Código incorrecto.');
      }
    } catch {
      setError('No se pudo conectar. Revisa tu conexión.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4 items-center text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <a href="/login" className="text-sm font-semibold text-[#365dc4]">Volver a iniciar sesión</a>
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-sm text-stone-400">Generando código…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.qrDataUri} alt="Código QR del autenticador" width={200} height={200} className="rounded-xl border border-stone-200" />
        <p className="text-xs text-stone-400 text-center">
          ¿No puedes escanear? Ingresa esta clave manualmente:
        </p>
        <code className="text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 break-all text-center">
          {data.secret}
        </code>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-800 mb-2">
          Códigos de respaldo — guárdalos ahora, no se mostrarán de nuevo
        </p>
        <div className="grid grid-cols-2 gap-1.5 font-mono text-xs text-amber-900">
          {data.backupCodes.map(c => <span key={c}>{c}</span>)}
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-stone-600">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={e => setAcknowledged(e.target.checked)}
          className="mt-0.5"
        />
        Guardé mis códigos de respaldo en un lugar seguro.
      </label>

      <form onSubmit={handleConfirm} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Código de tu app</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            placeholder="123456"
            disabled={!acknowledged}
            required
            className="px-4 py-3 rounded-xl border border-stone-300 text-base tracking-[0.3em] text-center bg-white outline-none transition focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15 w-full disabled:bg-stone-50 disabled:text-stone-400"
          />
        </label>

        {error && (
          <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!acknowledged || submitting}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#e4ebfc] text-[#365dc4] font-semibold text-base transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(40,87,197,.14)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Confirmando…' : 'Confirmar y entrar'}
        </button>
      </form>
    </div>
  );
}
