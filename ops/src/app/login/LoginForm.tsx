'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, Field } from '@/components/ui/Field';

export default function LoginForm({
  notice,
}: {
  notice?: { tone: 'amber' | 'blue'; text: string };
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setPassword('');
        router.replace(data.step === 'enroll' ? '/login/enroll' : '/login/totp');
        return;
      }
      setError(data.error ?? 'No pudimos iniciar sesión.');
    } catch {
      setError('No se pudo conectar. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {notice && !error && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Field label="Correo electrónico" htmlFor="email">
        <input
          id="email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="username"
          autoFocus
          spellCheck={false}
          placeholder="tu@shwcs.site"
          maxLength={254}
          className="control h-11"
        />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            maxLength={4096}
            className="control h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShow(value => !value)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={show}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-subtle transition hover:text-fg"
          >
            {show ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </button>
        </div>
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button
        type="submit"
        tone="solid"
        size="md"
        loading={loading}
        iconRight={loading ? undefined : ArrowRight}
        className="mt-1 h-11 w-full"
      >
        {loading ? 'Verificando…' : 'Continuar'}
      </Button>
    </form>
  );
}
