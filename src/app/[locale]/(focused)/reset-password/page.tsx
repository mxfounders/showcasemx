import { PasswordForm } from '@/components/settings/password-form';
export const metadata={title:'Nueva contraseña | shwcs',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function ResetPasswordPage(){return <section className="mx-auto max-w-lg px-6 py-16 sm:py-24"><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Una nueva contraseña.</h1><p className="mb-9 mt-4 leading-relaxed text-stone-500">Elige una contraseña que solo uses en shwcs.</p><PasswordForm mode="reset"/></section>;}
