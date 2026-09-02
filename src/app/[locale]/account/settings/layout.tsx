import { SettingsBackLink } from '@/components/settings/settings-back-link';
import { requireFounder } from '@/lib/solutions/server';
export const metadata={title:'Configuración | shwcs',robots:{index:false,follow:false}};
export default async function SettingsLayout({children}:{children:React.ReactNode}){await requireFounder();return <section className="account-page"><SettingsBackLink/><header className="mb-10 border-b border-stone-200 pb-8"><h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Configuración.</h1><p className="mt-4 text-stone-500">Haz este espacio tuyo. Gestiona tu perfil y protege tu acceso.</p></header>{children}</section>;}
