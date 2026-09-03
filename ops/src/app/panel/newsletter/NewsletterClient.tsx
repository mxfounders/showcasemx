'use client';

import { useState, useEffect } from 'react';

interface Subscriber { email: string; consentVersion: string; profile: string | null; role: string | null; createdAt: string; unsubscribedAt: string | null; }

export default function NewsletterClient() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [active, setActive] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/newsletter?all=1')
      .then(r => r.json())
      .then(d => { if (d.ok) { setItems(d.items ?? []); setActive(d.active ?? 0); setTotal(d.total ?? 0); } else setError(d.error ?? 'Error al cargar.'); })
      .catch(() => setError('No se pudo conectar.'))
      .finally(() => setLoading(false));
  }, []);

  function exportCsv() {
    const header = 'email,consent_version,profile,role,created_at,unsubscribed_at';
    const rows = items.map(i => [i.email, i.consentVersion, i.profile ?? '', i.role ?? '', i.createdAt, i.unsubscribedAt ?? ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Newsletter</h1>
          <span className="text-xs text-stone-400">{active} activos de {total}</span>
        </div>
        <button onClick={exportCsv} disabled={loading || items.length === 0} className="px-3.5 py-1.5 rounded-full bg-[#e4ebfc] text-[#365dc4] text-xs font-semibold hover:bg-[#d1dfff] transition disabled:opacity-50">Exportar CSV</button>
      </header>
      <div className="p-8">
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stone-50">
                <tr className="border-b border-stone-200">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Correo</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Perfil</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Rol</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Suscrito</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-stone-400 text-sm">Cargando…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-16 text-center text-stone-400 text-sm">Sin suscriptores.</td></tr>
                ) : items.map(s => (
                  <tr key={s.email} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3 text-stone-800">{s.email}</td>
                    <td className="px-5 py-3 text-stone-500">{s.profile ?? '—'}</td>
                    <td className="px-5 py-3 text-stone-500">{s.role ?? '—'}</td>
                    <td className="px-5 py-3 text-stone-400 text-xs">{fmtDate(s.createdAt)}</td>
                    <td className="px-5 py-3">
                      {s.unsubscribedAt ? <span className="text-xs text-stone-400">Baja</span> : <span className="text-xs text-green-600">Activo</span>}
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
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
