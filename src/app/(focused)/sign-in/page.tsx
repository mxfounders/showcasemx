import { googleConfig } from '@/lib/auth/google';
import { authReturnTo } from '@/lib/auth/return-to';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, sessionCookie } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
export const metadata: Metadata = { title: 'Acceso | shwcs', robots: { index: false, follow: false } };
export default async function SignInPage(props:{searchParams: Promise<{next?:string;google?:string}>}) {
  const searchParams = await props.searchParams;
  const returnTo = authReturnTo(searchParams.next);
  let signedIn = false;
  try { signedIn = Boolean(await getSession((await cookies()).get(sessionCookie)?.value)); } catch { /* The form reports unavailable storage when submitted. */ }
  if (signedIn) redirect(returnTo);
  return <section className="mx-auto max-w-[568px] px-6 pb-20 pt-8 sm:pt-14">
    <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-stone-900 sm:text-5xl">Bienvenido a<br />shwcs.</h1>
    <p className="mb-9 mt-4 text-base leading-relaxed text-stone-500">Entra y sigue descubriendo soluciones para tu empresa.</p>
    {searchParams.google==='error'&&<p role="alert" className="mb-5 text-sm text-[#A94E35]">No se completó el acceso con Google. Si ya tienes una cuenta con ese correo, entra con contraseña y vincula Google desde Configuración.</p>}
    <AuthForm googleAvailable={!!googleConfig()} returnTo={returnTo} mode="login" />
  </section>;
}
