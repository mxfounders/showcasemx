import { ContactsInbox } from '@/components/contacts/inbox';
export const metadata={title:'Mis contactos | shwcs',robots:{index:false,follow:false}};
export default async function ContactsPage(props:{searchParams: Promise<{status?:string;page?:string}>}) {
  const searchParams = await props.searchParams;
  return <ContactsInbox incoming={false} searchParams={searchParams}/>;
}
