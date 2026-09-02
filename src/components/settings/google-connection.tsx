"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { actionButtonStyle } from '@/lib/brand-colors';

export function GoogleConnection({ linked, email, available }: { linked: boolean; email?: string; available: boolean }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const busy = useRef(false);

  return (
    <div className="max-w-xl space-y-6">
      {/* Google Account Card */}
      <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.39 13.91a6 6 0 0 1 0-3.82V7.5H3.05a10 10 0 0 0 0 9l3.34-2.59Z" />
              <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.95 5.5l3.34 2.59C7.18 7.72 9.39 5.96 12 5.96Z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-stone-900">Google</h3>
            <p className="text-sm text-stone-500">
              {linked ? email : available ? 'No vinculado' : 'No disponible'}
            </p>
          </div>
        </div>

        {available && !showPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(true)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              linked 
                ? 'bg-stone-100 text-stone-700 hover:bg-stone-200' 
                : 'bg-stone-800 text-white hover:bg-stone-900'
            }`}
          >
            {linked ? 'Desvincular' : 'Vincular'}
          </button>
        )}
      </div>

      {/* Password Confirmation Form (Slides in when user clicks link/unlink) */}
      {showPassword && (
        <form
          noValidate
          className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy.current) return;
            busy.current = true;
            setPending(true);
            setError('');
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const response = await fetch('/api/account/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, action: linked ? 'unlink' : 'link' }),
                signal: AbortSignal.timeout(15000)
              });
              const result = await response.json();
              if (!response.ok) throw Error(result.error);
              window.location.assign(result.logout ? '/sign-in' : result.url);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No pudimos completar la operación.');
              busy.current = false;
              setPending(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-stone-900 mb-2">
              Confirma tu contraseña actual para continuar
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={4096}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              autoFocus
            />
          </div>
          
          {linked && (
            <p className="text-xs text-stone-500">
              Al desvincular se cerrarán tus sesiones actuales. Podrás volver a entrar con tu correo y contraseña.
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowPassword(false);
                setError('');
              }}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={pending}
              style={actionButtonStyle}
              className="action-button rounded-full px-5 py-2.5 text-sm font-medium shadow-sm disabled:opacity-50"
            >
              {pending ? 'Un momento…' : linked ? 'Confirmar desvinculación' : 'Continuar con Google'}
            </button>
          </div>

          {error && <p role="alert" className="text-sm text-[#A94E35]">{error}</p>}
        </form>
      )}

      <div className="pt-2">
        <Link href="/forgot-password" className="text-sm text-[#365DC4] hover:underline">
          Establecer o recuperar contraseña →
        </Link>
      </div>
    </div>
  );
}
