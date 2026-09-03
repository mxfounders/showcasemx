import { cookies } from 'next/headers';
import Link from 'next/link';
import { EmailVerification } from '@/components/notifications/verification';
import { notificationPreferences } from '@/lib/notifications/server';
import { LogoutButton } from '@/components/logout-button';
import { requireFounder } from '@/lib/solutions/server';
import { PasswordForm } from '@/components/settings/password-form';
import { TwoFactor } from '@/components/settings/two-factor';
import { SessionList,type ActiveSession } from '@/components/settings/session-list';
import { authSql } from '@/lib/auth/security';
import { hashToken } from '@/lib/auth/password';
import { deviceLabel,sessionCookie } from '@/lib/auth/session';
import { totpConfigured } from '@/lib/auth/totp';

export const dynamic='force-dynamic';

export default async function SecuritySettings(){
 const account=await requireFounder();
 const prefs=await notificationPreferences(account.id);
 const current=hashToken((await cookies()).get(sessionCookie)?.value??'');
 let twoStep=false,sessions:ActiveSession[]=[],storageFailed=false;
 try{
  const sql=authSql();
  const [[row],rows]=await Promise.all([
   sql`SELECT totp_confirmed_at FROM auth_accounts WHERE id=${account.id}`,
   sql`SELECT token_hash,user_agent,created_at::text,last_seen_at::text,expires_at::text FROM auth_sessions WHERE account_id=${account.id} AND expires_at>now() ORDER BY created_at DESC LIMIT 25`,
  ]);
  twoStep=Boolean(row?.totp_confirmed_at);
  // Only the hash travels to the client; it identifies a row without ever being
  // a usable session token.
  sessions=rows.map(item=>({tokenHash:String(item.token_hash),device:deviceLabel(item.user_agent as string|null),current:String(item.token_hash)===current,createdAt:String(item.created_at),lastSeenAt:String(item.last_seen_at),expiresAt:String(item.expires_at)}));
 }catch{storageFailed=true;}

 const card='rounded-2xl border border-stone-200 bg-white p-6 shadow-sm';
 return <section className="space-y-6">
  <div className={card}>
   <h2 className="mb-6 text-lg font-medium text-stone-900">Detalles de acceso</h2>
   <div className="mb-6">
    <p className="text-sm font-medium text-stone-700">Correo principal</p>
    <p className="mt-1 break-all text-sm text-stone-500">{account.email}</p>
   </div>
   <EmailVerification verified={prefs.verified} available={prefs.emailAvailable}/>
  </div>

  <div className={card}>
   <h2 className="mb-2 text-lg font-medium text-stone-900">Verificación en dos pasos</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Un código temporal de tu teléfono, además de tu contraseña.</p>
   {storageFailed?<p role="alert" className="text-sm text-[#A94E35]">No pudimos leer el estado de tu verificación. Recarga la página.</p>:<TwoFactor enabled={twoStep} available={totpConfigured()}/>}
  </div>

  <div className={card}>
   <h2 className="mb-2 text-lg font-medium text-stone-900">Cambiar contraseña</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Necesitas tu contraseña actual. Al cambiarla, cerraremos tus sesiones en todos los dispositivos por seguridad.</p>
   <div className="max-w-md"><PasswordForm mode="change"/></div>
   <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium text-[#365DC4] hover:underline">Olvidé mi contraseña →</Link>
  </div>

  <div className={card}>
   <h2 className="mb-2 text-lg font-medium text-stone-900">Sesiones abiertas</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Los dispositivos donde tu cuenta sigue abierta. Si ves uno que no reconoces, ciérralo y cambia tu contraseña.</p>
   {storageFailed?<p role="alert" className="text-sm text-[#A94E35]">No pudimos leer tus sesiones. Recarga la página.</p>:<SessionList sessions={sessions}/>}
  </div>

  <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 shadow-sm">
   <h2 className="mb-2 text-lg font-medium text-red-900">Sesión actual</h2>
   <p className="mb-6 text-sm text-red-700/80">Cierra el acceso a tu cuenta en este navegador. Tendrás que iniciar sesión de nuevo.</p>
   <LogoutButton/>
  </div>
 </section>;
}
