'use client';

import { useState, useEffect, useCallback } from 'react';

interface Reviewer {
  id: string; email: string; createdAt: string; isReviewer: boolean;
}

export default function ReviewersPage() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Re-use users endpoint (first page is enough for reviewers since there are very few)
      const res = await fetch('/api/users?page=1');
      const data = await res.json();
      const list = (data.items ?? []).filter((u: { isReviewer: boolean }) => u.isReviewer);
      setReviewers(list);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setAdding(true);
    setResult(null);
    try {
      const res = await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, action: 'add' }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ type: 'success', text: data.message ?? 'Revisor agregado.' });
        setEmailInput('');
        load();
      } else {
        setResult({ type: 'error', text: data.error ?? 'Error al agregar.' });
      }
    } catch {
      setResult({ type: 'error', text: 'Error de red.' });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(email: string) {
    if (!confirm(`¿Seguro que quieres quitar a ${email} como revisor(a)?`)) return;
    
    setResult(null);
    try {
      const res = await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'remove' }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ type: 'success', text: data.message ?? 'Revisor quitado.' });
        load();
      } else {
        setResult({ type: 'error', text: data.error ?? 'Error al quitar.' });
      }
    } catch {
      setResult({ type: 'error', text: 'Error de red.' });
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Revisores autorizados</h1>
      </header>

      <div className="p-8 max-w-4xl">
        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
          <h2 className="text-sm font-bold text-stone-800 mb-2">Asignar nuevo revisor</h2>
          <p className="text-sm text-stone-500 mb-4">La cuenta debe estar previamente registrada en shwcs.site.</p>
          
          <form onSubmit={handleAdd} className="flex gap-3 flex-wrap items-end">
            <label className="flex-1 min-w-[240px] flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Correo de la cuenta</span>
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="px-4 py-2.5 rounded-lg border border-stone-300 text-sm outline-none focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15 transition bg-white"
              />
            </label>
            <button
              type="submit"
              disabled={adding}
              className="px-5 py-2.5 rounded-lg bg-[#e4ebfc] text-[#365dc4] font-semibold text-sm hover:bg-[#d1dfff] transition disabled:opacity-50"
            >
              {adding ? 'Agregando…' : '+ Agregar'}
            </button>
          </form>

          {result && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${result.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {result.text}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Cuenta</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Miembro desde</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-stone-400">Cargando…</td></tr>
              ) : reviewers.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-stone-400">No hay revisores asignados.</td></tr>
              ) : reviewers.map(r => (
                <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-stone-800">{r.email}</td>
                  <td className="px-5 py-4 text-stone-500">{fmtDate(r.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleRemove(r.email)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
