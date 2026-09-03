'use client';

import { useState, useEffect, useCallback } from 'react';

interface Entry {
  id: string; actorEmail: string; action: string; subjectType: string; subjectId: string;
  reason: string; metadata: Record<string, unknown>; ip: string | null; createdAt: string;
}

export default function BitacoraClient() {
  const [items, setItems] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(async (nextCursor: string | null, append: boolean) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (nextCursor) params.set('cursor', nextCursor);
      if (actionFilter) params.set('action', actionFilter);
      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al cargar.'); return; }
      setItems(prev => (append ? [...prev, ...(data.items ?? [])] : (data.items ?? [])));
      setHasMore(data.hasMore ?? false);
      setCursor(data.nextCursor ?? null);
    } catch {
      setError('No se pudo conectar.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => { load(null, false); }, [load]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center justify-between gap-4">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Bitácora</h1>
        <input
          type="text" placeholder="Filtrar por acción (ej. suspend)" value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="w-64 px-4 py-1.5 text-[13px] rounded-full border border-stone-200/70 bg-white shadow-sm outline-none focus:border-[#3562cc]"
        />
      </header>
      <div className="p-8 space-y-3">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {items.length === 0 && !loading ? (
          <p className="text-sm text-stone-400 py-10 text-center">Sin registros.</p>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
            {items.map(e => (
              <div key={e.id} className="px-5 py-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-semibold text-stone-800">{e.actorEmail}</span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">{e.action}</span>
                    <span className="text-xs text-stone-400 truncate">{e.subjectType}:{e.subjectId.slice(0, 12)}</span>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(e.createdAt)}</span>
                </div>
                {e.reason && <p className="mt-1 text-xs text-stone-500">{e.reason}</p>}
              </div>
            ))}
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <button disabled={loading} onClick={() => load(cursor, true)} className="px-4 py-2 rounded-full border border-stone-200 text-sm font-medium text-stone-600 hover:border-[#3562cc] hover:text-[#365dc4] transition disabled:opacity-50">
              {loading ? 'Cargando…' : 'Ver más'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
