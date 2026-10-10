import { requireFounder } from '@/lib/solutions/server';
import { NewSolutionButton } from '@/components/solutions/new-solution-button';
import { getDictionary } from '@/i18n/get-dictionary';
export default async function NewSolutionPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dict = (await getDictionary(locale)).solutionEditor,
    text = dict.newPage;
  await requireFounder(true);
  return (
    <section className="account-page">
      <h1 className="text-4xl font-semibold tracking-tight">{text.title}</h1>
      <p className="mb-8 mt-5 leading-relaxed text-stone-500">{text.description}</p>
      <ol className="mb-10 divide-y divide-stone-200 border-y border-stone-200">
        {text.steps.map(({ title, description }, index) => (
          <li key={title} className="flex gap-4 py-5">
            <span className="text-sm text-stone-400">0{index + 1}</span>
            <div>
              <h2 className="text-sm font-medium">{title}</h2>
              <p className="mt-1 text-sm text-stone-500">{description}</p>
            </div>
          </li>
        ))}
      </ol>
      <NewSolutionButton dict={dict.newSolution} />
    </section>
  );
}
