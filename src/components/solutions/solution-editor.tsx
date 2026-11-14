'use client';
import { useEffect, useRef, useState } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClientsIcon,
  ClipboardCheckIcon,
  ImagesIcon,
  LinkIcon,
  PlayIcon,
  PlusIcon,
  PriceTagIcon,
  RefreshIcon,
  RocketIcon,
  ShieldIcon,
  TargetIcon,
  WorkflowIcon,
  type GotaIcon,
} from '@/components/icons/gota';
import gsap from 'gsap';
import { MediaEditor } from './media-editor';
import { FoundersEditor, PublicLinksEditor, solutionInput as input } from './profile-editor';
import type { PublicLink } from '@/lib/solutions/profile';
import { Chips, Suggestions } from './editor/chips';
import { ListingPreview } from './editor/listing-preview';
import { actionButtonStyle, solutionCategoryTones } from '@/lib/brand-colors';
import {
  solutionCategories,
  solutionCapabilities,
  solutionErrors,
  solutionEvaluationFields,
  getSolutionCategories,
  safeSolutionUrl,
  type FounderSolution,
  type SolutionData,
  type SolutionErrorCode,
} from '@/lib/solutions/model';
import {
  solutionQuestions,
  requiredQuestions,
  optionalQuestions,
  questionIndex,
  questionErrors,
  sectionFilled,
  type SolutionQuestion,
} from '@/lib/solutions/questions';
import {
  localizedIndustries,
  localizedCompanySizes,
  localizedCapabilityLabel,
  localizedIntegrationOptions,
  localizedPricingModelOptions,
  localizedPriceBandOptions,
  localizedSetupTimeOptions,
  localizedComplianceOptions,
  localizedOfferingOptions,
  localizedCategoryDisplayLabel,
} from '@/lib/taxonomy';
import { suggestCapabilityIds, suggestCategories, suggestIndustries } from '@/lib/search/suggest';
import type { SiteImageFailure } from '@/lib/solutions/site-image';
import type { Dictionary } from '@/i18n/dictionary';

type EditorDict = Dictionary['solutionEditor'];
type SiteMeta = { name: string; description: string; links?: PublicLink[] };

const sectionIcons: Partial<Record<SolutionQuestion, GotaIcon>> = {
  screenshots: ImagesIcon,
  demo: PlayIcon,
  pricing: PriceTagIcon,
  delivery: RocketIcon,
  integrations: WorkflowIcon,
  compliance: ShieldIcon,
  scope: TargetIcon,
  founders: ClientsIcon,
  links: LinkIcon,
  evidence: ClipboardCheckIcon,
};

/** «cordhq.app» → «https://cordhq.app»: nobody should have to type the scheme. */
function withScheme(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}
function hostOf(value: string) {
  const url = safeSolutionUrl(value);
  return url ? new URL(url).hostname.replace(/^www\./, '') : '';
}
function toggled(list: readonly string[] | undefined, value: string) {
  const current = list ?? [];
  return current.includes(value) ? current.filter(item => item !== value) : [...current, value];
}
function failureText(value: string, failures: EditorDict['siteImage']['failures']) {
  const messages: Record<SiteImageFailure, string> = failures;
  return Object.entries(messages).find(([code]) => code === value)?.[1] ?? value;
}

/**
 * The registration form (docs/guided-solution-form.md). Three short required steps
 * with a live catalogue card beside them, then one screen to review, submit and, if the
 * founder wants, open any optional section. Every «Continuar» saves; nothing is
 * published until the team approves it in ops.
 */
export function SolutionEditor({
  solution,
  locale,
  dict,
  hasSiteImage,
  siteImageFailure,
  hasUnpublishedChanges,
}: {
  solution: FounderSolution;
  locale: string;
  dict: EditorDict;
  hasSiteImage: boolean;
  siteImageFailure?: string | null;
  /** Published listings only: whether the saved draft differs from what is public. */
  hasUnpublishedChanges: boolean;
}) {
  const text = dict.editor;
  const reviewIndex = solutionQuestions.findIndex(item => item.id === 'review');
  const published = !!solution.published_data;
  const router = useRouter(),
    [data, setData] = useState(solution.data),
    // A published listing opens on the review screen: it is already complete.
    [step, setStep] = useState(
      published && !solution.editor_question
        ? reviewIndex
        : questionIndex(solution.editor_question, solution.step),
    ),
    [version, setVersion] = useState(solution.version),
    [dirty, setDirty] = useState(false),
    [changed, setChanged] = useState(hasUnpublishedChanges),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [mediaBusy, setMediaBusy] = useState(false),
    [reading, setReading] = useState(false),
    [siteNote, setSiteNote] = useState(
      siteImageFailure ? failureText(siteImageFailure, dict.siteImage.failures) : '',
    ),
    [hasCover, setHasCover] = useState(hasSiteImage),
    [coverVersion, setCoverVersion] = useState(0),
    [fromSite, setFromSite] = useState<{ name?: boolean; problem?: boolean }>({}),
    [siteOffer, setSiteOffer] = useState<Partial<SiteMeta>>({}),
    [showOther, setShowOther] = useState(!!solution.data.otherCategory);
  const busy = useRef(false),
    title = useRef<HTMLHeadingElement>(null),
    panel = useRef<HTMLDivElement>(null),
    initialized = useRef(false),
    autoRead = useRef(false),
    savedWebsite = useRef(solution.data.website),
    // What an optional section looked like when it was opened, for «Descartar».
    snapshot = useRef<SolutionData | null>(null);
  const question = solutionQuestions[step],
    questionText = dict.questions[question.id],
    blocked = pending || mediaBusy || reading;
  const categories = getSolutionCategories(data);
  const categoryLabel = (category: string) => localizedCategoryDisplayLabel(category, locale);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
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
  }, [step]);

  // A new draft arrives with only its link: read the site once per visit, by itself, so
  // the founder lands on a form that is already half written. Afterwards it is manual.
  useEffect(() => {
    if (autoRead.current) return;
    autoRead.current = true;
    // Also when a cover already exists: what matters here is the empty name and
    // description, e.g. a founder back on a draft they left right after pasting the link.
    if (
      solution.status === 'draft' &&
      !published &&
      safeSolutionUrl(data.website) &&
      !data.name.trim() &&
      !data.problem.trim()
    )
      void readSite();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  function update(patch: Partial<SolutionData>) {
    setData(current => ({ ...current, ...patch }));
    setDirty(true);
    setError('');
    setMessage('');
  }

  async function save(
    action: 'save' | 'submit',
    nextStep = step,
    options: { exit?: boolean; quiet?: boolean; payload?: SolutionData } = {},
  ) {
    if (busy.current || mediaBusy) return false;
    const body = options.payload ?? data;
    setError('');
    if (!options.quiet) setMessage('');
    if (action === 'submit') {
      const errors = solutionErrors(body);
      const firstError = Object.values(errors).find(
        (code): code is SolutionErrorCode => code !== undefined,
      );
      if (firstError) {
        const first = solutionQuestions.findIndex(item =>
          (item.fields as readonly string[]).some(key => key in errors),
        );
        if (first >= 0) setStep(first);
        setError(dict.validation[firstError]);
        return false;
      }
    }
    busy.current = true;
    setPending(true);
    try {
      const next = solutionQuestions[nextStep],
        response = await fetch(`/api/solutions/${solution.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            data: body,
            step: next.phase,
            question: next.id,
            version,
          }),
          signal: AbortSignal.timeout(15000),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setVersion(result.version);
      setDirty(false);
      setChanged(true);
      savedWebsite.current = body.website;
      setStep(nextStep);
      if (!options.quiet) setMessage(action === 'submit' ? text.submitted : text.saved);
      if (options.exit) router.push('/account/solutions');
      else if (action === 'submit') router.refresh();
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error &&
          !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name)
          ? failure.message
          : text.saveUnconfirmed,
      );
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  /**
   * Reads what the project's own site says about itself: its cover, name and one-line
   * description. Fills only empty fields; anything the founder already wrote is kept
   * and the site's version is offered as a one-click alternative instead.
   */
  async function readSite() {
    if (busy.current || reading) return;
    const website = withScheme(data.website);
    if (!safeSolutionUrl(website)) {
      setError(dict.validation.websiteInvalid);
      return;
    }
    // The route reads the saved draft, so the link has to be saved first.
    const payload = { ...data, website };
    if (website !== data.website) setData(payload);
    if (website !== savedWebsite.current || dirty) {
      if (!(await save('save', step, { quiet: true, payload }))) return;
    }
    setReading(true);
    setSiteNote('');
    try {
      const response = await fetch(`/api/solutions/${solution.id}/site-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(25000),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        failure?: string;
        error?: string;
        meta?: SiteMeta | null;
      };
      if (!response.ok) throw new Error(result.error || dict.siteImage.readError);
      const meta = result.meta;
      if (meta) {
        const patch: Partial<SolutionData> = {},
          offer: Partial<SiteMeta> = {},
          filled: { name?: boolean; problem?: boolean } = {};
        if (meta.name) {
          if (!payload.name.trim()) {
            patch.name = meta.name;
            filled.name = true;
          } else if (meta.name !== payload.name) offer.name = meta.name;
        }
        if (meta.description) {
          if (!payload.problem.trim()) {
            patch.problem = meta.description;
            filled.problem = true;
          } else if (meta.description !== payload.problem) offer.description = meta.description;
        }
        // The site's own profile links, only into an empty list: never replaces links
        // the founder chose.
        if (meta.links?.length && !payload.projectLinks?.length) patch.projectLinks = meta.links;
        if (Object.keys(patch).length) update(patch);
        setFromSite(filled);
        setSiteOffer(offer);
      }
      if (result.ok) {
        setHasCover(true);
        setCoverVersion(value => value + 1);
        setSiteNote(meta?.name || meta?.description ? text.readDone : '');
      } else if (result.failure) {
        setSiteNote(
          (meta?.name || meta?.description ? text.readPartial + ' ' : '') +
            failureText(result.failure, dict.siteImage.failures),
        );
      }
    } catch (failure) {
      setSiteNote(
        failure instanceof Error && failure.name !== 'TimeoutError' && failure.message
          ? failure.message
          : dict.siteImage.readNetworkError,
      );
    } finally {
      setReading(false);
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
    // Optional sections save and return to the review screen; required steps advance.
    void save('save', question.optional ? reviewIndex : step + 1);
  }

  function openSection(index: number) {
    if (blocked) return;
    snapshot.current = data;
    setError('');
    setMessage('');
    setStep(index);
  }

  function discardSection() {
    if (snapshot.current) setData(snapshot.current);
    snapshot.current = null;
    setDirty(false);
    setError('');
    setStep(reviewIndex);
  }

  if (solution.status === 'pending')
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm leading-relaxed text-stone-600">
        {text.pendingNotice}
      </p>
    );

  // ── Field helpers ──────────────────────────────────────────────────────────────
  function textField(
    key: 'name' | 'audience' | 'notFor' | 'demoUrl' | 'contactEmail' | 'evidenceUrl' | 'problem',
    label: string,
    limit: number,
    options: { rows?: number; placeholder?: string; type?: string; note?: string } = {},
  ) {
    const value = (data[key] as string | undefined) ?? '';
    const props = {
      value,
      maxLength: limit,
      className: input,
      placeholder: options.placeholder,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        update({ [key]: event.target.value });
        if (key === 'name' || key === 'problem')
          setFromSite(current => ({ ...current, [key]: false }));
      },
    };
    return (
      <label className="block text-sm font-medium text-stone-800">
        {label}
        {options.rows ? (
          <textarea {...props} rows={options.rows} className={`${input} font-normal`} />
        ) : (
          <input {...props} type={options.type ?? 'text'} className={`${input} font-normal`} />
        )}
        {options.note && (
          <span className="mt-2 block text-xs font-normal text-stone-500">{options.note}</span>
        )}
      </label>
    );
  }

  function evaluation(key: (typeof solutionEvaluationFields)[number]['key']) {
    const item = solutionEvaluationFields.find(value => value.key === key)!,
      copy = dict.evaluationFields[key];
    return (
      <label key={key} className="block text-sm font-medium text-stone-800">
        {copy.prompt}
        <textarea
          value={data[key] ?? ''}
          maxLength={item.limit}
          rows={3}
          className={`${input} font-normal`}
          placeholder={copy.placeholder}
          onChange={e => update({ [key]: e.target.value })}
        />
      </label>
    );
  }

  // ── Steps ──────────────────────────────────────────────────────────────────────
  const offeringOptions = localizedOfferingOptions(locale);
  const host = hostOf(withScheme(data.website));

  function basics() {
    return (
      <>
        <div>
          <label className="block text-sm font-medium text-stone-800" htmlFor="solution-website">
            {text.websiteLabel}
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="solution-website"
              type="url"
              inputMode="url"
              autoComplete="url"
              value={data.website}
              maxLength={500}
              placeholder={text.websitePlaceholder}
              className={`${input} mt-0 font-normal`}
              onChange={event => update({ website: event.target.value })}
              onBlur={event => {
                const value = withScheme(event.target.value);
                if (value !== event.target.value) update({ website: value });
              }}
            />
            <button
              type="button"
              disabled={blocked || !safeSolutionUrl(withScheme(data.website))}
              onClick={() => void readSite()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              <RefreshIcon
                aria-hidden="true"
                className={`size-4 ${reading ? 'animate-spin motion-reduce:animate-none' : ''}`}
              />
              {reading ? text.readingSite : hasCover || data.name ? text.reread : text.readSite}
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-500" role="status" aria-live="polite">
            {reading ? text.readingSiteFrom.replace('{host}', host) : siteNote || text.websiteHint}
          </p>
        </div>
        {textField('name', text.nameLabel, 100, {
          placeholder: text.namePlaceholder,
          note: fromSite.name ? text.fromSite : undefined,
        })}
        {siteOffer.name && (
          <OfferButton
            label={text.useFromSite.replace('{value}', siteOffer.name)}
            onUse={() => {
              update({ name: siteOffer.name });
              setSiteOffer(current => ({ ...current, name: undefined }));
            }}
          />
        )}
        <Chips
          name="solution-kind"
          legend={text.kindLegend}
          multi={false}
          options={offeringOptions.map(option => ({
            value: option.value,
            label: option.label,
            detail: text.kindHints[option.value as keyof typeof text.kindHints],
          }))}
          selected={data.kind ? [data.kind] : []}
          onToggle={kind => update({ kind: data.kind === kind ? '' : kind })}
        />
        <div>
          {textField('problem', text.problemLabel, 1500, {
            rows: 5,
            placeholder: text.problemPlaceholder,
            note: fromSite.problem ? text.fromSiteDescription : undefined,
          })}
          <p
            className={`mt-1 text-right text-xs tabular-nums ${data.problem.trim().length < 20 ? 'text-stone-400' : 'text-[#416B50]'}`}
          >
            {text.problemCounter.replace('{count}', String(data.problem.trim().length))}
          </p>
          {siteOffer.description && (
            <OfferButton
              label={text.useDescriptionFromSite}
              onUse={() => {
                update({ problem: siteOffer.description });
                setSiteOffer(current => ({ ...current, description: undefined }));
              }}
            />
          )}
        </div>
      </>
    );
  }

  function fit() {
    const suggested = suggestCategories(data, categories).map(value => ({
      value,
      label: categoryLabel(value),
    }));
    const capabilities = data.capabilities ?? [];
    const capabilitySuggestions = suggestCapabilityIds(data, categories, capabilities).map(id => ({
      value: id,
      label: localizedCapabilityLabel(id, locale),
    }));
    return (
      <>
        <Suggestions
          title={text.suggestedCategories}
          items={suggested}
          onAdd={category =>
            update({ categories: [...categories, category], category: categories[0] ?? category })
          }
        />
        <Chips
          name="solution-categories"
          legend={text.categoriesLegend}
          options={solutionCategories.map(category => ({
            value: category,
            label: categoryLabel(category),
            tone: solutionCategoryTones[category],
          }))}
          selected={categories}
          onToggle={category => {
            const next = toggled(categories, category);
            // Dropping a category drops its capabilities too, instead of leaving them
            // behind as an error the founder has to go and find.
            const kept = capabilities.filter(id =>
              next.includes(solutionCapabilities.find(item => item.id === id)?.category ?? ''),
            );
            update({
              categories: next,
              category: next[0] ?? '',
              capabilities: data.capabilities === undefined && !kept.length ? undefined : kept,
            });
          }}
        />
        <div>
          {showOther ? (
            <label className="block text-sm font-medium text-stone-800">
              {text.otherCategoryLabel}
              <input
                type="text"
                value={data.otherCategory ?? ''}
                maxLength={80}
                placeholder={text.otherCategoryPlaceholder}
                className={`${input} font-normal`}
                onChange={event => update({ otherCategory: event.target.value })}
              />
              <span className="mt-2 block text-xs font-normal text-stone-500">
                {text.otherCategoryNote}
              </span>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setShowOther(true)}
              className="text-sm text-[#365DC4] underline-offset-4 hover:underline"
            >
              {text.otherCategoryToggle}
            </button>
          )}
        </div>
        {categories.length ? (
          <div className="space-y-6 border-t border-stone-200 pt-6">
            <p className="text-sm text-stone-500">{text.capabilitiesIntro}</p>
            <Suggestions
              title={text.suggestionsTitle}
              items={capabilitySuggestions}
              onAdd={id => update({ capabilities: [...capabilities, id] })}
            />
            {categories.map(category => {
              const items = solutionCapabilities.filter(item => item.category === category);
              if (!items.length) return null;
              return (
                <Chips
                  key={category}
                  name={`capabilities-${category}`}
                  legend={text.capabilitiesLegend.replace('{category}', categoryLabel(category))}
                  tone={solutionCategoryTones[category]}
                  options={items.map(item => ({
                    value: item.id,
                    label: localizedCapabilityLabel(item.id, locale),
                  }))}
                  selected={capabilities}
                  onToggle={id => update({ capabilities: toggled(capabilities, id) })}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            {text.capabilitiesEmpty}
          </p>
        )}
      </>
    );
  }

  function audience() {
    const industryOptions = localizedIndustries(locale);
    const suggested = suggestIndustries(data, data.industries ?? []).map(value => ({
      value,
      label: industryOptions.find(item => item.value === value)?.label ?? value,
    }));
    return (
      <>
        {textField('audience', text.audienceLabel, 800, {
          rows: 3,
          placeholder: text.audiencePlaceholder,
        })}
        <Suggestions
          title={text.suggestedIndustries}
          items={data.industries?.length === 0 ? [] : suggested}
          onAdd={value => update({ industries: [...(data.industries ?? []), value] })}
        />
        <Chips
          name="solution-industries"
          legend={text.industriesLegend}
          options={industryOptions.map(item => ({
            value: item.value,
            label: item.label,
            tone: item.tone,
          }))}
          selected={data.industries ?? []}
          onToggle={value => update({ industries: toggled(data.industries, value) })}
          any={{
            label: text.anyIndustry,
            checked: data.industries?.length === 0,
            onChange: checked => update({ industries: checked ? [] : undefined }),
          }}
        />
        <Chips
          name="solution-sizes"
          legend={text.companySizeLegend}
          options={localizedCompanySizes(locale).map(size => ({
            value: size.value,
            label: size.label,
            detail: size.range,
          }))}
          selected={data.companySizes ?? []}
          onToggle={value => update({ companySizes: toggled(data.companySizes, value) })}
          any={{
            label: text.anyCompanySize,
            checked: data.companySizes?.length === 0,
            onChange: checked => update({ companySizes: checked ? [] : undefined }),
          }}
        />
      </>
    );
  }

  function review() {
    const industryLabels = Object.fromEntries(
      localizedIndustries(locale).map(item => [item.value, item.label]),
    );
    const sizeLabels = Object.fromEntries(
      localizedCompanySizes(locale).map(item => [item.value, item.label]),
    );
    const market = (values: string[] | undefined, labels: Record<string, string>) =>
      values === undefined
        ? ''
        : values.length === 0
          ? text.any
          : values.map(value => labels[value] ?? value).join(' · ');
    const kindLabel = offeringOptions.find(item => item.value === data.kind)?.label ?? data.kind;
    const essentials: { label: string; value: string; step: SolutionQuestion }[] = [
      {
        label: text.review.project,
        value: [data.name, kindLabel, host].filter(Boolean).join(' · '),
        step: 'basics',
      },
      { label: text.review.problem, value: data.problem, step: 'basics' },
      {
        label: text.review.kindAndCategories,
        value: categories.map(categoryLabel).join(' · '),
        step: 'fit',
      },
      {
        label: text.review.capabilities,
        value: (data.capabilities ?? [])
          .map(id => localizedCapabilityLabel(id, locale))
          .join(' · '),
        step: 'fit',
      },
      { label: text.review.audience, value: data.audience, step: 'audience' },
      {
        label: text.review.market,
        value: [market(data.industries, industryLabels), market(data.companySizes, sizeLabels)]
          .filter(Boolean)
          .join(' — '),
        step: 'audience',
      },
    ];
    const filled = optionalQuestions.filter(item => sectionFilled(data, item.id)).length;
    const submitDisabled = blocked || (published && !changed && !dirty);
    return (
      <>
        <section aria-labelledby="essentials-title">
          <h3 id="essentials-title" className="text-sm font-medium text-stone-800">
            {text.review.essentials}
          </h3>
          <dl className="mt-3 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {essentials.map(row => (
              <div key={row.label} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-stone-400">{row.label}</dt>
                  <dd
                    className={`mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed ${row.value ? 'text-stone-700' : 'text-[#A94E35]'}`}
                  >
                    {row.value || dict.toComplete}
                  </dd>
                </div>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() =>
                    void save(
                      'save',
                      solutionQuestions.findIndex(q => q.id === row.step),
                    )
                  }
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-[#365DC4] hover:bg-[#E4EBFC] disabled:opacity-50"
                  aria-label={`${text.review.edit}: ${row.label}`}
                >
                  {text.review.edit}
                </button>
              </div>
            ))}
          </dl>
        </section>
        {textField('contactEmail', text.contactEmailLabel, 254, {
          type: 'email',
          note: text.contactEmailNote,
        })}
        <div className="rounded-2xl bg-[#E4EBFC]/50 p-5">
          <button
            type="submit"
            disabled={submitDisabled}
            style={actionButtonStyle}
            className="action-button inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-medium disabled:opacity-40"
          >
            {published ? text.submitUpdate : text.submit}
            <ArrowRightIcon className="button-arrow size-4" />
          </button>
          <p className="mt-3 text-xs leading-relaxed text-stone-600">
            {published && !changed && !dirty ? text.noChanges : text.reviewNote}
          </p>
        </div>
        <section aria-labelledby="optional-title" className="border-t border-stone-200 pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="optional-title" className="text-xl font-medium tracking-[-0.02em]">
              {text.optionalTitle}
            </h3>
            <span className="text-xs tabular-nums text-stone-400">
              {text.optionalCount
                .replace('{done}', String(filled))
                .replace('{total}', String(optionalQuestions.length))}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">{text.optionalHint}</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {optionalQuestions.map(item => {
              const Icon = sectionIcons[item.id] ?? PlusIcon;
              const done = sectionFilled(data, item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => openSection(solutionQuestions.findIndex(q => q.id === item.id))}
                    className="group flex h-full w-full items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left transition-[border-color,box-shadow,transform] duration-200 hover:border-stone-300 hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,0.18)] active:translate-y-px disabled:opacity-50 motion-reduce:transition-none"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-[#E4EDE2] text-[#416B50]' : 'bg-stone-100 text-stone-500'}`}
                    >
                      {done ? (
                        <CheckIcon aria-hidden="true" className="size-4" />
                      ) : (
                        <Icon aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-stone-900">
                        {dict.questions[item.id].title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
                        {dict.sections[item.id as keyof typeof dict.sections]}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-xs font-medium ${done ? 'text-[#416B50]' : 'text-[#365DC4]'}`}
                    >
                      {done ? text.added : text.add}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </>
    );
  }

  function optionalSection() {
    switch (question.id) {
      case 'screenshots':
        return (
          <MediaEditor
            solutionId={solution.id}
            value={data.screenshots ?? []}
            onBusy={setMediaBusy}
            onChange={screenshots => update({ screenshots })}
            dict={dict.media}
          />
        );
      case 'demo':
        return textField('demoUrl', text.demoLabel, 500, { type: 'url', placeholder: 'https://' });
      case 'pricing':
        return (
          <>
            <Chips
              name="pricing-model"
              legend={text.pricingModelLegend}
              options={localizedPricingModelOptions(locale)}
              selected={data.pricingModel ?? []}
              onToggle={value => update({ pricingModel: toggled(data.pricingModel, value) })}
            />
            <Chips
              name="price-band"
              legend={text.priceBandLegend}
              multi={false}
              tone="sage"
              options={localizedPriceBandOptions(locale)}
              selected={data.priceBand ? [data.priceBand] : []}
              onToggle={value =>
                update({ priceBand: data.priceBand === value ? undefined : value })
              }
            />
            {evaluation('pricing')}
          </>
        );
      case 'delivery':
        return (
          <>
            <Chips
              name="setup-time"
              legend={text.setupTimeLegend}
              multi={false}
              tone="amber"
              options={localizedSetupTimeOptions(locale)}
              selected={data.setupTime ? [data.setupTime] : []}
              onToggle={value =>
                update({ setupTime: data.setupTime === value ? undefined : value })
              }
            />
            {evaluation('implementation')}
            {evaluation('support')}
          </>
        );
      case 'integrations':
        return (
          <>
            <Chips
              name="integrations"
              legend={text.integrationsLegend}
              tone="lavender"
              options={localizedIntegrationOptions(locale)}
              selected={data.integrationKeys ?? []}
              onToggle={value => update({ integrationKeys: toggled(data.integrationKeys, value) })}
              any={{
                label: text.noIntegrations,
                checked: data.integrationKeys?.length === 0,
                onChange: checked => update({ integrationKeys: checked ? [] : undefined }),
              }}
            />
            {evaluation('integrations')}
          </>
        );
      case 'compliance':
        return (
          <Chips
            name="compliance"
            legend={text.complianceLegend}
            tone="terracotta"
            options={localizedComplianceOptions(locale)}
            selected={data.compliance ?? []}
            onToggle={value => update({ compliance: toggled(data.compliance, value) })}
          />
        );
      case 'scope':
        return (
          <>
            {evaluation('scope')}
            {textField('notFor', text.notForLabel, 500, {
              rows: 3,
              placeholder: text.notForPlaceholder,
            })}
          </>
        );
      case 'founders':
        return (
          <FoundersEditor
            value={data.founders ?? []}
            onChange={founders => update({ founders })}
            locale={locale}
            dict={dict.profile}
          />
        );
      case 'links':
        return (
          <PublicLinksEditor
            label={text.projectLinksLabel}
            links={data.projectLinks ?? []}
            onChange={projectLinks => update({ projectLinks })}
            locale={locale}
            dict={dict.profile}
          />
        );
      case 'evidence':
        return (
          <>
            {evaluation('evidence')}
            {textField('evidenceUrl', text.evidenceUrlLabel, 500, {
              type: 'url',
              placeholder: 'https://',
            })}
          </>
        );
      default:
        return null;
    }
  }

  // ── Layout ─────────────────────────────────────────────────────────────────────
  const requiredIndex = requiredQuestions.findIndex(item => item.id === question.id);
  const cover = data.screenshots?.[0]
    ? `/api/solutions/${solution.id}/media/${data.screenshots[0].id}`
    : hasCover && !data.hideSiteImage
      ? `/api/solutions/${solution.id}/site-image?v=${coverVersion}`
      : null;

  return (
    <form
      noValidate
      aria-label={text.formAria}
      aria-busy={blocked}
      onSubmit={event => {
        event.preventDefault();
        goNext();
      }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || question.id === 'review') return;
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          goNext();
        } else if (
          event.key === 'Enter' &&
          event.target instanceof HTMLInputElement &&
          !['file', 'checkbox', 'radio'].includes(event.target.type) &&
          event.target.id !== 'solution-website'
        ) {
          event.preventDefault();
          goNext();
        }
      }}
    >
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        {question.optional ? (
          <button
            type="button"
            disabled={blocked}
            onClick={discardSection}
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-50"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            {text.backToReview}
          </button>
        ) : (
          <nav aria-label={text.progressAria}>
            <ol className="flex flex-wrap items-center gap-1.5">
              {requiredQuestions.map((item, index) => {
                const current = item.id === question.id,
                  done = index < requiredIndex || (requiredIndex < 0 && index < 3),
                  reachable =
                    published ||
                    index <= requiredIndex ||
                    questionErrors(
                      data,
                      solutionQuestions.findIndex(
                        q => q.id === requiredQuestions[Math.max(0, index - 1)].id,
                      ),
                    ).length === 0;
                return (
                  <li key={item.id} className="flex items-center gap-1.5">
                    {index > 0 && <span aria-hidden="true" className="h-px w-4 bg-stone-300" />}
                    <button
                      type="button"
                      disabled={blocked || current || !reachable}
                      aria-current={current ? 'step' : undefined}
                      onClick={() =>
                        void save(
                          'save',
                          solutionQuestions.findIndex(q => q.id === item.id),
                        )
                      }
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${current ? 'bg-[#E4EBFC] text-[#365DC4]' : done ? 'text-stone-700 hover:bg-white' : 'text-stone-400'} disabled:cursor-default`}
                    >
                      <span
                        className={`flex size-5 items-center justify-center rounded-full text-[10px] ${current ? 'bg-[#365DC4] text-white' : done ? 'bg-[#E4EDE2] text-[#416B50]' : 'bg-stone-200 text-stone-500'}`}
                      >
                        {done && !current ? (
                          <CheckIcon aria-hidden="true" className="size-3" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {text.stepLabels[item.id as keyof typeof text.stepLabels]}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-stone-400" role="status">
            {pending
              ? text.statusSaving
              : reading
                ? text.readingSite
                : mediaBusy
                  ? text.statusProcessingScreenshot
                  : dirty
                    ? text.statusUnsaved
                    : text.statusSaved}
          </span>
          <button
            type="button"
            disabled={blocked}
            onClick={() => void save('save', step, { exit: true })}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#365DC4]/50 focus:ring-offset-2 disabled:opacity-50"
          >
            {text.saveAndExit}
            <ArrowUpRightIcon className="size-3.5 text-stone-400" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div ref={panel} className="min-w-0 scroll-mt-28">
          <div className="mb-8">
            <h2
              ref={title}
              tabIndex={-1}
              className="text-3xl font-medium leading-tight tracking-[-0.03em] outline-none sm:text-4xl"
            >
              {question.id === 'review' && published
                ? text.reviewPublishedTitle
                : questionText.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
              {question.id === 'review' && published ? text.reviewPublishedHint : questionText.hint}
            </p>
          </div>
          <fieldset disabled={pending || mediaBusy} className="space-y-8">
            {question.id === 'basics' && basics()}
            {question.id === 'fit' && fit()}
            {question.id === 'audience' && audience()}
            {question.id === 'review' && review()}
            {question.optional && optionalSection()}
          </fieldset>
          {error && (
            <p role="alert" className="mt-6 text-sm text-[#A94E35]">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="mt-5 inline-flex items-center gap-2 text-xs text-stone-500">
              <CheckIcon className="size-3" aria-hidden="true" />
              {message}
            </p>
          )}
          {question.id !== 'review' && (
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={blocked}
                style={actionButtonStyle}
                className="action-button inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-40"
              >
                {question.optional
                  ? text.saveSection
                  : question.id === 'audience'
                    ? text.toReview
                    : text.continue}
                <ArrowRightIcon className="button-arrow size-4" aria-hidden="true" />
              </button>
              {question.optional ? (
                <button
                  type="button"
                  disabled={blocked}
                  onClick={discardSection}
                  className="rounded-full px-3 py-3 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-40"
                >
                  {text.discardSection}
                </button>
              ) : (
                requiredIndex > 0 && (
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() =>
                      void save(
                        'save',
                        solutionQuestions.findIndex(
                          q => q.id === requiredQuestions[requiredIndex - 1].id,
                        ),
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-full px-3 py-3 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-40"
                  >
                    <ArrowLeftIcon className="size-4" aria-hidden="true" />
                    {text.previous}
                  </button>
                )
              )}
              <span className="hidden text-xs text-stone-400 sm:inline">{text.keyboardHint}</span>
            </div>
          )}
        </div>
        <aside className="min-w-0 lg:sticky lg:top-10">
          <ListingPreview
            title={text.previewTitle}
            name={data.name}
            description={data.problem}
            kind={offeringOptions.find(item => item.value === data.kind)?.label ?? ''}
            host={host}
            cover={cover}
            categories={categories.map(value => ({ value, label: categoryLabel(value) }))}
            reading={reading}
            coverAlt={dict.siteImage.imageAlt}
            namePlaceholder={text.previewNamePlaceholder}
            descriptionPlaceholder={text.previewDescriptionPlaceholder}
          />
          {hasCover && !data.screenshots?.length && (
            <label className="mt-4 flex max-w-[340px] cursor-pointer items-start gap-2 text-xs leading-relaxed text-stone-500">
              <input
                type="checkbox"
                checked={!data.hideSiteImage}
                onChange={event => update({ hideSiteImage: !event.target.checked })}
              />
              {text.useSiteCover}
            </label>
          )}
          <Link
            href={`/account/solutions/${solution.id}/preview`}
            target="_blank"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#365DC4]"
          >
            {text.openPreview}
            <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
            <span className="sr-only"> {dict.detail.otherTab}</span>
          </Link>
          <p className="mt-6 max-w-[340px] text-xs leading-relaxed text-stone-400">
            {text.autosaveNote}
          </p>
        </aside>
      </div>
    </form>
  );
}

function OfferButton({ label, onUse }: { label: string; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="-mt-4 inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-[#E4EBFC] px-3 py-1.5 text-xs text-[#365DC4] hover:bg-[#d6e0fa]"
    >
      <RefreshIcon aria-hidden="true" className="size-3 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
