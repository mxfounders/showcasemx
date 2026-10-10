import { requireBuyer, getBoards } from '@/lib/library/server';
import { BoardGallery } from '@/components/library/board-gallery';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.library.listsPage.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function ListsPage(props: { params: Promise<{ locale: string }> }) {
  const account = await requireBuyer('/account/lists');
  const boards = await getBoards(account.id);
  const { locale } = await props.params;
  const dictionary = await getDictionary(locale);
  return (
    <section className="account-page">
      <header className="mb-9">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {dictionary.library.listsPage.title}
        </h1>
      </header>
      <BoardGallery
        boards={boards}
        dict={dictionary.community}
        libraryDict={dictionary.library}
        locale={locale}
      />
    </section>
  );
}
