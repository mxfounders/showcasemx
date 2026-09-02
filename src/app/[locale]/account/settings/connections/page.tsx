import { requireFounder,solutionsSql } from '@/lib/solutions/server';
import { googleConfig } from '@/lib/auth/google';
import { GoogleConnection } from '@/components/settings/google-connection';
export default async function Connections(props:{searchParams: Promise<{google?:string}>}) {
  const searchParams = await props.searchParams;
  const account=await requireFounder(),sql=solutionsSql();const [identity]=await sql`SELECT email FROM auth_google_identities WHERE account_id=${account.id}`;return <section><h2 className="mb-6 text-2xl font-medium">Cuentas vinculadas</h2>{searchParams.google==='error'&&<p role="alert" className="mb-5 text-sm text-[#A94E35]">No se completó la vinculación. Vuelve a intentarlo con tu contraseña y una cuenta de Google no vinculada a otra cuenta.</p>}<GoogleConnection linked={!!identity} email={identity?String(identity.email):undefined} available={!!googleConfig()}/></section>;
}
