'use client';

import { useState, useEffect, useCallback } from 'react';
import UserDrawer from '../UserDrawer';

interface UserItem {
  id: string; email: string; createdAt: string; emailVerifiedAt: string | null;
  solutionCount: number; publishedCount: number; pendingCount: number;
  contactsSent: number; contactsReceived: number; activeSessions: number; isReviewer: boolean;
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [items, setItems] = useState<UserItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('q', search);
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setHasMore(data.hasMore ?? false);
      setTotal(data.total ?? 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-semibold">Usuarios registrados</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-xs font-semibold">
            {total}
          </span>
        </div>
        <input
          type="search"
          placeholder="Buscar por correo…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-56 px-3 py-1.5 text-sm rounded-lg border border-stone-200 bg-stone-50 outline-none focus:border-[#3562cc] focus:bg-white transition"
        />
      </header>

      <div className="p-8">
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Cuenta</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400 whitespace-nowrap">Registro</th>
                  <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400">Verificado</th>
                  <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400">Postulaciones</th>
                  <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400">Contactos recibidos</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Rol</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-stone-400">Cargando…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-stone-400">No se encontraron usuarios.</td></tr>
                ) : items.map(user => (
                  <tr key={user.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-stone-800">{user.email}</td>
                    <td className="px-5 py-3 text-stone-500 whitespace-nowrap">{fmtDate(user.createdAt)}</td>
                    <td className="px-5 py-3 text-center">{user.emailVerifiedAt ? '✓' : '—'}</td>
                    <td className="px-5 py-3 text-center text-stone-600">
                      {user.solutionCount > 0 ? (
                        <span>{user.solutionCount} <span className="text-green-600 font-medium ml-1">({user.publishedCount} pub)</span></span>
                      ) : '0'}
                    </td>
                    <td className="px-5 py-3 text-center text-stone-600">{user.contactsReceived}</td>
                    <td className="px-5 py-3">
                      {user.isReviewer 
                        ? <span className="px-2 py-0.5 rounded-full bg-[#e4ebfc] text-[#365dc4] text-xs font-semibold">Revisor</span>
                        : <span className="text-stone-400 text-xs">Estándar</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelectedId(user.id)}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-xs font-medium hover:border-[#3562cc] hover:text-[#365dc4] transition-colors"
                      >
                        Ver perfil
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
          <div className="flex items-center justify-center gap-3 pt-6">
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

      <UserDrawer userId={selectedId} onClose={() => { setSelectedId(null); load(); }} />
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
