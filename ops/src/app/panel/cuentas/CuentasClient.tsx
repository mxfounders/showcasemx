'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AccountDrawer from './AccountDrawer';

interface AccountItem {
  id: string; email: string; name: string | null; organization: string | null;
  createdAt: string; emailVerifiedAt: string | null; suspendedAt: string | null;
  solutionCount: number; publishedCount: number; pendingCount: number;
  contactsSent: number; contactsReceived: number; activeSessions: number; isOps: boolean;
}

const PAGE_SIZE = 30;

export default function CuentasClient() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [items, setItems] = useState<AccountItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('account'));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('q', search);
      const res = await fetch(`/api/accounts?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al cargar.'); return; }
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
    } catch {
      setError('No se pudo conectar.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Cuentas</h1>
          <span className="text-xs text-stone-400">{total} en total</span>
        </div>
        <input
          type="search" placeholder="Buscar por correo, nombre o empresa…" value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-64 sm:w-80 px-4 py-1.5 text-[13px] rounded-full border border-stone-200/70 bg-white shadow-sm outline-none focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/10 transition"
        />
      </header>

      <div className="p-8 space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Cuenta</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Soluciones</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Contactos</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Sesiones</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-stone-400 text-sm">Cargando…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-stone-400 text-sm">Sin resultados.</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-stone-900">{item.name ?? item.email}</p>
                      <p className="mt-0.5 text-xs text-stone-400">{item.email}{item.organization ? ` · ${item.organization}` : ''}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">{item.solutionCount} ({item.publishedCount} públicas)</td>
                    <td className="px-5 py-4 text-sm text-stone-500">{item.contactsSent}↑ / {item.contactsReceived}↓</td>
                    <td className="px-5 py-4 text-sm text-stone-500">{item.activeSessions}</td>
                    <td className="px-5 py-4">
                      {item.suspendedAt ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Suspendida</span>
                      ) : item.isOps ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e4ebfc] text-[#365dc4]">Ops</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-500">Activa</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => setSelectedId(item.id)} className="px-3 py-1.5 rounded-lg bg-[#e4ebfc] text-[#365dc4] text-xs font-semibold hover:bg-[#d1dfff] transition-colors">
                        Ver →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 text-sm font-medium text-stone-600 disabled:opacity-40 hover:border-[#3562cc] hover:text-[#365dc4] transition">← Anterior</button>
            <span className="text-sm text-stone-400">Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button disabled={!hasMore} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 text-sm font-medium text-stone-600 disabled:opacity-40 hover:border-[#3562cc] hover:text-[#365dc4] transition">Siguiente →</button>
          </div>
        )}
      </div>

      <AccountDrawer accountId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
    </>
  );
}
