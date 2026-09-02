import { EmailVerification } from '@/components/notifications/verification';
import { notificationPreferences } from '@/lib/notifications/server';
import { LogoutButton } from '@/components/logout-button';
import Link from 'next/link';
import { requireFounder } from '@/lib/solutions/server';
import { PasswordForm } from '@/components/settings/password-form';
export default async function SecuritySettings(){const account=await requireFounder();const prefs=await notificationPreferences(account.id);return ( <section id="seguridad" className="scroll-mt-28 "><h2 className="text-2xl font-medium tracking-tight">Seguridad</h2><div className="mb-7 mt-5"><p className="text-xs text-stone-500">Correo de acceso</p><p className="mt-2 break-all text-sm">{account.email}</p></div><div className="mb-8"><EmailVerification verified={prefs.verified} available={prefs.emailAvailable}/></div><h3 className="text-lg font-medium">Cambiar contraseña</h3><p className="mb-6 mt-2 text-sm leading-relaxed text-stone-500">Necesitas tu contraseña actual. Al cambiarla, cerraremos tus sesiones en todos los dispositivos.</p><div className="max-w-lg"><PasswordForm mode="change"/></div><Link href="/forgot-password" className="mt-5 inline-block text-sm text-stone-500 underline underline-offset-4">Olvidé mi contraseña</Link><div className="mt-10 border-t border-stone-200 pt-8"><h3 className="text-lg font-medium">Sesión actual</h3><p className="mb-4 mt-2 text-sm text-stone-500">Cierra el acceso a tu cuenta en este navegador.</p><LogoutButton/></div></section>
);}
