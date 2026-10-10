'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert, Field } from '@/components/ui/Field';
import { OtpInput } from '@/components/ui/OtpInput';

export default function TotpForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restart, setRestart] = useState(false);

  async function submit(value: string) {
    if (loading) return;
    const clean = value.replace(/\D/g, '');
    if (!(backup ? /^\d{8}$/ : /^\d{6}$/).test(clean)) {
      setError(backup ? 'Los códigos de respaldo tienen 8 dígitos.' : 'Escribe los 6 dígitos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.replace('/panel');
        return;
      }
      if (res.status === 409) {
        router.replace('/login/enroll');
        return;
      }
      if (typeof data.remaining === 'number') {
        setError(
          `${data.error} Te quedan ${data.remaining} ${data.remaining === 1 ? 'intento' : 'intentos'}.`,
        );
      } else {
        // Expired, burned or replayed challenge: this login attempt cannot continue.
        setError(data.error ?? 'No pudimos verificar el código.');
        if (res.status !== 400) setRestart(true);
      }
      setCode('');
    } catch {
      setError('No se pudo conectar. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        void submit(code);
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      {backup ? (
        <Field
          label="Código de respaldo"
          htmlFor="backup"
          hint="Cada código de respaldo funciona una sola vez."
        >
          <input
            id="backup"
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="12345678"
            className="control num h-11 text-center text-lg tracking-[0.35em]"
          />
        </Field>
      ) : (
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          autoFocus
          disabled={loading}
          invalid={Boolean(error)}
        />
      )}
      {error && <Alert>{error}</Alert>}
      {restart ? (
        <a
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-medium text-white transition hover:bg-accent-strong"
        >
          Volver a iniciar sesión
        </a>
      ) : (
        <Button type="submit" tone="solid" size="md" loading={loading} className="h-11 w-full">
          Entrar al panel
        </Button>
      )}
      <button
        type="button"
        onClick={() => {
          setBackup(value => !value);
          setCode('');
          setError('');
        }}
        className="text-center text-[13px] font-medium text-accent-fg hover:underline"
      >
        {backup ? 'Usar mi app autenticadora' : '¿Sin acceso a tu app? Usa un código de respaldo'}
      </button>
      <a href="/login" className="text-center text-[12.5px] text-muted hover:text-fg">
        Volver a empezar
      </a>
    </form>
  );
}
