'use client';
import { useEffect, useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
export function EmailVerification({
  verified = false,
  available = true,
  confirm = false,
  dict,
}: {
  verified?: boolean;
  available?: boolean;
  confirm?: boolean;
  dict: Dictionary['notifications']['verification'];
}) {
  const [token, setToken] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [done, setDone] = useState(verified);
  const lock = useRef(false),
    fragmentRead = useRef(false);
  useEffect(() => {
    if (confirm && !fragmentRead.current) {
      fragmentRead.current = true;
      setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [confirm]);
  return (
    <div>
      {done ? (
        <p role="status" className="text-sm text-[#416B50]">
          {dict.verified}
        </p>
      ) : (
        <>
          <button
            type="button"
            disabled={busy || (!confirm && !available) || (confirm && !token)}
            style={actionButtonStyle}
            className="action-button rounded-full px-5 py-3 text-sm disabled:opacity-50"
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError('');
              setMessage('');
              try {
                const r = await fetch('/api/account/verification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(confirm ? { action: 'confirm', token } : { action: 'send' }),
                  signal: AbortSignal.timeout(15000),
                });
                const data = await r.json();
                if (!r.ok) throw Error(data.error);
                if (confirm || data.verified) setDone(true);
                else setMessage(dict.sent);
              } catch (e) {
                setError(e instanceof Error ? e.message : dict.genericError);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? dict.pending : confirm ? dict.confirm : dict.send}
          </button>
          {!confirm && !available && (
            <p className="mt-3 text-xs text-stone-500">{dict.unavailable}</p>
          )}
          {confirm && !token && <p className="mt-3 text-sm text-stone-500">{dict.openLink}</p>}
        </>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-stone-500">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      {confirm && (
        <Link href="/account/settings/security" className="mt-6 block text-sm text-[#365DC4]">
          {dict.back}
        </Link>
      )}
    </div>
  );
}
