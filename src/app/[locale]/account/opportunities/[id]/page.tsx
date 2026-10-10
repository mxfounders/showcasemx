import { ContactDetail } from '@/components/contacts/detail';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.contacts.meta.opportunityDetail} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function OpportunityPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const params = await props.params;
  const dictionary = await getDictionary(params.locale);
  return <ContactDetail id={params.id} incoming dict={dictionary.contacts} />;
}
