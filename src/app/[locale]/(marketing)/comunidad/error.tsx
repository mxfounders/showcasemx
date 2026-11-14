'use client';
import { useEffect } from 'react';
import { actionButtonStyle } from '@/lib/brand-colors';
import { reportError } from '@/lib/analytics/client';
export default function CommunityError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">No pudimos cargar las listas.</h1>
      <p className="mt-4 text-stone-500">Intenta de nuevo en un momento.</p>
      <button
        type="button"
        onClick={reset}
        style={actionButtonStyle}
        className="action-button mt-7 rounded-full px-5 py-3 text-sm"
      >
        Volver a intentar
      </button>
    </div>
  );
}
