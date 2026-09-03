'use client';

import { useState, useEffect, useCallback } from 'react';
import ReasonDialog from '@/components/ReasonDialog';

interface Member {
  id: string; email: string; level: 'reviewer' | 'admin'; createdAt: string;
  disabledAt: string | null; totpConfirmed: boolean; lastSeenAt: string | null; grantedByEmail: string | null;
}

type Dialog = { action: string; id: string; title: string; description?: string; destructive?: boolean; level?: string };

export default function EquipoClient() {
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/team')
      .then(r => r.json())
      .then(d => { if (d.ok) setItems(d.items ?? []); else setError(d.error ?? 'Error al cargar.'); })
      .catch(() => setError('No se pudo conectar.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setAdding(true);
    setAddResult(null);
    try {
      const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', email: emailInput.trim(), reason: 'Alta de nuevo miembro de ops.' }) });
      const data = await res.json();
      if (data.ok) { setAddResult({ type: 'success', text: data.message ?? 'Agregado.' }); setEmailInput(''); load(); }
      else setAddResult({ type: 'error', text: data.error ?? 'Error.' });
    } catch { setAddResult({ type: 'error', text: 'Error de red.' }); } finally { setAdding(false); }
  }

  async function runAction(reason: string): Promise<string | null> {
    if (!dialog) return 'Sin acción.';
    try {
      const res = await fetch('/api/team', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: dialog.action, accountId: dialog.id, level: dialog.level, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) return json.error ?? 'Error al aplicar.';
      setDialog(null);
      load();
      return null;
    } catch { return 'Error de red.'; }
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Equipo</h1>
      </header>
      <div className="p-8 space-y-6">
        <form onSubmit={handleAdd} className="flex items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <label className="flex-1 flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-stone-500">Agregar por correo (debe tener cuenta existente)</span>
            <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="persona@ejemplo.com"
              className="px-3 py-2 rounded-lg border border-stone-300 text-sm outline-none focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15" />
          </label>
          <button type="submit" disabled={adding} className="px-4 py-2 rounded-full bg-[#e4ebfc] text-[#365dc4] text-sm font-semibold hover:bg-[#d1dfff] transition disabled:opacity-50">
            {adding ? 'Agregando…' : 'Agregar'}
          </button>
        </form>
        {addResult && <p className={`text-sm ${addResult.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{addResult.text}</p>}

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Miembro</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Nivel</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Autenticador</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Último acceso</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-stone-400 text-sm">Cargando…</td></tr>
                ) : items.map(m => (
                  <tr key={m.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-medium text-stone-800">{m.email}</p>
                      {m.disabledAt && <p className="text-xs text-red-500">Deshabilitado</p>}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={m.level}
                        onChange={e => setDialog({ action: 'set_level', id: m.id, level: e.target.value, title: `Cambiar nivel de ${m.email}` })}
                        className="rounded-lg border border-stone-200 px-2 py-1 text-xs"
                      >
                        <option value="reviewer">Revisor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {m.totpConfirmed ? <span className="text-green-600">Configurado</span> : <span className="text-amber-600">Pendiente</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-400">{m.lastSeenAt ? fmtDate(m.lastSeenAt) : '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        <button onClick={() => setDialog({ action: 'reset_totp', id: m.id, title: `Reiniciar autenticador de ${m.email}` })} className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold hover:bg-stone-200 transition">Reset 2FA</button>
                        {m.disabledAt ? (
                          <button onClick={() => setDialog({ action: 'enable', id: m.id, title: `Reactivar a ${m.email}` })} className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition">Reactivar</button>
                        ) : (
                          <button onClick={() => setDialog({ action: 'disable', id: m.id, title: `Deshabilitar a ${m.email}`, destructive: true })} className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition">Deshabilitar</button>
                        )}
                        <button onClick={() => setDialog({ action: 'remove', id: m.id, title: `Quitar a ${m.email} de ops`, destructive: true })} className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition">Quitar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ReasonDialog open={!!dialog} title={dialog?.title ?? ''} description={dialog?.description} confirmLabel="Confirmar" destructive={dialog?.destructive} onCancel={() => setDialog(null)} onConfirm={runAction} />
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
