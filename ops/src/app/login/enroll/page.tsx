import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { peekOpsSession } from '@/lib/auth';
import { AuthShell } from '../AuthShell';
import EnrollForm from './EnrollForm';

export const metadata: Metadata = { title: 'Configurar autenticador' };

export default async function EnrollPage() {
  if (await peekOpsSession()) redirect('/panel');
  return (
    <AuthShell
      step={1}
      wide
      title="Configura tu autenticador"
      description="Ops exige una app autenticadora (1Password, Google Authenticator, Authy…). Solo lo harás una vez."
    >
      <EnrollForm />
    </AuthShell>
  );
}
