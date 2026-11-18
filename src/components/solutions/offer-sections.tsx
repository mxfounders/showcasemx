import { ArrowUpRightIcon, CheckIcon } from '@/components/icons/gota';
import {
  offerSections,
  offerValues,
  planPrice,
  resourceLinks,
  supportResources,
  technicalResources,
  type OfferFacts,
} from '@/lib/solutions/offer';
import { outboundRel } from '@/lib/solutions/outbound';
import type { Dictionary } from '@/i18n/dictionary';

type OfferDict = Dictionary['solution']['offer'];
type Props = {
  data: OfferFacts;
  locale: string;
  dict: OfferDict;
  otherTab: string;
  /** Wraps an outbound link (UTM on the public listing, plain in the preview). */
  out: (href: string) => string;
};

/**
 * The three SHCWS-180 sections of a listing: plans and how to try it, support and
 * contract, and what a technical team can build with. Each renders only when the project
 * declared something for it; nothing here is computed or filled in.
 */
export function OfferSections(props: Props) {
  const shown = offerSections(props.data);
  return (
    <>
      {shown.plans && <PlansSection {...props} />}
      {shown.service && <ServiceSection {...props} />}
      {shown.technical && <TechnicalSection {...props} />}
    </>
  );
}

function ResourceButtons({
  links,
  out,
  otherTab,
}: {
  links: ReturnType<typeof resourceLinks>;
  out: Props['out'];
  otherTab: string;
}) {
  if (!links.length) return null;
  return (
    <ul className="mt-6 flex flex-wrap gap-2">
      {links.map(link => (
        <li key={link.kind}>
          <a
            href={out(link.href)}
            target="_blank"
            rel={outboundRel}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-900"
          >
            {link.label}
            <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
            <span className="sr-only"> {otherTab}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function PlansSection({ data, locale, dict }: Props) {
  const values = offerValues(data, locale);
  return (
    <section className="border-t border-stone-200 pt-8" aria-labelledby="plans-title">
      <h2 id="plans-title" className="text-xl font-medium">
        {values.plans.length ? dict.plansTitle : dict.tryTitle}
      </h2>
      {values.tryOptions.length > 0 && (
        <ul
          className="mt-4 flex flex-wrap gap-2"
          aria-label={values.plans.length ? dict.tryTitle : undefined}
        >
          {values.tryOptions.map(label => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E4EDE2] px-3 py-1.5 text-sm font-medium text-[#416B50]"
            >
              <CheckIcon aria-hidden="true" className="size-3.5" />
              {label}
            </li>
          ))}
        </ul>
      )}
      {values.plans.length > 0 && (
        <>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {values.plans.map((plan, index) => (
              <li
                key={`${plan.name}-${index}`}
                className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5"
              >
                <p className="text-sm font-medium text-stone-500">{plan.name}</p>
                <p className="mt-2 break-words text-2xl font-medium tracking-[-0.02em] text-stone-900">
                  {planPrice(plan, locale)}
                </p>
                {plan.includes && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-500">
                    {plan.includes}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-stone-400">{dict.plansNote}</p>
        </>
      )}
    </section>
  );
}

function ServiceSection({ data, locale, dict, out, otherTab }: Props) {
  const values = offerValues(data, locale);
  const rows = [
    { key: 'channels', label: dict.channels, value: values.supportChannels.join(', ') },
    { key: 'response', label: dict.response, value: values.supportResponse },
    { key: 'sla', label: dict.sla, value: values.sla },
    { key: 'onboarding', label: dict.onboarding, value: values.onboarding.join(', ') },
  ].filter(row => row.value);
  return (
    <section className="border-t border-stone-200 pt-8" aria-labelledby="service-title">
      <h2 id="service-title" className="text-xl font-medium">
        {dict.serviceTitle}
      </h2>
      <p className="mt-2 text-xs text-stone-400">{dict.serviceNote}</p>
      {rows.length > 0 && (
        <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {rows.map(row => (
            <div key={row.key}>
              <dt className="text-sm font-medium">{row.label}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-stone-500">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {values.exitTerms.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium">{dict.exitTerms}</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {values.exitTerms.map(label => (
              <li key={label} className="flex items-start gap-2 text-sm text-stone-600">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#E4EDE2] text-[#416B50]">
                  <CheckIcon aria-hidden="true" className="size-3" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ResourceButtons
        links={resourceLinks(data, locale, supportResources)}
        out={out}
        otherTab={otherTab}
      />
    </section>
  );
}

function TechnicalSection({ data, locale, dict, out, otherTab }: Props) {
  const values = offerValues(data, locale);
  return (
    <section className="border-t border-stone-200 pt-8" aria-labelledby="technical-title">
      <h2 id="technical-title" className="text-xl font-medium">
        {dict.technicalTitle}
      </h2>
      <p className="mt-2 text-xs text-stone-400">{dict.technicalNote}</p>
      {values.developerTools.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {values.developerTools.map(label => (
            <li
              key={label}
              className="rounded-full bg-[#EEE5F5] px-3 py-1.5 text-sm font-medium text-[#7753A5]"
            >
              {label}
            </li>
          ))}
        </ul>
      )}
      <ResourceButtons
        links={resourceLinks(data, locale, technicalResources)}
        out={out}
        otherTab={otherTab}
      />
    </section>
  );
}
