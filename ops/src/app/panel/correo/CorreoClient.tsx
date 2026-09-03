'use client';

import { useState, useEffect, useCallback } from 'react';

interface MailItem { id: string; category: string; title: string; emailState: string; attempts: number; nextAttemptAt: string; createdAt: string; ownerEmail: string; }

export default function CorreoClient() {
  const [items, setItems] = useState<MailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/mail')
      .then(r => r.json())
      .then(d => { if (d.ok) setItems(d.items ?? []); else setError(d.error ?? 'Error al cargar.'); })
      .catch(() => setError('No se pudo conectar.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function retry(id: string) {
    setBusyId(id);
    try {
      const res = await fetch('/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retry', id }) });
      if (res.ok) load();
    } finally { setBusyId(null); }
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Correo</h1>
      </header>
      <div className="p-8">
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Aviso</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Destinatario</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Estado</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Intentos</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-stone-400 text-sm">Cargando…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-16 text-center text-stone-400 text-sm">Sin avisos pendientes o fallidos.</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-stone-800">{item.title}</p>
                      <p className="text-xs text-stone-400">{item.category} · {fmtDate(item.createdAt)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">{item.ownerEmail}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.emailState === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.emailState}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">{item.attempts}</td>
                    <td className="px-5 py-4">
                      <button disabled={busyId === item.id} onClick={() => retry(item.id)} className="px-3 py-1.5 rounded-lg bg-[#e4ebfc] text-[#365dc4] text-xs font-semibold hover:bg-[#d1dfff] transition-colors disabled:opacity-50">Reintentar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
