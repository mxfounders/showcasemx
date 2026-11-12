'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { CheckIcon } from '@/components/icons/gota';
import { normalizeWebsite } from '@/lib/solutions/website';
import type { Dictionary } from '@/i18n/dictionary';

type Dict = Dictionary['solutionEditor']['siteDraft'];
export type SiteDraftStage = 'creating' | 'reading' | 'drafting' | 'done';
const stages: SiteDraftStage[] = ['creating', 'reading', 'drafting', 'done'];
type ErrorCode = keyof Dict['errors'];

/**
 * The client half of the AI draft, shared by «Nueva solución» and the founder's
 * onboarding: creates the draft (same id on every retry, so a timed-out request
 * never leaves an orphan), then reads the server's NDJSON stream stage by stage
 * and opens the editor when it is done. Whatever fails after the draft exists,
 * the founder can keep going by hand from it.
 */
export function useSiteDraft(dict: Dict) {
  const router = useRouter();
  const id = useRef<string | null>(null);
  const busy = useRef(false);
  const confirmed = useRef(false);
  const [stage, setStage] = useState<SiteDraftStage | null>(null);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [partial, setPartial] = useState(false);
  // Retry and "continue by hand" only make sense after a server-side failure.
  const [serverError, setServerError] = useState(false);

  const fail = (message: string) => {
    setError(message);
    setServerError(true);
    setStage(null);
  };

  /** Creates the empty draft once; returns its id, or null with the error set. */
  async function ensureDraft(): Promise<string | null> {
    if (confirmed.current && id.current) return id.current;
    setStage('creating');
    id.current ??= crypto.randomUUID();
    try {
      const created = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.current }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await created.json();
      if (!created.ok) {
        fail(result.error ?? dict.errors.failed);
        return null;
      }
    } catch {
      fail(dict.errors.failed);
      return null;
    }
    confirmed.current = true;
    setHasDraft(true);
    return id.current;
  }

  /**
   * Runs the whole flow for what the founder typed. Returns false without any
   * request when the address cannot be a website, so the caller can focus its field.
   */
  async function start(raw: string): Promise<boolean> {
    if (busy.current) return true;
    setError('');
    setServerError(false);
    setPartial(false);
    const website = normalizeWebsite(raw);
    if (!website) {
      setError(dict.errors.invalidUrl);
      return false;
    }
    busy.current = true;
    try {
      const draftId = await ensureDraft();
      if (!draftId) return true;
      setStage('reading');
      const response = await fetch(`/api/solutions/${draftId}/site-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website }),
        signal: AbortSignal.timeout(200000),
      });
      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({}));
        fail(result.error ?? dict.errors.failed);
        return true;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;
      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as {
            stage: string;
            pages?: number;
            partial?: boolean;
            code?: ErrorCode;
          };
          if (event.stage === 'read') setPages(event.pages ?? 0);
          else if (event.stage === 'drafting') setStage('drafting');
          else if (event.stage === 'error') {
            finished = true;
            fail(dict.errors[event.code ?? 'failed'] ?? dict.errors.failed);
          } else if (event.stage === 'done') {
            finished = true;
            setStage('done');
            setPartial(Boolean(event.partial));
            router.push(`/account/solutions/${draftId}`);
          }
        }
      }
      if (!finished) fail(dict.errors.failed);
    } catch {
      fail(dict.errors.failed);
    } finally {
      busy.current = false;
    }
    return true;
  }

  return {
    stage,
    pages,
    error,
    setError,
    serverError,
    hasDraft,
    draftId: () => id.current,
    partial,
    working: stage !== null && stage !== 'done',
    start,
    ensureDraft,
  };
}

/** The four stages as a checklist, plus a live region that reads the current one. */
export function SiteDraftProgress({
  dict,
  stage,
  pages,
}: {
  dict: Dict;
  stage: SiteDraftStage | null;
  pages: number;
}) {
  const current = stage ? stages.indexOf(stage) : -1;
  const label = (item: SiteDraftStage) =>
    item === 'reading' && pages > 0 && current > 1
      ? pages === 1
        ? dict.stages.readOne
        : dict.stages.readMany.replace('{count}', String(pages))
      : dict.stages[item];
  return (
    <>
      {stage !== null && (
        <ol aria-label={dict.progressAria} className="mt-6 space-y-3">
          {stages.map((item, index) => {
            const state =
              index < current || stage === 'done' ? 'done' : index === current ? 'now' : 'next';
            return (
              <li
                key={item}
                className={`flex items-center gap-3 text-sm ${state === 'next' ? 'text-stone-400' : 'text-stone-700'}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-5 items-center justify-center rounded-full ${state === 'done' ? 'bg-[#E4EBFC] text-[#365DC4]' : state === 'now' ? 'bg-[#365DC4]/15' : 'bg-stone-100'}`}
                >
                  {state === 'done' ? (
                    <CheckIcon className="size-3" />
                  ) : state === 'now' ? (
                    <span className="size-2 animate-pulse rounded-full bg-[#365DC4] motion-reduce:animate-none" />
                  ) : null}
                </span>
                {label(item)}
              </li>
            );
          })}
        </ol>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {stage ? label(stage) : ''}
      </p>
    </>
  );
}
