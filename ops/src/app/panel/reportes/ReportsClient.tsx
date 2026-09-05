'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SolutionReportItem {
  id: string; reason: string; details: string; status: string; decision: string | null;
  createdAt: string; resolvedAt: string | null; version: number;
  solutionId: string; solutionName: string; ownerEmail: string; reviewerEmail: string | null;
}

interface CommunityReportItem {
  id: string; subjectType: 'list' | 'comment'; reason: string; details: string; status: string; decision: string | null;
  createdAt: string; resolvedAt: string | null; version: number;
  listId: string; listName: string; curatorName: string; ownerEmail: string;
  commentId: string | null; commentBody: string | null; commentAuthorEmail: string | null;
  reviewerEmail: string | null;
}

const SOLUTION_REASON_LABELS: Record<string, string> = {
  misleading: 'Información engañosa', broken: 'No funciona', ownership: 'Problema de propiedad', abuse: 'Abuso',
};

const COMMUNITY_REASON_LABELS: Record<string, string> = {
  spam: 'Spam', abuse: 'Abuso', impersonation: 'Suplantación', other: 'Otro',
};

const STATUS_TABS = [
  { key: 'open', label: 'Abiertos' },
  { key: 'resolved', label: 'Resueltos' },
  { key: 'dismissed', label: 'Descartados' },
  { key: 'all', label: 'Todos' },
];

const DOMAINS = [
  { key: 'solutions', label: 'Fichas' },
  { key: 'community', label: 'Comunidad' },
] as const;

type Domain = typeof DOMAINS[number]['key'];

export default function ReportsClient() {
  const [domain, setDomain] = useState<Domain>('solutions');
  const [status, setStatus] = useState('open');
  const [solutionItems, setSolutionItems] = useState<SolutionReportItem[]>([]);
  const [communityItems, setCommunityItems] = useState<CommunityReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = domain === 'solutions' ? '/api/reports' : '/api/community-reports';
      const res = await fetch(`${endpoint}?status=${status}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al cargar.'); return; }
      if (domain === 'solutions') setSolutionItems(data.items ?? []);
      else setCommunityItems(data.items ?? []);
    } catch {
      setError('No se pudo conectar.');
    } finally {
      setLoading(false);
    }
  }, [domain, status]);

  useEffect(() => { load(); }, [load]);

  async function decideSolution(report: SolutionReportItem, decision: 'resolve' | 'dismiss' | 'withdraw') {
    if (message.trim().length < 10) { setFeedback({ id: report.id, type: 'error', text: 'Explica la decisión (mínimo 10 caracteres).' }); return; }
    setSubmitting(report.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, decision, message: message.trim(), version: report.version }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ id: report.id, type: 'success', text: 'Decisión aplicada.' });
        setMessage('');
        setTimeout(load, 800);
      } else {
        setFeedback({ id: report.id, type: 'error', text: data.error ?? 'Error al procesar.' });
      }
    } catch {
      setFeedback({ id: report.id, type: 'error', text: 'Error de red.' });
    } finally {
      setSubmitting(null);
    }
  }

  async function decideCommunity(report: CommunityReportItem, decision: 'resolve' | 'dismiss' | 'takedown') {
    if (message.trim().length < 10) { setFeedback({ id: report.id, type: 'error', text: 'Explica la decisión (mínimo 10 caracteres).' }); return; }
    setSubmitting(report.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/community-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, decision, message: message.trim(), version: report.version }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ id: report.id, type: 'success', text: 'Decisión aplicada.' });
        setMessage('');
        setTimeout(load, 800);
      } else {
        setFeedback({ id: report.id, type: 'error', text: data.error ?? 'Error al procesar.' });
      }
    } catch {
      setFeedback({ id: report.id, type: 'error', text: 'Error de red.' });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Reportes</h1>
      </header>
      <div className="p-8 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {DOMAINS.map(d => (
            <button key={d.key} onClick={() => { setDomain(d.key); setExpandedId(null); setFeedback(null); }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${domain === d.key ? 'bg-[#e4ebfc] border-[#e4ebfc] text-[#365dc4] font-semibold' : 'bg-white border-stone-200 text-stone-500 hover:border-[#3562cc] hover:text-[#365dc4]'}`}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${status === t.key ? 'bg-[#e4ebfc] border-[#e4ebfc] text-[#365dc4] font-semibold' : 'bg-white border-stone-200 text-stone-500 hover:border-[#3562cc] hover:text-[#365dc4]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {loading ? (
          <p className="text-sm text-stone-400 py-10 text-center">Cargando…</p>
        ) : domain === 'solutions' ? (
          solutionItems.length === 0 ? (
            <p className="text-sm text-stone-400 py-10 text-center">Sin reportes en este filtro.</p>
          ) : (
            <div className="space-y-3">
              {solutionItems.map(report => (
                <article key={report.id} className="rounded-xl border border-stone-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/panel/postulaciones?solution=${report.solutionId}`} className="text-sm font-semibold text-[#365dc4]">{report.solutionName}</Link>
                      <p className="mt-1 text-xs text-stone-400">{report.ownerEmail} · {SOLUTION_REASON_LABELS[report.reason] ?? report.reason}</p>
                    </div>
                    <span className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(report.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm text-stone-600 whitespace-pre-wrap">{report.details}</p>

                  {report.status !== 'open' && (
                    <p className="mt-3 text-xs text-stone-400">
                      {report.status === 'dismissed' ? 'Descartado' : 'Resuelto'} por {report.reviewerEmail ?? '—'}
                      {report.decision ? `: “${report.decision}”` : ''}
                    </p>
                  )}

                  {report.status === 'open' && (
                    <div className="mt-4 space-y-2">
                      {expandedId === report.id ? (
                        <>
                          <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={2}
                            placeholder="Explica la decisión…"
                            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15"
                          />
                          {feedback?.id === report.id && (
                            <p className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{feedback.text}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button disabled={submitting === report.id} onClick={() => decideSolution(report, 'resolve')} className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition disabled:opacity-50">Resolver</button>
                            <button disabled={submitting === report.id} onClick={() => decideSolution(report, 'withdraw')} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50">Retirar publicación</button>
                            <button disabled={submitting === report.id} onClick={() => decideSolution(report, 'dismiss')} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold hover:bg-stone-200 transition disabled:opacity-50">Descartar</button>
                            <button onClick={() => { setExpandedId(null); setMessage(''); }} className="px-3 py-1.5 rounded-full text-xs font-medium text-stone-400 hover:text-stone-600 transition">Cancelar</button>
                          </div>
                        </>
                      ) : (
                        <button onClick={() => { setExpandedId(report.id); setMessage(''); setFeedback(null); }} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold hover:bg-stone-200 transition">
                          Decidir →
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )
        ) : communityItems.length === 0 ? (
          <p className="text-sm text-stone-400 py-10 text-center">Sin reportes en este filtro.</p>
        ) : (
          <div className="space-y-3">
            {communityItems.map(report => (
              <article key={report.id} className="rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      {report.subjectType === 'list' ? `Lista: ${report.listName}` : `Comentario en: ${report.listName}`}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      {report.subjectType === 'list'
                        ? `Curador: ${report.curatorName || '—'} · Dueño: ${report.ownerEmail}`
                        : `Autor: ${report.commentAuthorEmail ?? '—'}`}
                      {' · '}{COMMUNITY_REASON_LABELS[report.reason] ?? report.reason}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(report.createdAt)}</span>
                </div>
                {report.subjectType === 'comment' && report.commentBody && (
                  <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-500 whitespace-pre-wrap">{report.commentBody}</p>
                )}
                <p className="mt-3 text-sm text-stone-600 whitespace-pre-wrap">{report.details}</p>

                {report.status !== 'open' && (
                  <p className="mt-3 text-xs text-stone-400">
                    {report.status === 'dismissed' ? 'Descartado' : 'Resuelto'} por {report.reviewerEmail ?? '—'}
                    {report.decision ? `: “${report.decision}”` : ''}
                  </p>
                )}

                {report.status === 'open' && (
                  <div className="mt-4 space-y-2">
                    {expandedId === report.id ? (
                      <>
                        <textarea
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          rows={2}
                          placeholder="Explica la decisión…"
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15"
                        />
                        {feedback?.id === report.id && (
                          <p className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{feedback.text}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button disabled={submitting === report.id} onClick={() => decideCommunity(report, 'resolve')} className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition disabled:opacity-50">Resolver</button>
                          <button disabled={submitting === report.id} onClick={() => decideCommunity(report, 'takedown')} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50">
                            {report.subjectType === 'list' ? 'Poner lista en privado' : 'Eliminar comentario'}
                          </button>
                          <button disabled={submitting === report.id} onClick={() => decideCommunity(report, 'dismiss')} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold hover:bg-stone-200 transition disabled:opacity-50">Descartar</button>
                          <button onClick={() => { setExpandedId(null); setMessage(''); }} className="px-3 py-1.5 rounded-full text-xs font-medium text-stone-400 hover:text-stone-600 transition">Cancelar</button>
                        </div>
                      </>
                    ) : (
                      <button onClick={() => { setExpandedId(report.id); setMessage(''); setFeedback(null); }} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold hover:bg-stone-200 transition">
                        Decidir →
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
