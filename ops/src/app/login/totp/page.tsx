import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getOpsSession } from '@/lib/auth';
import TotpForm from './TotpForm';

export const metadata: Metadata = { title: 'Verificación' };

export default async function TotpPage() {
  const user = await getOpsSession();
  if (user) redirect('/panel');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/shwcs-logo-blue.png" alt="shwcs" className="h-8 w-auto mb-10" />
        <div className="w-full">
          <h2 className="text-2xl font-bold text-center text-stone-900 mb-2 tracking-tight">
            Verificación en dos pasos
          </h2>
          <p className="text-sm text-center text-stone-500 mb-8">
            Ingresa el código de tu app autenticadora, o un código de respaldo.
          </p>
          <TotpForm />
        </div>
      </div>
    </main>
  );
}
