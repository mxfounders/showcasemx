import { SettingsNav } from '@/components/settings/settings-nav';
import { requireFounder } from '@/lib/solutions/server';
export const metadata={title:'Configuración | shwcs',robots:{index:false,follow:false}};
export default async function SettingsLayout({children}:{children:React.ReactNode}){
 await requireFounder();
 return <section className="account-page">
  <header className="mb-8">
   <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Configuración</h1>
   <p className="mt-4 max-w-xl leading-relaxed text-stone-500">Haz este espacio tuyo. Gestiona tu perfil, protege tu acceso y decide qué pasa con tus datos.</p>
  </header>
  <SettingsNav/>
  {children}
 </section>;
}
