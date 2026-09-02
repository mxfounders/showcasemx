import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getOpsSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Acceso' };

export default async function LoginPage() {
  const user = await getOpsSession();
  if (user) redirect('/panel');

  return (
    <main className="min-h-screen grid" style={{ gridTemplateColumns: 'minmax(20rem, 42%) 1fr' }}>
      {/* Brand panel */}
      <section className="flex flex-col justify-between min-h-screen bg-[#3562cc] p-[clamp(2rem,5vw,5rem)] text-white">
        {/* Logo */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/shwcs-logo-white.png" alt="shwcs" className="h-[clamp(2rem,3.5vw,2.75rem)] w-auto" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/60 mb-6">Operaciones</p>
          <h1
            className="font-semibold text-white leading-[0.94]"
            style={{ fontSize: 'clamp(3rem,7vw,7.5rem)', letterSpacing: '-0.065em', maxWidth: '10ch' }}
          >
            Base de operaciones
          </h1>
        </div>
        <p className="text-sm text-white/60">Acceso restringido · revisores autorizados</p>
      </section>

      {/* Login form panel */}
      <section className="flex min-h-screen items-center p-[clamp(2rem,8vw,8rem)]">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-2 mb-8">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3562cc] shadow-[0_0_0_5px_#e4ebfc]" />
            <span className="text-sm text-stone-500">Panel interno · shwcs</span>
          </div>
          <h2
            className="font-semibold mb-2 leading-none"
            style={{ fontSize: 'clamp(2rem,3.5vw,3.5rem)', letterSpacing: '-0.055em' }}
          >
            Acceso operativo
          </h2>
          <p className="text-stone-500 mb-8 text-base">Solo cuentas autorizadas como revisoras pueden entrar.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
