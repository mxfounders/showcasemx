'use client';

import { useState, useEffect, useCallback } from 'react';

interface Inquiry {
  id: string; reason: string; name: string; email: string; organization: string; role: string | null;
  website: string | null; message: string; urgency: string; emailState: string; handledAt: string | null; createdAt: string;
}

const REASON_LABELS: Record<string, string> = {
  find: 'Buscar soluciones', submit: 'Postular', partnership: 'Alianza', press: 'Prensa', support: 'Soporte', other: 'Otro',
};

export default function MensajesClient() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch(`/api/inquiries${pendingOnly ? '?pending=1' : ''}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setItems(d.items ?? []); else setError(d.error ?? 'Error al cargar.'); })
      .catch(() => setError('No se pudo conectar.'))
      .finally(() => setLoading(false));
  }, [pendingOnly]);

  useEffect(() => { load(); }, [load]);

  async function markHandled(id: string) {
    setBusyId(id);
    try {
      const res = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (res.ok) load();
    } finally { setBusyId(null); }
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center justify-between">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Mensajes</h1>
        <label className="flex items-center gap-2 text-sm text-stone-500">
          <input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)} />
          Solo sin atender
        </label>
      </header>
      <div className="p-8 space-y-3">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {loading ? (
          <p className="text-sm text-stone-400 py-10 text-center">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-400 py-10 text-center">Sin mensajes.</p>
        ) : items.map(item => (
          <article key={item.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-900">{item.name} · {item.organization}</p>
                <p className="text-xs text-stone-400 mt-0.5">{item.email} · {REASON_LABELS[item.reason] ?? item.reason} · {item.urgency}</p>
              </div>
              <span className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(item.createdAt)}</span>
            </div>
            <p className="mt-3 text-sm text-stone-600 whitespace-pre-wrap">{item.message}</p>
            {item.website && <p className="mt-2 text-xs text-stone-400">{item.website}</p>}
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs ${item.emailState === 'sent' ? 'text-green-600' : item.emailState === 'failed' ? 'text-red-600' : 'text-stone-400'}`}>
                Correo: {item.emailState}
              </span>
              {!item.handledAt ? (
                <button disabled={busyId === item.id} onClick={() => markHandled(item.id)} className="px-3 py-1.5 rounded-full bg-[#e4ebfc] text-[#365dc4] text-xs font-semibold hover:bg-[#d1dfff] transition disabled:opacity-50">Marcar atendido</button>
              ) : (
                <span className="text-xs text-stone-400">Atendido {fmtDate(item.handledAt)}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
