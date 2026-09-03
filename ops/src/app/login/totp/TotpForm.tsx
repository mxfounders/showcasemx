'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TotpForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed) && !/^\d{8}$/.test(trimmed)) {
      setError('Ingresa un código de 6 dígitos, o uno de respaldo de 8.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.replace('/panel');
      } else if (res.status === 409) {
        router.replace('/login/enroll');
      } else if (res.status === 401 && /sesión de acceso expirada/i.test(data.error ?? '')) {
        router.replace('/login');
      } else {
        setError(data.error ?? 'Error al verificar.');
      }
    } catch {
      setError('No se pudo conectar. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">Código</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={e => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
          placeholder="123456"
          required
          autoFocus
          className="px-4 py-3 rounded-xl border border-stone-300 text-base tracking-[0.3em] text-center bg-white outline-none transition focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15 w-full"
        />
      </label>

      {error && (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#e4ebfc] text-[#365dc4] font-semibold text-base transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(40,87,197,.14)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Verificando…' : 'Entrar al panel'}
      </button>
    </form>
  );
}
