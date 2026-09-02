'use client';

import { useState, useEffect, useCallback } from 'react';
import ReviewDrawer from './ReviewDrawer';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', published: 'Publicada', rejected: 'Rechazada',
  changes_requested: 'Con cambios', draft: 'Borrador', all: 'Todas',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  changes_requested: 'bg-violet-100 text-violet-700',
  draft: 'bg-stone-100 text-stone-600',
};

interface SolutionItem {
  id: string; status: string; version: number;
  updatedAt: string; createdAt: string; solutionName: string;
  category: string; ownerEmail: string; ownerId: string;
  hasPublished: boolean; eventCount: number;
}

interface Props {
  defaultStatus?: string;
  title: string;
  showAllStatuses?: boolean;
}

export default function SolutionsQueue({ defaultStatus = 'pending', title, showAllStatuses = false }: Props) {
  const [status, setStatus] = useState(defaultStatus);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [items, setItems] = useState<SolutionItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, page: String(page) });
      if (search) params.set('q', search);
      const res = await fetch(`/api/solutions?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setHasMore(data.hasMore ?? false);
      setStatusCounts(data.statusCounts ?? {});
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [status, page, search]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filterTabs = showAllStatuses
    ? ['all', 'pending', 'changes_requested', 'published', 'rejected', 'draft']
    : ['pending', 'changes_requested'];

  return (
    <>
      <header className="sticky top-0 z-40 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[16px] font-bold tracking-tight text-stone-800">{title}</h1>
          {/* Pending badge */}
          {(statusCounts.pending ?? 0) + (statusCounts.changes_requested ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#3562cc] text-white text-[10px] font-bold">
              {(statusCounts.pending ?? 0) + (statusCounts.changes_requested ?? 0)}
            </span>
          )}
        </div>
        <input
          type="search"
          placeholder="Buscar postulaciones…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-48 sm:w-64 px-4 py-1.5 text-[13px] rounded-full border border-stone-200/70 bg-white shadow-sm outline-none focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/10 transition"
        />
      </header>

      <div className="p-8 space-y-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterTabs.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition
                ${status === s
                  ? 'bg-[#e4ebfc] border-[#e4ebfc] text-[#365dc4] font-semibold'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-[#3562cc] hover:text-[#365dc4]'
                }`}
            >
              {STATUS_LABELS[s] ?? s}
              {s !== 'all' && statusCounts[s] ? (
                <span className="ml-1.5 text-xs opacity-70">({statusCounts[s]})</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Solución</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Estado</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Propietario</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400 whitespace-nowrap">Actualizada</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Eventos</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-stone-400 text-sm">Cargando…</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="text-stone-400 space-y-1">
                        <svg className="w-10 h-10 mx-auto opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2"/>
                        </svg>
                        <p className="text-sm">Sin postulaciones en este filtro</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-stone-900">{item.solutionName}</p>
                      {item.category && <p className="text-xs text-stone-400 mt-0.5">{item.category}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[item.status] ?? 'bg-stone-100 text-stone-600'}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">{item.ownerEmail}</td>
                    <td className="px-5 py-4 text-sm text-stone-400 whitespace-nowrap">{fmtDate(item.updatedAt)}</td>
                    <td className="px-5 py-4 text-sm text-stone-400">{item.eventCount}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedId(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#e4ebfc] text-[#365dc4] text-xs font-semibold hover:bg-[#d1dfff] transition-colors"
                      >
                        Revisar →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 text-sm font-medium text-stone-600 disabled:opacity-40 hover:border-[#3562cc] hover:text-[#365dc4] transition"
            >
              ← Anterior
            </button>
            <span className="text-sm text-stone-400">Página {page}</span>
            <button
              disabled={!hasMore}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 text-sm font-medium text-stone-600 disabled:opacity-40 hover:border-[#3562cc] hover:text-[#365dc4] transition"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Review drawer */}
      <ReviewDrawer
        solutionId={selectedId}
        onClose={() => setSelectedId(null)}
        onReviewed={() => { setSelectedId(null); load(); }}
      />
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
