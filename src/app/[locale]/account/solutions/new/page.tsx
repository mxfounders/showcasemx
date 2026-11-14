import { requireFounder } from '@/lib/solutions/server';
import { NewSolutionForm } from '@/components/solutions/new-solution-form';
import { getDictionary } from '@/i18n/get-dictionary';

export default async function NewSolutionPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const text = (await getDictionary(locale)).solutionEditor.newPage;
  await requireFounder(true);
  return (
    <section className="account-page">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{text.title}</h1>
      <p className="mb-10 mt-4 max-w-xl text-base leading-relaxed text-stone-500">
        {text.description}
      </p>
      <NewSolutionForm dict={text} />
      <div className="mt-14 max-w-xl border-t border-stone-200 pt-8">
        <ol className="flex flex-wrap items-center gap-2">
          {text.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2 text-sm text-stone-700">
              {index > 0 && <span aria-hidden="true" className="h-px w-5 bg-stone-300" />}
              <span className="flex size-6 items-center justify-center rounded-full bg-[#E4EBFC] text-xs font-medium text-[#365DC4]">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-stone-500">{text.stepsNote}</p>
        <p className="mt-2 text-xs text-stone-400">{text.freeNote}</p>
      </div>
    </section>
  );
}
