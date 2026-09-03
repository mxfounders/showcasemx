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
  createdAt: string; updatedAt: string; publishedAt: string | null; catalogKey: string | null;
  data: Record<string, unknown>;
  publishedData: Record<string, unknown> | null;
  ownerEmail: string; ownerId: string; ownerCreatedAt: string; ownerVerifiedAt: string | null;
}
interface Event { id: string; status: string; message: string; createdAt: string; actorEmail: string | null; }
interface MediaItem { id: string; width: number | null; height: number | null; }
interface ReportItem { id: string; reason: string; status: string; createdAt: string; }

interface Props {
  solutionId: string | null;
  onClose: () => void;
  onReviewed: () => void;
}

export default function ReviewDrawer({ solutionId, onClose, onReviewed }: Props) {
  const [solution, setSolution] = useState<SolutionDetail | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!solutionId) { setSolution(null); setEvents([]); setMedia([]); setReports([]); setMessage(''); setResult(null); return; }
    setLoadingDetail(true);
    fetch(`/api/solutions/${solutionId}`)
      .then(r => r.json())
      .then(d => {
        setSolution(d.solution ?? null);
        setEvents(d.events ?? []);
        setMedia(d.media ?? []);
        setReports(d.reports ?? []);
      })
      .catch(() => setSolution(null))
      .finally(() => setLoadingDetail(false));
  }, [solutionId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key !== 'Escape') return; if (lightbox) setLightbox(null); else onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, lightbox]);

  async function submitReview(action: string) {
    if (!solution) return;
    if (message.trim().length < 5) { setResult({ type: 'error', text: 'El mensaje debe tener al menos 5 caracteres.' }); return; }

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
        setTimeout(onReviewed, 900);
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
  const data = solution?.data ?? {};
  const founders = Array.isArray(data.founders) ? data.founders as Array<{ name?: string; role?: string; bio?: string }> : [];
  const links = Array.isArray(data.projectLinks) ? data.projectLinks as Array<{ label?: string; url?: string }> : [];
  const screenshots = Array.isArray(data.screenshots) ? data.screenshots as Array<{ id: string; caption?: string }> : [];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={onClose} />}

      <aside
        className={`fixed top-0 right-0 bottom-0 w-full max-w-[640px] bg-white z-[60] flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-modal="true" role="dialog" aria-label="Detalle de postulación"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-stone-200 flex-shrink-0">
          <h2 className="text-base font-bold truncate">
            {loadingDetail ? 'Cargando…' : (data.name as string) ?? 'Detalle de postulación'}
          </h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors flex-shrink-0" aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingDetail ? (
            <div className="text-center py-16 text-stone-400">Cargando detalle…</div>
          ) : !solution ? (
            <div className="text-center py-16 text-red-500">Error al cargar la postulación.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Estado">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[solution.status] ?? ''}`}>
                    {STATUS_LABELS[solution.status] ?? solution.status}
                  </span>
                </Field>
                <Field label="Versión">{solution.version}</Field>
                <Field label="Propietario">{solution.ownerEmail}</Field>
                <Field label="Proyecto vinculado">{solution.catalogKey ?? <span className="text-stone-400 italic">—</span>}</Field>
                <Field label="Creada">{fmtDate(solution.createdAt)}</Field>
                <Field label="Publicada">{solution.publishedAt ? fmtDate(solution.publishedAt) : <span className="text-stone-400 italic">—</span>}</Field>
                <Field label="Email verificado">{solution.ownerVerifiedAt ? fmtDate(solution.ownerVerifiedAt) : <span className="text-stone-400 italic">No verificado</span>}</Field>
                <Field label="Publicación previa">{solution.publishedData !== null ? 'Sí' : 'No'}</Field>
              </div>

              {reports.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700 mb-1">{reports.length} reporte(s)</p>
                  <p className="text-xs text-red-600">{reports.map(r => r.reason).join(', ')}</p>
                </div>
              )}

              <hr className="border-stone-200" />

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Información de la ficha</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ['Nombre', data.name], ['Tipo', data.type],
                    ['Categorías', Array.isArray(data.categories) ? (data.categories as string[]).join(', ') : data.category],
                    ['Problema', data.problem], ['Audiencia', data.audience], ['Sitio web', data.website],
                    ['Demo', data.demoUrl], ['No es para', data.notFor],
                    ['Alcance', data.scope], ['Precios', data.pricing], ['Implementación', data.implementation],
                    ['Integraciones', data.integrations], ['Soporte', data.support],
                    ['Evidencia', data.evidence], ['Enlace de evidencia', data.evidenceUrl],
                  ] as [string, unknown][]).map(([label, value]) => (
                    <Field key={label} label={label}>{value ? String(value) : <span className="text-stone-400 italic">—</span>}</Field>
                  ))}
                </div>
              </div>

              {screenshots.length > 0 && (
                <>
                  <hr className="border-stone-200" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Capturas ({screenshots.length})</p>
                    <div className="grid grid-cols-2 gap-3">
                      {screenshots.map(shot => {
                        const owned = media.find(m => m.id === shot.id);
                        if (!owned) return null;
                        return (
                          <button key={shot.id} type="button" onClick={() => setLightbox(shot.id)} className="text-left group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/media/${shot.id}`} alt={shot.caption ?? ''} className="w-full aspect-video object-cover rounded-lg border border-stone-200 group-hover:opacity-90 transition" />
                            {shot.caption && <p className="mt-1 text-xs text-stone-500 truncate">{shot.caption}</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {founders.length > 0 && (
                <>
                  <hr className="border-stone-200" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Fundadores</p>
                    <div className="space-y-3">
                      {founders.map((f, i) => (
                        <div key={i} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                          <p className="text-sm font-semibold text-stone-800">{f.name} {f.role && <span className="font-normal text-stone-400">· {f.role}</span>}</p>
                          {f.bio && <p className="mt-1 text-xs text-stone-500">{f.bio}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {links.length > 0 && (
                <>
                  <hr className="border-stone-200" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Enlaces del proyecto</p>
                    <div className="flex flex-wrap gap-2">
                      {links.map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition">
                          {l.label ?? l.url}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {events.length > 0 && (
                <>
                  <hr className="border-stone-200" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Historial ({events.length})</p>
                    <div className="space-y-2">
                      {events.map(ev => (
                        <div key={ev.id} className="flex gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                          <div className="w-2 h-2 rounded-full bg-[#3562cc] flex-shrink-0 mt-1.5" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[ev.status] ?? 'bg-stone-100 text-stone-600'}`}>
                                {STATUS_LABELS[ev.status] ?? ev.status}
                              </span>
                              <span className="text-sm text-stone-600">{ev.message}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-stone-400">
                              {ev.actorEmail ?? 'sistema'} · {fmtDate(ev.createdAt)}
                            </p>
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

        {solution && (isPending || isPublished) && (
          <div className="flex-shrink-0 border-t border-stone-200 p-6 space-y-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Mensaje para el fundador (obligatorio, visible en su historial)…"
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15"
            />
            {result && (
              <div className={`px-3 py-2 rounded-lg text-sm ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {isPending && (
                <>
                  <button disabled={submitting} onClick={() => submitReview('publish')} className="px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition disabled:opacity-50">Publicar</button>
                  <button disabled={submitting} onClick={() => submitReview('changes_requested')} className="px-4 py-2 rounded-full bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100 transition disabled:opacity-50">Pedir cambios</button>
                  <button disabled={submitting} onClick={() => submitReview('reject')} className="px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50">Rechazar</button>
                </>
              )}
              {isPublished && (
                <button disabled={submitting} onClick={() => submitReview('withdraw')} className="px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50">Retirar publicación</button>
              )}
            </div>
          </div>
        )}
      </aside>

      {lightbox && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${lightbox}`} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <div className="text-sm text-stone-800 break-words">{children}</div>
    </div>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
