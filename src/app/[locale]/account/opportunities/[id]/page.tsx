import { ContactDetail } from '@/components/contacts/detail';
export const metadata={title:'Oportunidad | shwcs',robots:{index:false,follow:false}};
export default async function OpportunityPage(props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  return <ContactDetail id={params.id} incoming/>;
}
