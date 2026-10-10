'use client';
import Link, { useRouter } from '@/i18n/navigation';
import { useRef, useState } from 'react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
function NotificationAction({
  body,
  label,
  dict,
}: {
  body: Record<string, unknown>;
  label: string;
  dict: Dictionary['notifications']['action'];
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const lock = useRef(false),
    router = useRouter();
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="action-button rounded-full px-4 py-2 text-xs disabled:opacity-50"
        style={actionButtonStyle}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError('');
          setSaved(false);
          try {
            const r = await fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (!r.ok) throw Error();
            setSaved(true);
            router.refresh();
          } catch {
            setError(dict.saveError);
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {busy ? dict.saving : label}
      </button>
      {saved && body.action === 'preferences' && (
        <p role="status" className="mt-2 text-xs text-[#406A50]">
          {dict.saved}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}
export function NotificationPreferences({
  contactEmail,
  solutionEmail,
  verified,
  emailAvailable,
  dict,
}: {
  contactEmail: boolean;
  solutionEmail: boolean;
  verified: boolean;
  emailAvailable: boolean;
  dict: Pick<Dictionary['notifications'], 'preferences' | 'action'>;
}) {
  const text = dict.preferences;
  const [contacts, setContacts] = useState(contactEmail),
    [solutions, setSolutions] = useState(solutionEmail);
  const [beforeLink, afterLink] = text.verifyHint.split('{link}');
  return (
    <div className="max-w-xl">
      <p className="mb-6 text-sm text-stone-500">{text.intro}</p>
      <div className="space-y-5">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={contacts}
            disabled={!verified && !contacts}
            onChange={e => setContacts(e.target.checked)}
            className="size-4 accent-[#365DC4]"
          />
          {text.contacts}
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={solutions}
            disabled={!verified && !solutions}
            onChange={e => setSolutions(e.target.checked)}
            className="size-4 accent-[#365DC4]"
          />
          {text.solutions}
        </label>
        <NotificationAction
          body={{ action: 'preferences', contactEmail: contacts, solutionEmail: solutions }}
          label={text.save}
          dict={dict.action}
        />
      </div>
      {!verified && (
        <p className="mt-5 text-sm text-stone-500">
          {beforeLink}
          <Link
            href="/account/settings/security"
            className="text-[#365DC4] underline underline-offset-4"
          >
            {text.verifyLink}
          </Link>
          {afterLink}
        </p>
      )}
      {!emailAvailable && <p className="mt-3 text-sm text-stone-500">{text.emailUnavailable}</p>}
    </div>
  );
}
