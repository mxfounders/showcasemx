import { ContactDetail } from '@/components/contacts/detail';
export const metadata={title:'Seguimiento de contacto | shwcs',robots:{index:false,follow:false}};
export default async function ContactPage(props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  return <ContactDetail id={params.id}/>;
}
