import { requireBuyer, getBoards } from '@/lib/library/server';
import { BoardGallery, CreateBoard } from '@/components/library/board-gallery';
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
  const t = dictionary.library.boards;
  const publicCount = boards.filter(board => board.visibility === 'public').length;
  const summary = [
    (boards.length === 1 ? t.summarySingular : t.summaryPlural).replace(
      '{count}',
      String(boards.length),
    ),
    publicCount
      ? (publicCount === 1 ? t.publicSingular : t.publicPlural).replace(
          '{count}',
          String(publicCount),
        )
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <section className="account-page">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {dictionary.library.listsPage.title}
          </h1>
          {boards.length > 0 && <p className="mt-4 text-sm text-stone-500">{summary}</p>}
        </div>
        {/* With no lists yet, the empty state below carries the only «Crear lista». */}
        {boards.length > 0 && <CreateBoard dict={dictionary.library} locale={locale} />}
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
