'use client';
import { useId, useRef, useState } from 'react';
import { ArrowTurnDownRightIcon, FlagIcon, HelpIcon } from '@/components/icons/gota';
import Link, { useRouter } from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import { questionLimits, questionReportReasons, readQuestion } from '@/lib/questions/model';
import type { PublicQuestion } from '@/lib/questions/server';
import type { Dictionary } from '@/i18n/dictionary';

const field =
  'mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-[#365DC4]';

type Viewer = { signedIn: boolean; owner: boolean; verified: boolean; name: string };

async function questionRequest(solutionId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/solutions/${solutionId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string; field?: string };
  if (!response.ok) throw Object.assign(new Error(body.error ?? ''), { field: body.field });
  return body;
}

/**
 * Public questions on a listing (SHCWS-57). Verified accounts ask under an alias; the
 * owner answers and the answer is marked as theirs. The owner never edits or deletes a
 * question, only reports it; the author may delete their own.
 */
export function QuestionSection({
  solutionId,
  solutionName,
  questions,
  viewer,
  locale,
  dict,
}: {
  solutionId: string;
  solutionName: string;
  questions: PublicQuestion[];
  viewer: Viewer;
  locale: string;
  dict: Dictionary['questions'];
}) {
  const router = useRouter();
  const ids = useId();
  const busy = useRef(false);
  const questionId = useRef<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState(viewer.name);
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ name?: string; body?: string }>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const ask = async () => {
    if (busy.current) return;
    const parsed = readQuestion({ name, body });
    if (!parsed.ok) {
      setErrors({ [parsed.field]: dict.errors.fields[parsed.field] });
      document.getElementById(`${ids}-${parsed.field}`)?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    // One id per question being written: a retry after a network error returns the same row.
    questionId.current ??= crypto.randomUUID();
    try {
      await questionRequest(solutionId, {
        action: 'ask',
        questionId: questionId.current,
        name: parsed.name,
        body: parsed.body,
      });
      questionId.current = null;
      setBody('');
      setAsking(false);
      router.refresh();
    } catch (failure) {
      const fieldName = (failure as { field?: 'name' | 'body' }).field;
      const message =
        failure instanceof Error && failure.message ? failure.message : dict.errors.saveFailed;
      if (fieldName) setErrors({ [fieldName]: message });
      else setError(message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const [min, max] = questionLimits.body;
  return (
    <section
      id="preguntas"
      aria-labelledby="solution-questions"
      className="mt-14 scroll-mt-24 border-t border-stone-200 pt-8"
    >
      <div className="max-w-4xl">
        <h2 id="solution-questions" className="text-2xl font-semibold tracking-tight">
          {dict.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{dict.intro}</p>

        <div className="mt-6">
          {!viewer.signedIn ? (
            <p className="text-sm text-stone-500">
              <Link
                href={`/sign-in?next=${encodeURIComponent('/soluciones/' + solutionId)}`}
                className="text-[#365DC4] underline underline-offset-4"
              >
                {dict.signIn}
              </Link>{' '}
              {dict.signInSuffix}
            </p>
          ) : viewer.owner ? (
            <p className="text-sm text-stone-500">{dict.ownNote}</p>
          ) : !viewer.verified ? (
            <p className="text-sm text-stone-500">
              {dict.verify}{' '}
              <Link
                href="/account/settings/security"
                className="text-[#365DC4] underline underline-offset-4"
              >
                {dict.verifyLink}
              </Link>
            </p>
          ) : asking ? (
            <form
              noValidate
              className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6"
              onSubmit={event => {
                event.preventDefault();
                void ask();
              }}
            >
              <div>
                <label htmlFor={`${ids}-body`} className="block text-sm font-medium text-stone-700">
                  {dict.form.body}
                </label>
                <textarea
                  id={`${ids}-body`}
                  autoFocus
                  rows={3}
                  maxLength={max}
                  value={body}
                  placeholder={dict.form.bodyPlaceholder}
                  aria-invalid={!!errors.body}
                  aria-describedby={`${ids}-body-hint`}
                  onChange={event => {
                    setBody(event.target.value);
                    setErrors(current => ({ ...current, body: undefined }));
                  }}
                  className={field}
                />
                <p
                  id={`${ids}-body-hint`}
                  className={`mt-1.5 text-xs ${errors.body ? 'text-[#A94E35]' : 'text-stone-400'}`}
                >
                  {errors.body ??
                    dict.form.counter
                      .replace('{count}', String(body.trim().length))
                      .replace('{max}', String(max))}
                </p>
              </div>
              <div>
                <label htmlFor={`${ids}-name`} className="block text-sm font-medium text-stone-700">
                  {dict.form.name}
                </label>
                <input
                  id={`${ids}-name`}
                  maxLength={questionLimits.name}
                  value={name}
                  placeholder={dict.form.namePlaceholder}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? `${ids}-name-error` : undefined}
                  onChange={event => {
                    setName(event.target.value);
                    setErrors(current => ({ ...current, name: undefined }));
                  }}
                  className={field}
                />
                {errors.name && (
                  <p id={`${ids}-name-error`} className="mt-1.5 text-xs text-[#A94E35]">
                    {errors.name}
                  </p>
                )}
              </div>
              <p className="text-xs leading-relaxed text-stone-400">{dict.form.rules}</p>
              {error && (
                <p role="alert" className="text-sm text-[#A94E35]">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAsking(false);
                    setError('');
                  }}
                  className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
                >
                  {dict.form.cancel}
                </button>
                <button
                  disabled={pending || body.trim().length < min}
                  style={actionButtonStyle}
                  className="action-button rounded-full px-5 py-3 text-sm font-medium"
                >
                  {pending ? dict.form.sending : dict.form.submit}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAsking(true)}
              style={actionButtonStyle}
              className="action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              <HelpIcon className="size-4" aria-hidden="true" />
              {dict.ask}
            </button>
          )}
        </div>

        <div className="mt-4 divide-y divide-stone-200">
          {questions.map(question => (
            <QuestionItem
              key={question.id}
              question={question}
              solutionId={solutionId}
              solutionName={solutionName}
              canAnswer={viewer.owner}
              canReport={viewer.signedIn && !question.mine}
              locale={locale}
              dict={dict}
            />
          ))}
          {!questions.length && (
            <p className="py-7 text-sm text-stone-500">
              {dict.empty.replace('{name}', solutionName)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function QuestionItem({
  question,
  solutionId,
  solutionName,
  canAnswer,
  canReport,
  locale,
  dict,
}: {
  question: PublicQuestion;
  solutionId: string;
  solutionName: string;
  canAnswer: boolean;
  canReport: boolean;
  locale: string;
  dict: Dictionary['questions'];
}) {
  const router = useRouter();
  const ids = useId();
  const busy = useRef(false);
  const [mode, setMode] = useState<'' | 'answer' | 'report' | 'delete'>('');
  const [answer, setAnswer] = useState(question.answer?.body ?? '');
  const [reason, setReason] = useState<string>(questionReportReasons[0]);
  const [details, setDetails] = useState('');
  const [reported, setReported] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const send = async (payload: Record<string, unknown>, after: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await questionRequest(solutionId, { questionId: question.id, ...payload });
      after();
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message ? failure.message : dict.errors.saveFailed,
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return (
    <article className="py-6" aria-labelledby={`${ids}-question`}>
      <p
        id={`${ids}-question`}
        className="whitespace-pre-wrap break-words text-base font-medium text-stone-900"
      >
        {question.body}
      </p>
      <p className="mt-1.5 text-xs text-stone-500">
        <span className="font-medium text-stone-700">{question.name}</span> ·{' '}
        <time dateTime={question.createdAt}>{date(question.createdAt)}</time>
      </p>
      {question.hiddenReason && (
        <p className="mt-3 rounded-2xl bg-[#F4ECD5] p-3 text-sm text-[#6b4d14]">
          {dict.hidden.replace('{reason}', question.hiddenReason)}
        </p>
      )}

      {question.answer && mode !== 'answer' ? (
        <div className="mt-4 rounded-2xl border border-[#C9D6F6] bg-[#F3F6FD] p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-[#365DC4]">
            <ArrowTurnDownRightIcon className="size-3.5" aria-hidden="true" />
            {dict.answerFrom.replace('{name}', solutionName)}
            <time className="font-normal text-stone-400" dateTime={question.answer.at}>
              · {date(question.answer.at)}
            </time>
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">
            {question.answer.body}
          </p>
        </div>
      ) : (
        !question.answer && <p className="mt-3 text-xs text-stone-400">{dict.unanswered}</p>
      )}

      {mode === '' && (canAnswer || question.mine || (canReport && !reported)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canAnswer && (
            <button
              type="button"
              onClick={() => setMode('answer')}
              className="rounded-full px-3 py-1.5 text-sm text-[#365DC4] hover:bg-[#E4EBFC]"
            >
              {question.answer ? dict.answer.edit : dict.answer.action}
            </button>
          )}
          {question.mine && (
            <button
              type="button"
              onClick={() => setMode('delete')}
              className="rounded-full px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-100 hover:text-[#A94E35]"
            >
              {dict.delete}
            </button>
          )}
          {canReport && !reported && (
            <button
              type="button"
              onClick={() => setMode('report')}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            >
              <FlagIcon className="size-3.5" aria-hidden="true" />
              {dict.report.action}
            </button>
          )}
        </div>
      )}
      {reported && (
        <p role="status" className="mt-3 text-sm text-[#416B50]">
          {dict.report.done}
        </p>
      )}

      {mode === 'delete' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-600">{dict.deleteConfirm}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => void send({ action: 'delete' }, () => router.refresh())}
            className="rounded-full px-3 py-1.5 text-[#A94E35] hover:bg-[#F6E5DD]"
          >
            {pending ? dict.deleting : dict.delete}
          </button>
          <button
            type="button"
            onClick={() => setMode('')}
            className="rounded-full px-3 py-1.5 text-stone-500 hover:bg-stone-100"
          >
            {dict.form.cancel}
          </button>
        </div>
      )}

      {mode === 'answer' && (
        <form
          noValidate
          className="mt-4"
          onSubmit={event => {
            event.preventDefault();
            void send({ action: 'answer', answer }, () => {
              setMode('');
              router.refresh();
            });
          }}
        >
          <label htmlFor={`${ids}-answer`} className="text-sm font-medium text-stone-700">
            {dict.answer.label}
          </label>
          <textarea
            id={`${ids}-answer`}
            autoFocus
            rows={3}
            maxLength={questionLimits.answer}
            value={answer}
            placeholder={dict.answer.placeholder}
            onChange={event => setAnswer(event.target.value)}
            className={field}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              disabled={pending || !answer.trim()}
              style={actionButtonStyle}
              className="action-button rounded-full px-4 py-2.5 text-sm"
            >
              {pending ? dict.answer.saving : dict.answer.submit}
            </button>
            {question.answer && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  void send({ action: 'answer', answer: '' }, () => {
                    setAnswer('');
                    setMode('');
                    router.refresh();
                  })
                }
                className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-[#A94E35]"
              >
                {dict.answer.remove}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAnswer(question.answer?.body ?? '');
                setMode('');
                setError('');
              }}
              className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
            >
              {dict.answer.cancel}
            </button>
          </div>
        </form>
      )}

      {mode === 'report' && (
        <form
          noValidate
          className="mt-4 space-y-3 rounded-2xl border border-stone-200 p-4"
          onSubmit={event => {
            event.preventDefault();
            void send({ action: 'report', reason, details }, () => {
              setMode('');
              setReported(true);
            });
          }}
        >
          <p className="text-sm font-medium text-stone-700">{dict.report.title}</p>
          <label className="block text-sm text-stone-600">
            {dict.report.reason}
            <select
              value={reason}
              onChange={event => setReason(event.target.value)}
              className={field}
            >
              {questionReportReasons.map(value => (
                <option key={value} value={value}>
                  {dict.report.reasons[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-stone-600">
            {dict.report.details}
            <textarea
              rows={3}
              maxLength={questionLimits.reportDetails[1]}
              value={details}
              placeholder={dict.report.detailsPlaceholder}
              onChange={event => setDetails(event.target.value)}
              className={field}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending}
              style={actionButtonStyle}
              className="action-button rounded-full px-4 py-2.5 text-sm"
            >
              {pending ? dict.report.sending : dict.report.submit}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('');
                setError('');
              }}
              className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
            >
              {dict.report.cancel}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </article>
  );
}
