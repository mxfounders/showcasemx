import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getOpsSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Acceso' };

export default async function LoginPage() {
  const user = await getOpsSession();
  if (user) redirect('/panel');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Logo */}
        <div className="mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/shwcs-logo-blue.png" alt="shwcs" className="h-8 w-auto" />
        </div>
        
        <div className="w-full">
          <h2 className="text-2xl font-bold text-center text-stone-900 mb-2 tracking-tight">
            Iniciar sesión
          </h2>
          <p className="text-sm text-center text-stone-500 mb-8">
            Acceso exclusivo para revisores.
          </p>
          
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
