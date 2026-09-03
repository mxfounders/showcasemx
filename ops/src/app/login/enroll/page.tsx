import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getOpsSession } from '@/lib/auth';
import EnrollForm from './EnrollForm';

export const metadata: Metadata = { title: 'Configurar autenticador' };

export default async function EnrollPage() {
  const user = await getOpsSession();
  if (user) redirect('/panel');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white p-6 py-12">
      <div className="w-full max-w-[440px] flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/shwcs-logo-blue.png" alt="shwcs" className="h-8 w-auto mb-10" />
        <div className="w-full">
          <h2 className="text-2xl font-bold text-center text-stone-900 mb-2 tracking-tight">
            Configura tu autenticador
          </h2>
          <p className="text-sm text-center text-stone-500 mb-8">
            El acceso a ops requiere una app autenticadora (Google Authenticator, 1Password…).
            Este paso solo aparece una vez.
          </p>
          <EnrollForm />
        </div>
      </div>
    </main>
  );
}
