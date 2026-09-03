import { requireFounder,solutionsSql } from '@/lib/solutions/server';
import { googleConfig } from '@/lib/auth/google';
import { GoogleConnection } from '@/components/settings/google-connection';

export const dynamic='force-dynamic';

export default async function Connections(props:{searchParams: Promise<{google?:string}>}) {
 const searchParams = await props.searchParams;
 const account=await requireFounder(),sql=solutionsSql();
 const [identity]=await sql`SELECT email FROM auth_google_identities WHERE account_id=${account.id}`;
 return <section className="space-y-6">
  {searchParams.google==='error'&&<p role="alert" className="rounded-2xl border border-[#E8C9BE] bg-[#FBF0EC] px-5 py-4 text-sm text-[#A94E35]">No se completó la vinculación. Vuelve a intentarlo con tu contraseña y una cuenta de Google que no esté vinculada a otra cuenta.</p>}
  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
   <h2 className="mb-2 text-lg font-medium text-stone-900">Google</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Vincular Google te deja entrar sin escribir tu contraseña. Nunca fusionamos cuentas por coincidencia de correo: la vinculación siempre la inicias tú desde aquí.</p>
   <GoogleConnection linked={!!identity} email={identity?String(identity.email):undefined} available={!!googleConfig()}/>
  </div>
 </section>;
}
