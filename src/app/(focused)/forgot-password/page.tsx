import Link from 'next/link';
import { PasswordForm } from '@/components/settings/password-form';
import { recoveryConfig } from '@/lib/auth/recovery';
export const metadata={title:'Recuperar contraseña | shwcs',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function ForgotPasswordPage(){return <section className="mx-auto max-w-lg px-6 py-16 sm:py-24"><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Recupera tu acceso.</h1><p className="mb-9 mt-4 leading-relaxed text-stone-500">Te enviaremos un enlace para elegir una nueva contraseña.</p><PasswordForm mode="forgot" enabled={Boolean(recoveryConfig())}/><Link href="/sign-in" className="mt-8 inline-block text-sm text-stone-500">Volver al acceso</Link></section>;}
