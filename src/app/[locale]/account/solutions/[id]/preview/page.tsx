import { notFound } from 'next/navigation';
import { isSolutionId } from '@/lib/solutions/model';
import { requireFounder, getSolution } from '@/lib/solutions/server';
import { SolutionPresentation } from '@/components/solutions/solution-presentation';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.solutionEditor.detail.previewMetaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function PreviewPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  if (!isSolutionId(params.id)) notFound();
  const account = await requireFounder(),
    solution = await getSolution(params.id, account.id);
  if (!solution) notFound();
  const dict = await getDictionary(params.locale);
  return (
    <SolutionPresentation
      data={solution.data}
      id={solution.id}
      hasSiteImage={Boolean(solution.has_site_image)}
      preview
      locale={params.locale}
      dict={dict.solution}
      uiDict={dict.solutionUi}
    />
  );
}
