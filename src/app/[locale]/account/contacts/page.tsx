import { ContactsInbox } from '@/components/contacts/inbox';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.contacts.meta.contacts} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function ContactsPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const [{ locale }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const dictionary = await getDictionary(locale);
  return <ContactsInbox incoming={false} searchParams={searchParams} dict={dictionary.contacts} />;
}
