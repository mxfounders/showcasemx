'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Ingresa tu correo y contraseña.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.replace('/panel');
      } else {
        setError(data.error ?? 'Error al iniciar sesión.');
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
        <span className="text-sm font-medium text-stone-700">Correo electrónico</span>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          className="px-4 py-3 rounded-xl border border-stone-300 text-base bg-white outline-none transition focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15 w-full"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          required
          className="px-4 py-3 rounded-xl border border-stone-300 text-base bg-white outline-none transition focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15 w-full"
        />
      </label>

      {error && (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#e4ebfc] text-[#365dc4] font-semibold text-base transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(40,87,197,.14)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Verificando…' : (
          <>
            Entrar al panel
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
