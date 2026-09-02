import { ContactsInbox } from '@/components/contacts/inbox';
export const metadata={title:'Oportunidades | shwcs',robots:{index:false,follow:false}};
export default async function OpportunitiesPage(props:{searchParams: Promise<{status?:string;page?:string}>}) {
  const searchParams = await props.searchParams;
  return <ContactsInbox incoming searchParams={searchParams}/>;
}
