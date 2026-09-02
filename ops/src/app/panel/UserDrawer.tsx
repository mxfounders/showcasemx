'use client';

import { useState, useEffect } from 'react';

interface UserDetail {
  account: {
    id: string; email: string; createdAt: string; emailVerifiedAt: string | null;
    displayName: string | null; company: string | null; role: string | null; profileType: string | null;
    isReviewer: boolean; activeSessions: number; savedCount: number; listsCount: number;
  };
  solutions: Array<{
    id: string; name: string; status: string; category: string;
    version: number; updatedAt: string; createdAt: string; hasPublished: boolean;
  }>;
  contactsSent: Array<{
    id: string; status: string; projectName: string; createdAt: string; updatedAt: string;
  }>;
  contactsReceived: Array<{
    id: string; status: string; projectName: string; buyerEmail: string; createdAt: string;
  }>;
}

interface Props {
  userId: string | null;
  onClose: () => void;
}

export default function UserDrawer({ userId, onClose }: Props) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState('');

  useEffect(() => {
    if (!userId) { setData(null); setRevokeMsg(''); return; }
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); else setData(null); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleRevoke() {
    if (!data) return;
    if (!confirm('¿Seguro que quieres revocar todas las sesiones activas de esta cuenta? Tendrán que volver a iniciar sesión.')) return;
    
    setRevoking(true);
    setRevokeMsg('');
    try {
      const res = await fetch('/api/revoke-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: data.account.id }),
      });
      const resData = await res.json();
      if (resData.ok) {
        setRevokeMsg(`✓ ${resData.revokedCount} sesiones revocadas.`);
        setData(prev => prev ? { ...prev, account: { ...prev.account, activeSessions: 0 } } : null);
      } else {
        setRevokeMsg(`Error: ${resData.error}`);
      }
    } catch {
      setRevokeMsg('Error de red.');
    } finally {
      setRevoking(false);
    }
  }

  const isOpen = !!userId;

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={onClose} />}
      
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full max-w-[640px] bg-white z-[60] flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-stone-200 flex-shrink-0">
          <h2 className="text-base font-bold truncate">
            {loading ? 'Cargando…' : data?.account.email ?? 'Detalle de usuario'}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-16 text-stone-400">Cargando perfil…</div>
          ) : !data ? (
            <div className="text-center py-16 text-red-500">Error al cargar o usuario no encontrado.</div>
          ) : (
            <>
              {/* Account info */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="ID">{data.account.id}</Field>
                <Field label="Rol">{data.account.isReviewer ? <span className="text-[#3562cc] font-bold">Revisor(a)</span> : 'Usuario estándar'}</Field>
                <Field label="Registro">{fmtDate(data.account.createdAt)}</Field>
                <Field label="Verificado">{data.account.emailVerifiedAt ? fmtDate(data.account.emailVerifiedAt) : <span className="text-stone-400 italic">No</span>}</Field>
                <Field label="Perfil">{data.account.profileType ?? <span className="text-stone-400 italic">No creado</span>}</Field>
                <Field label="Nombre">{data.account.displayName ?? <span className="text-stone-400 italic">—</span>}</Field>
                <Field label="Empresa">{data.account.company ?? <span className="text-stone-400 italic">—</span>}</Field>
                <Field label="Cargo">{data.account.role ?? <span className="text-stone-400 italic">—</span>}</Field>
                <Field label="Sesiones activas">
                  <div className="flex items-center gap-2">
                    {data.account.activeSessions}
                    {data.account.activeSessions > 0 && (
                      <button onClick={handleRevoke} disabled={revoking} className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold uppercase hover:bg-red-200 transition">
                        {revoking ? 'Revocando…' : 'Revocar todas'}
                      </button>
                    )}
                  </div>
                  {revokeMsg && <p className="text-xs text-red-600 mt-1">{revokeMsg}</p>}
                </Field>
              </div>

              {/* Founder Solutions */}
              {data.solutions.length > 0 && (
                <>
                  <hr className="border-stone-200" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Postulaciones ({data.solutions.length})</p>
                    <div className="space-y-2">
                      {data.solutions.map(s => (
                        <div key={s.id} className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-sm flex justify-between items-center gap-4">
                          <div>
                            <p className="font-semibold text-stone-900">{s.name}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{s.status.toUpperCase()} · v{s.version}</p>
                          </div>
                          <span className="text-xs text-stone-400">{fmtDate(s.updatedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Contacts received */}
              {data.contactsReceived.length > 0 && (
                <>
                  <hr className="border-stone-200" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Contactos recibidos ({data.contactsReceived.length})</p>
                    <div className="space-y-2">
                      {data.contactsReceived.map(c => (
                        <div key={c.id} className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-sm">
                          <p className="font-medium text-stone-800">De: {c.buyerEmail}</p>
                          <p className="text-xs text-stone-500 mt-0.5">Proyecto: {c.projectName} · Estado: {c.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{label}</p>
      <div className="text-sm text-stone-800 leading-snug break-words">{children}</div>
    </div>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
