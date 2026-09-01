import { EmailVerification } from '@/components/notifications/verification';
export const metadata={title:'Verifica tu correo | shwcs',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function VerifyEmail(){return <section className="mx-auto max-w-xl px-6 py-20"><h1 className="mb-8 text-4xl font-semibold tracking-tight">Confirma tu correo.</h1><EmailVerification confirm/></section>;}
