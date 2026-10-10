'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ArrowRight, ArrowLeft, Check, ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { MediaEditor } from './media-editor';
import { CompletenessGuide } from './completeness-guide';
import { FoundersEditor, PublicLinksEditor, solutionInput as input } from './profile-editor';
import { actionButtonStyle, brandColors, solutionCategoryTones } from '@/lib/brand-colors';
import {
  solutionCategories,
  solutionErrors,
  solutionEvaluationFields,
  solutionEvaluationRows,
  getSolutionCategories,
  type FounderSolution,
  type SolutionData,
  type SolutionErrorCode,
} from '@/lib/solutions/model';
import { solutionQuestions, questionIndex, questionErrors } from '@/lib/solutions/questions';
import {
  localizedIndustries,
  localizedCompanySizes,
  localizedCapabilitiesByCategory,
  localizedCapabilityLabel,
  localizedIntegrationOptions,
  localizedPricingModelOptions,
  localizedPriceBandOptions,
  localizedSetupTimeOptions,
  localizedComplianceOptions,
  localizedOfferingOptions,
  localizedCategoryDisplayLabel,
  localizedLinkKind,
} from '@/lib/taxonomy';
import { suggestCapabilities } from '@/lib/search/facets';
import { Sparkles } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionary';
const labelsOf = (options: readonly { value: string; label: string }[]) =>
  Object.fromEntries(options.map(item => [item.value, item.label]));
function marketSummary(
  values: string[] | undefined,
  labels: Record<string, string>,
  anyLabel: string,
) {
  return values === undefined
    ? ''
    : values.length === 0
      ? anyLabel
      : values.map(value => labels[value] ?? value).join(' · ');
}
function listSummary(values: string[] | undefined, labels: Record<string, string>) {
  return values?.length ? values.map(value => labels[value] ?? value).join(' · ') : '';
}
// Chip-group primitive shared by capabilities/integrations/compliance/pricing
// model/price band/setup time: a single-select variant (radio semantics) or
// a multi-select one (checkbox semantics), same tinted-card look as the
// market question's industry/size chips.
function ChipGroup({
  options,
  selected,
  onToggle,
  tone,
  multi = true,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  tone?: keyof typeof brandColors;
  multi?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(option => {
        const isSelected = selected.includes(option.value),
          color = brandColors[tone ?? 'blue'];
        return (
          <label
            key={option.value}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 text-sm transition-colors"
            style={
              isSelected
                ? { backgroundColor: color.soft, color: color.solid, borderColor: color.solid }
                : { borderColor: '#d6d3d1' }
            }
          >
            {option.label}
            <input
              type={multi ? 'checkbox' : 'radio'}
              checked={isSelected}
              className="size-4 accent-[#365DC4]"
              onChange={() => onToggle(option.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
export function SolutionEditor({
  solution,
  locale,
  dict,
}: {
  solution: FounderSolution;
  locale: string;
  dict: Dictionary['solutionEditor'];
}) {
  const text = dict.editor,
    review = text.review;
  const industryOptions = localizedIndustries(locale),
    companySizeOptions = localizedCompanySizes(locale),
    offeringOptions = localizedOfferingOptions(locale),
    integrationOptions = localizedIntegrationOptions(locale),
    pricingModelOptions = localizedPricingModelOptions(locale),
    priceBandOptions = localizedPriceBandOptions(locale),
    setupTimeOptions = localizedSetupTimeOptions(locale),
    complianceOptions = localizedComplianceOptions(locale);
  const industryLabels = labelsOf(industryOptions),
    companySizeLabels = labelsOf(companySizeOptions),
    offeringLabels = labelsOf(offeringOptions);
  const capabilityLabel = (id: string) => localizedCapabilityLabel(id, locale),
    categoryLabel = (category: string) => localizedCategoryDisplayLabel(category, locale),
    linkLine = (link: { label: string; url: string }) =>
      `${localizedLinkKind(link.label, locale)}: ${link.url}`;
  const router = useRouter(),
    [data, setData] = useState(solution.data),
    [step, setStep] = useState(questionIndex(solution.editor_question, solution.step)),
    [version, setVersion] = useState(solution.version),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [mediaBusy, setMediaBusy] = useState(false),
    [editing, setEditing] = useState(solution.status !== 'published');
  const busy = useRef(false),
    title = useRef<HTMLHeadingElement>(null),
    panel = useRef<HTMLDivElement>(null),
    initialized = useRef(false),
    form = useRef<HTMLFormElement>(null);
  const question = solutionQuestions[step],
    questionText = dict.questions[question.id],
    blocked = pending || mediaBusy;
  const guideQuestion = (phase: number, key?: string) =>
    questionIndex(
      (
        {
          basics: 'identity',
          fit: 'problem',
          market: 'market',
          capabilities: 'capabilities',
          scope: 'scope',
          visual: 'screenshots',
          demo: 'demo',
          commercial: 'pricing',
          readiness: 'delivery',
          support: 'delivery',
          people: 'founders',
          evidence: 'evidence',
        } as Record<string, string>
      )[key ?? ''],
      phase,
    );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!editing) return;
    if (initialized.current) {
      title.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    initialized.current = true;
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        panel.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'opacity,transform' },
      );
    });
    return () => motion.revert();
  }, [step, editing]);
  function update(patch: Partial<SolutionData>) {
    setData(current => ({ ...current, ...patch }));
    setDirty(true);
    setError('');
    setMessage('');
  }
  async function save(action: 'save' | 'submit', nextStep = step, exit = false) {
    if (busy.current || mediaBusy) return;
    setError('');
    setMessage('');
    if (action === 'submit') {
      const errors = solutionErrors(data);
      const firstError = Object.values(errors).find(
        (code): code is SolutionErrorCode => code !== undefined,
      );
      if (firstError) {
        const first = solutionQuestions.findIndex(item =>
          (item.fields as readonly string[]).some(key => key in errors),
        );
        if (first >= 0) setStep(first);
        setError(dict.validation[firstError]);
        return;
      }
    }
    busy.current = true;
    setPending(true);
    try {
      const next = solutionQuestions[nextStep],
        response = await fetch(`/api/solutions/${solution.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, data, step: next.phase, question: next.id, version }),
          signal: AbortSignal.timeout(15000),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setVersion(result.version);
      setDirty(false);
      setStep(nextStep);
      setMessage(action === 'submit' ? text.submitted : text.saved);
      if (exit) router.push('/account/solutions');
      else if (action === 'submit') router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error &&
          !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name)
          ? failure.message
          : text.saveUnconfirmed,
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function goNext() {
    if (blocked) return;
    if (question.id === 'review') {
      void save('submit');
      return;
    }
    const [firstError] = questionErrors(data, step);
    if (firstError) {
      setError(dict.validation[firstError]);
      return;
    }
    void save('save', step + 1);
  }
  if (solution.status === 'pending')
    return (
      <p className="border-y border-stone-200 py-6 text-sm leading-relaxed text-stone-600">
        {text.pendingNotice}
      </p>
    );
  if (!editing)
    return (
      <>
        <CompletenessGuide
          data={data}
          id={solution.id}
          onChoose={(phase, key) => {
            setStep(guideQuestion(phase, key));
            setEditing(true);
          }}
          locale={locale}
          dict={dict.completeness}
        />
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={actionButtonStyle}
          className="action-button rounded-full px-6 py-3 text-sm"
        >
          {text.prepareUpdate}
        </button>
      </>
    );
  function field(
    key:
      | 'name'
      | 'problem'
      | 'audience'
      | 'notFor'
      | 'demoUrl'
      | 'website'
      | 'contactEmail'
      | 'evidenceUrl',
    label: string,
    limit: number,
    rows = 1,
    placeholder = '',
  ) {
    const props = {
      value: data[key] ?? '',
      maxLength: limit,
      className: input,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        update({ [key]: e.target.value }),
    };
    return (
      <label className="block text-sm">
        {label}
        {rows > 1 ? (
          <textarea {...props} rows={rows} />
        ) : (
          <input
            {...props}
            type={
              key === 'contactEmail'
                ? 'email'
                : ['website', 'demoUrl', 'evidenceUrl'].includes(key)
                  ? 'url'
                  : 'text'
            }
          />
        )}
      </label>
    );
  }
  function evaluation(key: (typeof solutionEvaluationFields)[number]['key']) {
    const item = solutionEvaluationFields.find(value => value.key === key)!,
      copy = dict.evaluationFields[key];
    return (
      <label key={key} className="block text-sm">
        {copy.prompt}
        <textarea
          value={data[key] ?? ''}
          maxLength={item.limit}
          rows={3}
          className={input}
          placeholder={copy.placeholder}
          onChange={e => update({ [key]: e.target.value })}
        />
      </label>
    );
  }
  return (
    <form
      ref={form}
      noValidate
      aria-label={text.formAria}
      aria-busy={blocked}
      onSubmit={event => {
        event.preventDefault();
        goNext();
      }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && question.id !== 'review') {
          event.preventDefault();
          goNext();
        } else if (
          event.key === 'Enter' &&
          event.target instanceof HTMLInputElement &&
          event.target.type !== 'file'
        ) {
          event.preventDefault();
          if (question.id !== 'review') goNext();
        }
      }}
    >
      <div className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center gap-4">
          <span className="text-xs text-stone-500" aria-live="polite">
            {text.questionCounter
              .replace('{current}', String(step + 1))
              .replace('{total}', String(solutionQuestions.length))}
          </span>
          <div
            role="progressbar"
            aria-label={text.progressAria}
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={solutionQuestions.length}
            className="h-1 w-24 overflow-hidden rounded-full bg-stone-200"
          >
            <div
              className="h-full bg-[#365DC4] transition-[width] motion-reduce:transition-none"
              style={{ width: `${((step + 1) / solutionQuestions.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-stone-400" role="status">
            {pending
              ? text.statusSaving
              : mediaBusy
                ? text.statusProcessingScreenshot
                : dirty
                  ? text.statusUnsaved
                  : text.statusSaved}
          </span>
          <button
            type="button"
            disabled={blocked}
            onClick={() => void save('save', step, true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#365DC4]/50 focus:ring-offset-2 disabled:opacity-50"
          >
            {text.saveAndExit}{' '}
            <ArrowUpRight className="size-3.5 text-stone-400" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div ref={panel} className="min-w-0 scroll-mt-28">
          <div className="mb-8">
            <h2
              ref={title}
              tabIndex={-1}
              className="text-3xl font-medium leading-tight tracking-[-0.03em] outline-none sm:text-4xl"
            >
              {questionText.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-500">{questionText.hint}</p>
            {question.optional && <p className="mt-3 text-xs text-stone-400">{text.optional}</p>}
          </div>
          <fieldset disabled={blocked} className="min-h-[180px] space-y-6">
            {question.id === 'identity' &&
              field('name', text.nameLabel, 100, 1, text.namePlaceholder)}
            {question.id === 'categories' && (
              <>
                <fieldset>
                  <legend className="mb-3 text-sm">{text.kindLegend}</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {offeringOptions.map(({ value: kind, label }, i) => (
                      <label key={kind} className="cursor-pointer">
                        <input
                          type="radio"
                          name="solution-kind"
                          value={kind}
                          checked={data.kind === kind}
                          onChange={() => update({ kind })}
                          className="peer sr-only"
                        />
                        <span className="flex items-center gap-3 rounded-xl border border-stone-300 p-4 text-sm transition-colors peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-checked:text-[#365DC4] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#365DC4]">
                          <span className="text-xs opacity-60">{String.fromCharCode(65 + i)}</span>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-3 text-sm">{text.categoriesLegend}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {solutionCategories.map(category => {
                      const selected = getSolutionCategories(data).includes(category),
                        tone = brandColors[solutionCategoryTones[category]];
                      return (
                        <label
                          key={category}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 text-sm transition-colors"
                          style={
                            selected
                              ? {
                                  backgroundColor: tone.soft,
                                  color: tone.solid,
                                  borderColor: tone.solid,
                                }
                              : { borderColor: '#d6d3d1' }
                          }
                        >
                          {categoryLabel(category)}
                          <input
                            type="checkbox"
                            checked={selected}
                            className="size-4 accent-[#365DC4]"
                            onChange={() => {
                              const categories = selected
                                ? getSolutionCategories(data).filter(value => value !== category)
                                : [...getSolutionCategories(data), category];
                              update({ categories, category: categories[0] ?? '' });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            )}
            {question.id === 'problem' &&
              field('problem', text.problemLabel, 1500, 5, text.problemPlaceholder)}
            {question.id === 'capabilities' &&
              (() => {
                const declaredCategories = getSolutionCategories(data);
                if (!declaredCategories.length)
                  return (
                    <p className="rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
                      {text.capabilitiesEmpty}
                    </p>
                  );
                const groups = localizedCapabilitiesByCategory(declaredCategories, locale);
                const selected = data.capabilities ?? [];
                // Reads problem/audience/scope right now and proposes capabilities the
                // founder hasn't marked yet — never marks anything on its own. One click
                // adds the chip; nothing is saved until the founder confirms it here.
                const suggestions = suggestCapabilities({
                  name: data.name,
                  problem: data.problem,
                  audience: data.audience,
                  scope: data.scope,
                  categories: declaredCategories,
                  capabilities: selected,
                });
                const toggle = (id: string) => {
                  const capabilities = selected.includes(id)
                    ? selected.filter(value => value !== id)
                    : [...selected, id];
                  update({ capabilities });
                };
                return (
                  <>
                    {!!suggestions.length && (
                      <div className="rounded-xl border border-dashed border-[#365DC4]/40 bg-[#E4EBFC]/40 p-4">
                        <p className="flex items-center gap-2 text-xs font-medium text-[#365DC4]">
                          <Sparkles className="size-3.5" aria-hidden="true" />
                          {text.suggestionsTitle}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {suggestions.map(id => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggle(id)}
                              className="rounded-full border border-[#365DC4]/40 bg-white px-3 py-1.5 text-xs text-[#365DC4] transition-colors hover:bg-[#E4EBFC]"
                            >
                              + {capabilityLabel(id)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {groups.map(group => (
                      <fieldset key={group.category}>
                        <legend className="mb-3 text-sm">{categoryLabel(group.category)}</legend>
                        <ChipGroup
                          options={group.items.map(item => ({ value: item.id, label: item.label }))}
                          selected={selected}
                          onToggle={toggle}
                          tone={solutionCategoryTones[group.category]}
                        />
                      </fieldset>
                    ))}
                  </>
                );
              })()}
            {question.id === 'audience' &&
              field('audience', text.audienceLabel, 800, 4, text.audiencePlaceholder)}
            {question.id === 'market' && (
              <>
                <fieldset>
                  <legend className="mb-3 text-sm">{text.industriesLegend}</legend>
                  <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-stone-500">
                    <input
                      type="checkbox"
                      checked={data.industries?.length === 0}
                      onChange={e => update({ industries: e.target.checked ? [] : undefined })}
                      className="size-4 accent-[#365DC4]"
                    />
                    {text.anyIndustry}
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {industryOptions.map(industry => {
                      const selected = !!data.industries?.includes(industry.value),
                        tone = brandColors[industry.tone];
                      return (
                        <label
                          key={industry.value}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 text-sm transition-colors"
                          style={
                            selected
                              ? {
                                  backgroundColor: tone.soft,
                                  color: tone.solid,
                                  borderColor: tone.solid,
                                }
                              : { borderColor: '#d6d3d1' }
                          }
                        >
                          {industry.label}
                          <input
                            type="checkbox"
                            checked={selected}
                            className="size-4 accent-[#365DC4]"
                            onChange={() => {
                              const current = data.industries ?? [],
                                industries = selected
                                  ? current.filter(value => value !== industry.value)
                                  : [...current, industry.value];
                              update({ industries });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-3 text-sm">{text.companySizeLegend}</legend>
                  <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-stone-500">
                    <input
                      type="checkbox"
                      checked={data.companySizes?.length === 0}
                      onChange={e => update({ companySizes: e.target.checked ? [] : undefined })}
                      className="size-4 accent-[#365DC4]"
                    />
                    {text.anyCompanySize}
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {companySizeOptions.map(size => {
                      const selected = !!data.companySizes?.includes(size.value);
                      return (
                        <label
                          key={size.value}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 text-sm transition-colors"
                          style={
                            selected
                              ? {
                                  backgroundColor: brandColors.blue.soft,
                                  color: brandColors.blue.solid,
                                  borderColor: brandColors.blue.solid,
                                }
                              : { borderColor: '#d6d3d1' }
                          }
                        >
                          <span>
                            {size.label}
                            <span className="block text-xs opacity-60">{size.range}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={selected}
                            className="size-4 accent-[#365DC4]"
                            onChange={() => {
                              const current = data.companySizes ?? [],
                                companySizes = selected
                                  ? current.filter(value => value !== size.value)
                                  : [...current, size.value];
                              update({ companySizes });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            )}
            {question.id === 'scope' && (
              <>
                {evaluation('scope')}
                {field('notFor', text.notForLabel, 500, 3, text.notForPlaceholder)}
              </>
            )}
            {question.id === 'founders' && (
              <FoundersEditor
                value={data.founders ?? []}
                onChange={founders => update({ founders })}
                locale={locale}
                dict={dict.profile}
              />
            )}
            {question.id === 'links' && (
              <PublicLinksEditor
                label={text.projectLinksLabel}
                links={data.projectLinks ?? []}
                onChange={projectLinks => update({ projectLinks })}
                locale={locale}
                dict={dict.profile}
              />
            )}
            {question.id === 'screenshots' && (
              <MediaEditor
                solutionId={solution.id}
                value={data.screenshots ?? []}
                onBusy={setMediaBusy}
                onChange={screenshots => update({ screenshots })}
                dict={dict.media}
              />
            )}
            {question.id === 'demo' && field('demoUrl', text.demoLabel, 500, 1, 'https://')}
            {question.id === 'pricing' && (
              <>
                <fieldset>
                  <legend className="mb-3 text-sm">{text.pricingModelLegend}</legend>
                  <ChipGroup
                    options={pricingModelOptions}
                    selected={data.pricingModel ?? []}
                    onToggle={value => {
                      const current = data.pricingModel ?? [],
                        pricingModel = current.includes(value)
                          ? current.filter(item => item !== value)
                          : [...current, value];
                      update({ pricingModel });
                    }}
                    tone="blue"
                  />
                </fieldset>
                <fieldset>
                  <legend className="mb-3 text-sm">{text.priceBandLegend}</legend>
                  <ChipGroup
                    options={priceBandOptions}
                    selected={data.priceBand ? [data.priceBand] : []}
                    onToggle={value =>
                      update({ priceBand: data.priceBand === value ? undefined : value })
                    }
                    tone="sage"
                    multi={false}
                  />
                </fieldset>
                {evaluation('pricing')}
              </>
            )}
            {question.id === 'delivery' && (
              <>
                <fieldset>
                  <legend className="mb-3 text-sm">{text.setupTimeLegend}</legend>
                  <ChipGroup
                    options={setupTimeOptions}
                    selected={data.setupTime ? [data.setupTime] : []}
                    onToggle={value =>
                      update({ setupTime: data.setupTime === value ? undefined : value })
                    }
                    tone="amber"
                    multi={false}
                  />
                </fieldset>
                {evaluation('implementation')}
                {evaluation('support')}
              </>
            )}
            {question.id === 'integrations' && (
              <>
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-stone-500">
                  <input
                    type="checkbox"
                    checked={data.integrationKeys?.length === 0}
                    onChange={e => update({ integrationKeys: e.target.checked ? [] : undefined })}
                    className="size-4 accent-[#365DC4]"
                  />
                  {text.noIntegrations}
                </label>
                <ChipGroup
                  options={integrationOptions}
                  selected={data.integrationKeys ?? []}
                  onToggle={value => {
                    const current = data.integrationKeys ?? [],
                      integrationKeys = current.includes(value)
                        ? current.filter(item => item !== value)
                        : [...current, value];
                    update({ integrationKeys });
                  }}
                  tone="lavender"
                />
                {evaluation('integrations')}
              </>
            )}
            {question.id === 'compliance' && (
              <ChipGroup
                options={complianceOptions}
                selected={data.compliance ?? []}
                onToggle={value => {
                  const current = data.compliance ?? [],
                    compliance = current.includes(value)
                      ? current.filter(item => item !== value)
                      : [...current, value];
                  update({ compliance });
                }}
                tone="terracotta"
              />
            )}
            {question.id === 'evidence' && (
              <>
                {evaluation('evidence')}
                {field('evidenceUrl', text.evidenceUrlLabel, 500, 1, 'https://')}
              </>
            )}
            {question.id === 'contact' && (
              <>
                {field('website', text.websiteLabel, 500, 1, 'https://')}
                {field('contactEmail', text.contactEmailLabel, 254)}
                <p className="text-xs text-stone-500">{text.contactEmailNote}</p>
              </>
            )}
            {question.id === 'review' && (
              <>
                <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  {[
                    [review.project, data.name],
                    [
                      review.kindAndCategories,
                      `${offeringLabels[data.kind] ?? data.kind} · ${getSolutionCategories(data)
                        .map(categoryLabel)
                        .join(' · ')}`,
                    ],
                    [review.problem, data.problem],
                    [
                      review.capabilities,
                      data.capabilities?.map(capabilityLabel).join(' · ') ?? '',
                    ],
                    [review.audience, data.audience],
                    [review.industries, marketSummary(data.industries, industryLabels, text.any)],
                    [
                      review.companySizes,
                      marketSummary(data.companySizes, companySizeLabels, text.any),
                    ],
                    [review.notFor, data.notFor],
                    [review.demo, data.demoUrl],
                    [review.screenshots, data.screenshots?.map(image => image.caption).join(' · ')],
                    [
                      review.pricingModel,
                      listSummary(data.pricingModel, labelsOf(pricingModelOptions)),
                    ],
                    [
                      review.priceBand,
                      data.priceBand
                        ? priceBandOptions.find(o => o.value === data.priceBand)?.label
                        : '',
                    ],
                    ...solutionEvaluationRows(data, {
                      fields: dict.evaluationFields,
                      missing: dict.toComplete,
                    }),
                    [
                      review.setupTime,
                      data.setupTime
                        ? setupTimeOptions.find(o => o.value === data.setupTime)?.label
                        : '',
                    ],
                    [
                      review.integrations,
                      data.integrationKeys?.length === 0
                        ? review.noIntegrations
                        : listSummary(data.integrationKeys, labelsOf(integrationOptions)),
                    ],
                    [review.compliance, listSummary(data.compliance, labelsOf(complianceOptions))],
                    [review.website, data.website],
                    [review.contactEmail, data.contactEmail],
                    [review.evidenceUrl, data.evidenceUrl],
                    [
                      review.founders,
                      data.founders
                        ?.map(person =>
                          [person.name, person.role, person.bio, ...person.links.map(linkLine)]
                            .filter(Boolean)
                            .join('\n'),
                        )
                        .join('\n\n'),
                    ],
                    [review.projectLinks, data.projectLinks?.map(linkLine).join('\n')],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-stone-400">{label}</dt>
                      <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {value || dict.toComplete}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="border-t border-stone-200 pt-6 text-sm text-stone-500">
                  {text.reviewNote}
                </p>
              </>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="mt-6 text-sm text-[#A94E35]">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="mt-5 inline-flex items-center gap-2 text-xs text-stone-500">
              <Check className="size-3" />
              {message}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={blocked}
              style={actionButtonStyle}
              className="action-button inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-40"
            >
              {question.id === 'review' ? text.submit : text.continue}
              <ArrowRight className="size-4" />
            </button>
            {step > 0 && (
              <button
                type="button"
                disabled={blocked}
                onClick={() => void save('save', step - 1)}
                className="inline-flex items-center gap-2 rounded-full px-3 py-3 text-sm text-stone-500 disabled:opacity-40"
              >
                <ArrowLeft className="size-4" />
                {text.previous}
              </button>
            )}
            {question.id !== 'review' && (
              <span className="text-xs text-stone-400">{text.keyboardHint}</span>
            )}
          </div>
        </div>
        <aside className="min-w-0 border-t border-stone-200 pt-6 xl:sticky xl:top-10 xl:border-t-0 xl:pt-0">
          <details>
            <summary className="cursor-pointer text-sm text-stone-500">
              {text.jumpToQuestion}
            </summary>
            <nav aria-label={text.questionsNavAria} className="mt-4 space-y-1">
              {solutionQuestions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={blocked}
                  aria-current={index === step ? 'step' : undefined}
                  onClick={() => void save('save', index)}
                  className={`flex w-full gap-3 rounded-lg px-2 py-2 text-left text-xs ${index === step ? 'bg-[#E4EBFC] text-[#365DC4]' : 'text-stone-500 hover:bg-stone-200/30'}`}
                >
                  <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  {dict.questions[item.id].title}
                </button>
              ))}
            </nav>
          </details>
          <p className="mt-6 text-xs leading-relaxed text-stone-400">{text.autosaveNote}</p>
          <CompletenessGuide
            data={data}
            id={solution.id}
            onChoose={
              blocked ? undefined : (phase, key) => void save('save', guideQuestion(phase, key))
            }
            locale={locale}
            dict={dict.completeness}
          />
        </aside>
      </div>
    </form>
  );
}
