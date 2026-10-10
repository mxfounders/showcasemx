'use client';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Star } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { actionButtonStyle, brandColors } from '@/lib/brand-colors';
import {
  readReview,
  reviewLimits,
  reviewUsageDurations,
  type ReviewField,
} from '@/lib/reviews/model';
import type { PublicReview } from '@/lib/reviews/server';
import type { Dictionary } from '@/i18n/dictionary';
import { reviewRequest } from './request';

type Option = { value: string; label: string };

const input =
  'mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-[#365DC4]';

/**
 * Writes or edits the viewer's own review. Validates with the same `readReview` the API
 * runs, so an inline error here is exactly the one the server would return.
 */
export function ReviewForm({
  solutionId,
  solutionName,
  existing,
  defaultName,
  companySizes,
  countries,
  dict,
  onClose,
}: {
  solutionId: string;
  solutionName: string;
  existing: PublicReview | null;
  defaultName: string;
  companySizes: Option[];
  countries: Option[];
  dict: Dictionary['reviews'];
  onClose: () => void;
}) {
  const router = useRouter();
  const form = dict.form;
  const ids = useId();
  const reviewId = useRef(existing?.id ?? crypto.randomUUID());
  const busy = useRef(false);
  const [values, setValues] = useState({
    name: existing?.name ?? defaultName,
    rating: existing?.rating ?? 0,
    recommends: existing ? existing.recommends : (null as boolean | null),
    headline: existing?.headline ?? '',
    useCase: existing?.useCase ?? '',
    pros: existing?.pros ?? '',
    cons: existing?.cons ?? '',
    usageDuration: existing?.usageDuration ?? '',
    companySize: existing?.companySize ?? '',
    country: existing?.country ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<ReviewField, string>>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'' | 'save' | 'delete'>('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const focusField = (field: string) =>
    document.getElementById(`${ids}-${field}`)?.focus({ preventScroll: false });

  const save = async () => {
    if (busy.current) return;
    const parsed = readReview(values);
    if (!parsed.ok) {
      setErrors({ [parsed.error.field]: dict.errors.fields[parsed.error.field] });
      focusField(parsed.error.field);
      return;
    }
    busy.current = true;
    setPending('save');
    setError('');
    try {
      await reviewRequest(solutionId, {
        action: 'save',
        reviewId: reviewId.current,
        ...(existing?.own && { version: existing.own.version }),
        ...parsed.review,
      });
      onClose();
      router.refresh();
    } catch (failure) {
      const field = (failure as { field?: ReviewField }).field;
      const message =
        failure instanceof Error && failure.message ? failure.message : dict.errors.saveFailed;
      if (field) {
        setErrors({ [field]: message });
        focusField(field);
      } else setError(message);
    } finally {
      busy.current = false;
      setPending('');
    }
  };

  const remove = async () => {
    if (!existing || busy.current) return;
    busy.current = true;
    setPending('delete');
    setError('');
    try {
      await reviewRequest(solutionId, { action: 'delete', reviewId: existing.id });
      onClose();
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message ? failure.message : dict.errors.saveFailed,
      );
    } finally {
      busy.current = false;
      setPending('');
    }
  };

  const field = (name: ReviewField, label: string, control: ReactNode, hint?: string) => (
    <div>
      <label htmlFor={`${ids}-${name}`} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      {control}
      {hint && !errors[name] && <p className="mt-1.5 text-xs text-stone-400">{hint}</p>}
      {errors[name] && (
        <p id={`${ids}-${name}-error`} className="mt-1.5 text-xs text-[#A94E35]">
          {errors[name]}
        </p>
      )}
    </div>
  );
  const describedBy = (name: ReviewField) => (errors[name] ? `${ids}-${name}-error` : undefined);
  const textArea = (name: 'useCase' | 'pros' | 'cons', label: string, placeholder?: string) => {
    const [min, max] = reviewLimits[name];
    return field(
      name,
      label,
      <textarea
        id={`${ids}-${name}`}
        rows={name === 'useCase' ? 3 : 4}
        maxLength={max}
        value={values[name]}
        placeholder={placeholder}
        aria-invalid={!!errors[name]}
        aria-describedby={describedBy(name)}
        onChange={event => set(name, event.target.value)}
        className={input}
      />,
      `${form.minimum.replace('{min}', String(min))} · ${form.counter
        .replace('{count}', String(values[name].trim().length))
        .replace('{max}', String(max))}`,
    );
  };

  return (
    <form
      noValidate
      className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"
      onSubmit={event => {
        event.preventDefault();
        void save();
      }}
    >
      <p className="text-sm leading-relaxed text-stone-500">
        {form.intro.replace('{name}', solutionName)}
      </p>

      <fieldset>
        <legend className="text-sm font-medium text-stone-700">{form.rating}</legend>
        <div
          id={`${ids}-rating`}
          tabIndex={-1}
          className="mt-2 flex gap-1"
          aria-describedby={describedBy('rating')}
        >
          {[1, 2, 3, 4, 5].map(star => (
            <label key={star} className="cursor-pointer">
              <input
                type="radio"
                name={`${ids}-rating`}
                value={star}
                checked={values.rating === star}
                onChange={() => set('rating', star)}
                className="peer sr-only"
              />
              <span className="sr-only">
                {(star === 1 ? form.star : form.stars).replace('{count}', String(star))}
              </span>
              <Star
                aria-hidden="true"
                className="size-8 rounded-md transition-transform peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4] motion-safe:hover:scale-110"
                strokeWidth={1.5}
                style={{ color: star <= values.rating ? brandColors.amber.solid : '#d6d3d1' }}
                fill={star <= values.rating ? brandColors.amber.solid : 'none'}
              />
            </label>
          ))}
        </div>
        {errors.rating && <p className="mt-1.5 text-xs text-[#A94E35]">{errors.rating}</p>}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-stone-700">{form.recommends}</legend>
        <div
          id={`${ids}-recommends`}
          tabIndex={-1}
          className="mt-2 flex gap-2"
          aria-describedby={describedBy('recommends')}
        >
          {[
            { value: true, label: form.yes },
            { value: false, label: form.no },
          ].map(option => (
            <label key={String(option.value)} className="cursor-pointer">
              <input
                type="radio"
                name={`${ids}-recommends`}
                checked={values.recommends === option.value}
                onChange={() => set('recommends', option.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-full border border-stone-200 px-5 text-sm text-stone-600 transition-colors hover:border-stone-300 peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-checked:font-medium peer-checked:text-[#365DC4] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4]"
              >
                {option.label}
              </span>
              <span className="sr-only">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.recommends && <p className="mt-1.5 text-xs text-[#A94E35]">{errors.recommends}</p>}
      </fieldset>

      {field(
        'headline',
        form.headline,
        <input
          id={`${ids}-headline`}
          maxLength={reviewLimits.headline[1]}
          value={values.headline}
          placeholder={form.headlinePlaceholder}
          aria-invalid={!!errors.headline}
          aria-describedby={describedBy('headline')}
          onChange={event => set('headline', event.target.value)}
          className={input}
        />,
      )}
      {textArea('useCase', form.useCase, form.useCasePlaceholder)}
      <div className="grid gap-6 sm:grid-cols-2">
        {textArea('pros', form.pros)}
        {textArea('cons', form.cons)}
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {field(
          'usageDuration',
          form.usageDuration,
          <select
            id={`${ids}-usageDuration`}
            value={values.usageDuration}
            aria-invalid={!!errors.usageDuration}
            aria-describedby={describedBy('usageDuration')}
            onChange={event => set('usageDuration', event.target.value)}
            className={input}
          >
            <option value="" disabled>
              {form.choose}
            </option>
            {reviewUsageDurations.map(value => (
              <option key={value} value={value}>
                {dict.usageDurations[value]}
              </option>
            ))}
          </select>,
        )}
        {field(
          'companySize',
          form.companySize,
          <select
            id={`${ids}-companySize`}
            value={values.companySize}
            onChange={event => set('companySize', event.target.value)}
            className={input}
          >
            <option value="">{form.none}</option>
            {companySizes.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>,
        )}
        {field(
          'country',
          form.country,
          <select
            id={`${ids}-country`}
            value={values.country}
            onChange={event => set('country', event.target.value)}
            className={input}
          >
            <option value="">{form.none}</option>
            {countries.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>,
        )}
      </div>
      {field(
        'name',
        form.name,
        <input
          id={`${ids}-name`}
          maxLength={reviewLimits.name}
          value={values.name}
          placeholder={form.namePlaceholder}
          aria-invalid={!!errors.name}
          aria-describedby={describedBy('name')}
          onChange={event => set('name', event.target.value)}
          className={input}
        />,
      )}

      <p className="text-xs leading-relaxed text-stone-400">{form.rules}</p>
      {error && (
        <p role="alert" className="text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {existing &&
            (confirmDelete ? (
              <>
                <span className="text-sm text-stone-600">{form.deleteConfirm}</span>
                <button
                  type="button"
                  disabled={!!pending}
                  onClick={() => void remove()}
                  className="rounded-full px-4 py-2 text-sm text-[#A94E35] hover:bg-[#F6E5DD]"
                >
                  {pending === 'delete' ? form.deleting : form.delete}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full px-4 py-2 text-sm text-stone-500 hover:bg-stone-100"
                >
                  {form.cancel}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-full px-4 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-[#A94E35]"
              >
                {form.delete}
              </button>
            ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            {form.cancel}
          </button>
          <button
            disabled={!!pending}
            style={actionButtonStyle}
            className="action-button rounded-full px-5 py-3 text-sm font-medium"
          >
            {pending === 'save' ? form.saving : existing ? form.update : form.submit}
          </button>
        </div>
      </div>
    </form>
  );
}
