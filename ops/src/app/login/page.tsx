import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { peekOpsSession } from '@/lib/auth';
import { AuthShell } from './AuthShell';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Acceso' };

const REASONS: Record<string, { tone: 'amber' | 'blue'; text: string }> = {
  expired: { tone: 'amber', text: 'Tu sesión terminó. Vuelve a entrar para continuar.' },
  idle: { tone: 'amber', text: 'Cerramos tu sesión tras 30 minutos sin actividad.' },
  revoked: {
    tone: 'amber',
    text: 'Cerramos tu sesión por seguridad tras varios códigos incorrectos.',
  },
  logout: { tone: 'blue', text: 'Cerraste sesión correctamente.' },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await peekOpsSession()) redirect('/panel');
  const params = await searchParams;
  const reason = typeof params.reason === 'string' ? REASONS[params.reason] : undefined;
  return (
    <AuthShell
      step={0}
      title="Acceso a operaciones"
      description="Exclusivo para el equipo de shwcs. Usa tu correo y contraseña de shwcs."
    >
      <LoginForm notice={reason} />
    </AuthShell>
  );
}
