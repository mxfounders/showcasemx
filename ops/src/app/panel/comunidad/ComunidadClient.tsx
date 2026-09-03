'use client';

import { useState, useEffect, useCallback } from 'react';
import ReasonDialog from '@/components/ReasonDialog';

interface ListItem { id: string; name: string; publicDescription: string; curatorName: string; categories: string[]; updatedAt: string; ownerEmail: string; likeCount: number; saveCount: number; commentCount: number; }
interface CommentItem { id: string; listId: string; listName: string; authorName: string; body: string; createdAt: string; }
interface SolutionCommentItem { id: string; solutionId: string; solutionName: string; authorName: string; body: string; createdAt: string; }

type Dialog = { action: 'unpublish_list' | 'delete_comment' | 'delete_solution_comment'; id: string; title: string };

export default function ComunidadClient() {
  const [lists, setLists] = useState<ListItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [solutionComments, setSolutionComments] = useState<SolutionCommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'lists' | 'comments' | 'solutionComments'>('lists');
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/community')
      .then(r => r.json())
      .then(d => { if (d.ok) { setLists(d.lists ?? []); setComments(d.comments ?? []); setSolutionComments(d.solutionComments ?? []); } else setError(d.error ?? 'Error al cargar.'); })
      .catch(() => setError('No se pudo conectar.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runAction(reason: string): Promise<string | null> {
    if (!dialog) return 'Sin acción seleccionada.';
    const body = dialog.action === 'unpublish_list' ? { action: dialog.action, listId: dialog.id, reason } : { action: dialog.action, commentId: dialog.id, reason };
    try {
      const res = await fetch('/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Comunidad</h1>
      </header>
      <div className="p-8 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTab('lists')} className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${tab === 'lists' ? 'bg-[#e4ebfc] border-[#e4ebfc] text-[#365dc4] font-semibold' : 'bg-white border-stone-200 text-stone-500'}`}>Listas públicas ({lists.length})</button>
          <button onClick={() => setTab('comments')} className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${tab === 'comments' ? 'bg-[#e4ebfc] border-[#e4ebfc] text-[#365dc4] font-semibold' : 'bg-white border-stone-200 text-stone-500'}`}>Comentarios de listas ({comments.length})</button>
          <button onClick={() => setTab('solutionComments')} className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${tab === 'solutionComments' ? 'bg-[#e4ebfc] border-[#e4ebfc] text-[#365dc4] font-semibold' : 'bg-white border-stone-200 text-stone-500'}`}>Comentarios de fichas ({solutionComments.length})</button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {loading ? (
          <p className="text-sm text-stone-400 py-10 text-center">Cargando…</p>
        ) : tab === 'lists' ? (
          lists.length === 0 ? <p className="text-sm text-stone-400 py-10 text-center">Sin listas públicas.</p> : (
            <div className="space-y-2">
              {lists.map(l => (
                <div key={l.id} className="rounded-xl border border-stone-200 bg-white p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{l.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{l.curatorName} · {l.ownerEmail} · {l.categories.join(', ')}</p>
                    <p className="text-xs text-stone-500 mt-1">{l.publicDescription}</p>
                    <p className="text-[11px] text-stone-400 mt-1">{l.likeCount} likes · {l.saveCount} guardados · {l.commentCount} comentarios</p>
                  </div>
                  <button onClick={() => setDialog({ action: 'unpublish_list', id: l.id, title: `Volver privada: ${l.name}` })} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition whitespace-nowrap">Volver privada</button>
                </div>
              ))}
            </div>
          )
        ) : tab === 'comments' ? (
          comments.length === 0 ? <p className="text-sm text-stone-400 py-10 text-center">Sin comentarios.</p> : (
            <div className="space-y-2">
              {comments.map(c => (
                <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-stone-800">{c.body}</p>
                    <p className="text-xs text-stone-400 mt-1">{c.authorName} en {c.listName} · {fmtDate(c.createdAt)}</p>
                  </div>
                  <button onClick={() => setDialog({ action: 'delete_comment', id: c.id, title: 'Borrar comentario' })} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition whitespace-nowrap">Borrar</button>
                </div>
              ))}
            </div>
          )
        ) : (
          solutionComments.length === 0 ? <p className="text-sm text-stone-400 py-10 text-center">Sin comentarios en fichas.</p> : (
            <div className="space-y-2">
              {solutionComments.map(c => (
                <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-stone-800">{c.body}</p>
                    <p className="text-xs text-stone-400 mt-1">{c.authorName} en {c.solutionName} · {fmtDate(c.createdAt)}</p>
                  </div>
                  <button onClick={() => setDialog({ action: 'delete_solution_comment', id: c.id, title: 'Borrar comentario de ficha' })} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition whitespace-nowrap">Borrar</button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <ReasonDialog open={!!dialog} title={dialog?.title ?? ''} confirmLabel="Confirmar" destructive onCancel={() => setDialog(null)} onConfirm={runAction} />
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
