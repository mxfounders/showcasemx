import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBuyer } from '@/lib/library/server';
import { isSolutionId } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { contactTarget,findContact } from '@/lib/contacts/server';
import { ContactForm } from '@/components/contacts/forms';
export const metadata={title:'Solicitar contacto | shwcs',robots:{index:false,follow:false}};
export default async function NewContact(props:{searchParams: Promise<{solution?:string}>}) {
 const searchParams = await props.searchParams;
 const id=searchParams.solution;if(!id||!isSolutionId(id))notFound();
 const account=await requireBuyer('/account/contacts/new?solution='+id),target=await contactTarget(id);
 if(!target)notFound();
 const existing=await findContact(account.id,id);
 const sql=solutionsSql();const [profile]=await sql`SELECT name,organization FROM auth_accounts WHERE id=${account.id}`;
 return <section className="account-page"><Link href={'/soluciones/'+id} className="text-sm text-[#365DC4]">← Volver a la ficha</Link><h1 className="mt-7 break-words text-4xl font-semibold tracking-tight sm:text-5xl">Conecta con {target.name}.</h1><p className="mb-10 mt-4 max-w-xl leading-relaxed text-stone-500">Cuéntale al proyecto qué necesitas. Antes de enviar podrás revisar los datos que vas a compartir.</p>
 {target.owner_id===account.id?<p className="text-stone-500">Esta es tu solución. Puedes gestionar las solicitudes de otras empresas en <Link href="/account/opportunities" className="text-[#365DC4]">Oportunidades</Link>.</p>:existing?<div><h2 className="text-xl font-medium">Ya tienes una solicitud con este proyecto.</h2><p className="mt-3 text-stone-500">Conservamos un solo seguimiento por proyecto para evitar solicitudes duplicadas.</p><Link href={'/account/contacts/'+existing} className="mt-5 inline-block text-[#365DC4]">Ver solicitud →</Link></div>:<ContactForm solutionId={id} recipientId={target.owner_id} projectName={target.name} email={account.email} defaults={{name:String(profile?.name??''),company:String(profile?.organization??'')}}/>}
 </section>;
}
