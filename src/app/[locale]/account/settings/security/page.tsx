import { EmailVerification } from '@/components/notifications/verification';
import { notificationPreferences } from '@/lib/notifications/server';
import { LogoutButton } from '@/components/logout-button';
import Link from 'next/link';
import { requireFounder } from '@/lib/solutions/server';
import { PasswordForm } from '@/components/settings/password-form';
export default async function SecuritySettings(){const account=await requireFounder();const prefs=await notificationPreferences(account.id);return ( <section id="seguridad" className="scroll-mt-28 space-y-6">
<h2 className="text-2xl font-medium tracking-tight mb-2">Seguridad y acceso</h2>
<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
  <h3 className="text-lg font-medium text-stone-900 mb-6">Detalles de acceso</h3>
  <div className="mb-6">
    <p className="text-sm font-medium text-stone-700">Correo principal</p>
    <p className="mt-1 break-all text-sm text-stone-500">{account.email}</p>
  </div>
  <EmailVerification verified={prefs.verified} available={prefs.emailAvailable}/>
</div>

<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
  <h3 className="text-lg font-medium text-stone-900 mb-2">Cambiar contraseña</h3>
  <p className="mb-6 text-sm leading-relaxed text-stone-500">Necesitas tu contraseña actual. Al cambiarla, cerraremos tus sesiones en todos los dispositivos por seguridad.</p>
  <div className="max-w-md"><PasswordForm mode="change"/></div>
  <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium text-[#365DC4] hover:underline">Olvidé mi contraseña →</Link>
</div>

<div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 shadow-sm">
  <h3 className="text-lg font-medium text-red-900 mb-2">Sesión actual</h3>
  <p className="mb-6 text-sm text-red-700/80">Cierra el acceso a tu cuenta en este navegador. Tendrás que iniciar sesión de nuevo.</p>
  <LogoutButton/>
</div>
</section>
);}
