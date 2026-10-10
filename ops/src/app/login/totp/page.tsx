import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { peekOpsSession } from '@/lib/auth';
import { AuthShell } from '../AuthShell';
import TotpForm from './TotpForm';

export const metadata: Metadata = { title: 'Verificación' };

export default async function TotpPage() {
  if (await peekOpsSession()) redirect('/panel');
  return (
    <AuthShell
      step={1}
      title="Verificación en dos pasos"
      description="Escribe el código de 6 dígitos de tu app autenticadora."
    >
      <TotpForm />
    </AuthShell>
  );
}
