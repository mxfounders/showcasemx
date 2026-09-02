'use client';

import { useState, useEffect } from 'react';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', published: 'Publicada', rejected: 'Rechazada',
  changes_requested: 'Con cambios', draft: 'Borrador',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  changes_requested: 'bg-violet-100 text-violet-700',
  draft: 'bg-stone-100 text-stone-600',
};

interface SolutionDetail {
  id: string; status: string; version: number; step: number;
  createdAt: string; updatedAt: string; data: Record<string, unknown>;
  publishedData: Record<string, unknown> | null;
  ownerEmail: string; ownerId: string; ownerCreatedAt: string; ownerVerifiedAt: string | null;
}

interface Event { id: string; status: string; message: string; createdAt: string; }

interface Props {
  solutionId: string | null;
  onClose: () => void;
  onReviewed: () => void;
}

export default function ReviewDrawer({ solutionId, onClose, onReviewed }: Props) {
  const [solution, setSolution] = useState<SolutionDetail | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [screenshotCount, setScreenshotCount] = useState(0);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!solutionId) { setSolution(null); setEvents([]); setMessage(''); setResult(null); return; }
    setLoadingDetail(true);
    fetch(`/api/solutions/${solutionId}`)
      .then(r => r.json())
      .then(d => {
        setSolution(d.solution ?? null);
        setEvents(d.events ?? []);
        setScreenshotCount(d.screenshotCount ?? 0);
      })
      .catch(() => setSolution(null))
      .finally(() => setLoadingDetail(false));
  }, [solutionId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submitReview(action: string) {
    if (!solution) return;
    if (message.trim().length < 5) { setResult({ type: 'error', text: 'El mensaje debe tener al menos 5 caracteres.' }); return; }

    const labels: Record<string, string> = { publish: 'publicar', reject: 'rechazar', changes_requested: 'pedir cambios en', withdraw: 'retirar' };
    if (!confirm(`¿Confirmas ${labels[action] ?? action} esta postulación?`)) return;

    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionId: solution.id, action, message: message.trim(), version: solution.version }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ type: 'success', text: `Listo: postulación ${STATUS_LABELS[data.newStatus]?.toLowerCase() ?? data.newStatus}.` });
        setTimeout(onReviewed, 1000);
      } else {
        setResult({ type: 'error', text: data.error ?? 'Error al procesar.' });
      }
    } catch {
      setResult({ type: 'error', text: 'Error de red.' });
    } finally {
      setSubmitting(false);
    }
  }

  const isOpen = !!solutionId;
  const isPending = solution && ['pending', 'changes_requested'].includes(solution.status);
  const isPublished = solution?.status === 'published';

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full max-w-[640px] bg-white z-[60] flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-modal="true"
        role="dialog"
        aria-label="Detalle de postulación"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-stone-200 flex-shrink-0">
          <h2 className="text-base font-bold truncate">
            {loadingDetail ? 'Cargando…' : (solution?.data?.name as string) ?? 'Detalle de postulación'}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingDetail ? (
            <div className="text-center py-16 text-stone-400">Cargando detalle…</div>
          ) : !solution ? (
            <div className="text-center py-16 text-red-500">Error al cargar la postulación.</div>
          ) : (
            <>
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Estado">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[solution.status] ?? ''}`}>
                    {STATUS_LABELS[solution.status] ?? solution.status}
                  </span>
                </Field>
                <Field label="Versión">{solution.version}</Field>
                <Field label="Propietario">{solution.ownerEmail}</Field>
                <Field label="Capturas">{screenshotCount}</Field>
                <Field label="Creada">{fmtDate(solution.createdAt)}</Field>
                <Field label="Actualizada">{fmtDate(solution.updatedAt)}</Field>
                <Field label="Email verificado">{solution.ownerVerifiedAt ? fmtDate(solution.ownerVerifiedAt) : <span className="text-stone-400 italic">No verificado</span>}</Field>
                <Field label="Publicación previa">{solution.publishedData !== null ? 'Sí' : 'No'}</Field>
              </div>

              <hr className="border-stone-200" />

              {/* Solution data */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Información de la ficha</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ['Nombre', solution.data?.name],
                    ['Tipo', solution.data?.type],
                    ['Categorías', Array.isArray(solution.data?.categories) ? (solution.data.categories as string[]).join(', ') : solution.data?.category],
                    ['Problema', solution.data?.problem],
                    ['Audiencia', solution.data?.audience],
                    ['Sitio web', solution.data?.website],
                    ['Alcance', solution.data?.scope],
                    ['Precios', solution.data?.pricing],
                    ['Implementación', solution.data?.implementation],
                    ['Integraciones', solution.data?.integrations],
                    ['Soporte', solution.data?.support],
                    ['Evidencia', solution.data?.evidence],
                  ] as [string, unknown][]).map(([label, value]) => (
                    <Field key={label} label={label}>
                      {value ? String(value) : <span className="text-stone-400 italic">—</span>}
                    </Field>
                  ))}
                </div>
              </div>

              {/* Event history */}
              {events.length > 0 && (
                <>
                  <hr className="border-stone-200" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Historial ({events.length})</p>
                    <div className="space-y-2">
                      {events.map(ev => (
                        <div key={ev.id} className="flex gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                          <div className="w-2 h-2 rounded-full bg-[#3562cc] flex-shrink-0 mt-1.5" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[ev.status] ?? 'bg-stone-100 text-stone-600'}`}>
                                {STATUS_LABELS[ev.status] ?? ev.status}
                              </span>
                              <span className="text-sm text-stone-600">{ev.message}</span>
                            </div>
                            <p className="text-xs text-stone-400 mt-1">{fmtDate(ev.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Actions footer */}
        {solution && (
          <div className="flex-shrink-0 border-t border-stone-200 bg-stone-50 p-5 space-y-3">
            <p className="text-xs font-semibold text-stone-500">Decisión editorial</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escribe un comentario o razón (mínimo 5 caracteres)…"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm resize-none h-20 outline-none focus:border-[#3562cc] transition bg-white"
            />
            <div className="flex gap-2 flex-wrap">
              {isPending && (
                <button
                  disabled={submitting}
                  onClick={() => submitReview('publish')}
                  className="flex-1 min-w-[110px] px-3 py-2 rounded-lg bg-green-100 border border-green-200 text-green-800 text-sm font-semibold disabled:opacity-50 hover:bg-green-200 transition-colors"
                >
                  ✓ Aprobar
                </button>
              )}
              {solution.status === 'pending' && (
                <button
                  disabled={submitting}
                  onClick={() => submitReview('changes_requested')}
                  className="flex-1 min-w-[110px] px-3 py-2 rounded-lg bg-violet-100 border border-violet-200 text-violet-800 text-sm font-semibold disabled:opacity-50 hover:bg-violet-200 transition-colors"
                >
                  ↩ Pedir cambios
                </button>
              )}
              {isPending && (
                <button
                  disabled={submitting}
                  onClick={() => submitReview('reject')}
                  className="flex-1 min-w-[110px] px-3 py-2 rounded-lg bg-red-100 border border-red-200 text-red-800 text-sm font-semibold disabled:opacity-50 hover:bg-red-200 transition-colors"
                >
                  ✕ Rechazar
                </button>
              )}
              {isPublished && (
                <button
                  disabled={submitting}
                  onClick={() => submitReview('withdraw')}
                  className="flex-1 min-w-[110px] px-3 py-2 rounded-lg bg-stone-100 border border-stone-300 text-stone-600 text-sm font-semibold disabled:opacity-50 hover:bg-stone-200 transition-colors"
                >
                  ↓ Retirar publicación
                </button>
              )}
            </div>
            {result && (
              <div className={`p-3 rounded-lg text-sm ${result.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {result.text}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{label}</p>
      <p className="text-sm text-stone-800 leading-snug break-words">{children}</p>
    </div>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
