'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReasonDialog from '@/components/ReasonDialog';

interface AccountDetail {
  account: {
    id: string; email: string; name: string | null; organization: string | null;
    profile: string | null; role: string | null; createdAt: string; emailVerifiedAt: string | null;
    dashboardMode: string | null; hasAvatar: boolean;
    suspendedAt: string | null; suspendedReason: string | null; suspendedByEmail: string | null;
    googleEmail: string | null; isOps: boolean; productSessions: number; savedCount: number;
  };
  solutions: Array<{ id: string; status: string; version: number; publishedAt: string | null; catalogKey: string | null; updatedAt: string; name: string; category: string; hasPublished: boolean; mediaCount: number; openReports: number }>;
  lists: Array<{ id: string; name: string; visibility: string; updatedAt: string; itemCount: number }>;
  contactsSent: Array<{ id: string; status: string; projectName: string; solutionId: string; createdAt: string; updatedAt: string }>;
  contactsReceived: Array<{ id: string; status: string; projectName: string; solutionId: string; buyerEmail: string; createdAt: string; updatedAt: string }>;
  opsSessions: Array<{ id: string; createdAt: string; lastSeenAt: string; expiresAt: string; ip: string | null; userAgent: string | null }>;
  community: {
    likes: Array<{ id: string; name: string }>;
    savedLists: Array<{ id: string; name: string }>;
    comments: Array<{ id: string; listId: string; listName: string; body: string; createdAt: string }>;
  };
  notifications: Array<{ category: string; title: string; emailState: string; readAt: string | null; createdAt: string }>;
}

const TABS = ['Identidad', 'Sesiones', 'Soluciones', 'Biblioteca', 'Contactos', 'Comunidad', 'Avisos'] as const;
type Tab = typeof TABS[number];

interface Props {
  accountId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function AccountDrawer({ accountId, onClose, onChanged }: Props) {
  const [data, setData] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('Identidad');
  const [dialogAction, setDialogAction] = useState<null | { action: string; title: string; description?: string; destructive?: boolean }>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    if (!accountId) { setData(null); return; }
    setLoading(true);
    setError('');
    fetch(`/api/accounts/${accountId}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); else setError(d.error ?? 'Error al cargar.'); })
      .catch(() => setError('No se pudo conectar.'))
      .finally(() => setLoading(false));
  }, [accountId]);

  useEffect(() => { setTab('Identidad'); setNotice(null); load(); }, [accountId, load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !dialogAction) onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, dialogAction]);

  async function runAction(action: string, reason: string): Promise<string | null> {
    if (!accountId) return 'Sin cuenta seleccionada.';
    try {
      const res = await fetch(`/api/accounts/${accountId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) return json.error ?? 'Error al aplicar la acción.';
      setDialogAction(null);
      setNotice({ type: 'success', text: 'Acción aplicada.' });
      load();
      onChanged();
      return null;
    } catch {
      return 'Error de red.';
    }
  }

  const isOpen = !!accountId;

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={onClose} />}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full max-w-[680px] bg-white z-[60] flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-modal="true" role="dialog" aria-label="Detalle de cuenta"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-stone-200 flex-shrink-0">
          <h2 className="text-base font-bold truncate">{loading ? 'Cargando…' : data?.account.email ?? 'Detalle de cuenta'}</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors flex-shrink-0" aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {data && (
          <div className="flex gap-1 px-6 pt-3 border-b border-stone-200 overflow-x-auto flex-shrink-0">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-t-lg transition-colors ${tab === t ? 'text-[#365dc4] border-b-2 border-[#365dc4]' : 'text-stone-400 hover:text-stone-600'}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <p className="text-center py-16 text-stone-400">Cargando…</p>
          ) : error ? (
            <p className="text-center py-16 text-red-500">{error}</p>
          ) : !data ? null : (
            <>
              {notice && <div className={`px-3 py-2 rounded-lg text-sm ${notice.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{notice.text}</div>}

              {tab === 'Identidad' && <IdentityTab data={data} onAction={setDialogAction} />}
              {tab === 'Sesiones' && <SessionsTab data={data} onAction={setDialogAction} />}
              {tab === 'Soluciones' && <SolutionsTab data={data} />}
              {tab === 'Biblioteca' && <LibraryTab data={data} />}
              {tab === 'Contactos' && <ContactsTab data={data} />}
              {tab === 'Comunidad' && <CommunityTab data={data} />}
              {tab === 'Avisos' && <NotificationsTab data={data} />}
            </>
          )}
        </div>
      </aside>

      <ReasonDialog
        open={!!dialogAction}
        title={dialogAction?.title ?? ''}
        description={dialogAction?.description}
        confirmLabel="Confirmar"
        destructive={dialogAction?.destructive}
        onCancel={() => setDialogAction(null)}
        onConfirm={reason => runAction(dialogAction!.action, reason)}
      />
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

function IdentityTab({ data, onAction }: { data: AccountDetail; onAction: (a: { action: string; title: string; description?: string; destructive?: boolean }) => void }) {
  const a = data.account;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre">{a.name ?? <span className="text-stone-400 italic">—</span>}</Field>
        <Field label="Empresa">{a.organization ?? <span className="text-stone-400 italic">—</span>}</Field>
        <Field label="Perfil">{a.profile ?? <span className="text-stone-400 italic">—</span>}</Field>
        <Field label="Rol">{a.role ?? <span className="text-stone-400 italic">—</span>}</Field>
        <Field label="Registrada">{fmtDate(a.createdAt)}</Field>
        <Field label="Correo verificado">{a.emailVerifiedAt ? fmtDate(a.emailVerifiedAt) : <span className="text-amber-600">No verificado</span>}</Field>
        <Field label="Google vinculado">{a.googleEmail ?? <span className="text-stone-400 italic">No</span>}</Field>
        <Field label="Rol en ops">{a.isOps ? 'Reviewer/admin' : <span className="text-stone-400 italic">No</span>}</Field>
      </div>

      {a.suspendedAt && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">Cuenta suspendida</p>
          <p className="mt-1 text-xs text-red-600">{a.suspendedReason}</p>
          <p className="mt-1 text-[11px] text-red-400">por {a.suspendedByEmail} · {fmtDate(a.suspendedAt)}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
        {!a.emailVerifiedAt && (
          <button onClick={() => onAction({ action: 'verify_email', title: 'Verificar correo manualmente' })} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold hover:bg-stone-200 transition">Verificar correo</button>
        )}
        {a.suspendedAt ? (
          <button onClick={() => onAction({ action: 'reactivate', title: 'Reactivar cuenta', description: 'La cuenta podrá iniciar sesión de nuevo.' })} className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition">Reactivar cuenta</button>
        ) : (
          <button onClick={() => onAction({ action: 'suspend', title: 'Suspender cuenta', description: 'Bloquea el acceso y revoca sus sesiones. No retira publicaciones.', destructive: true })} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition">Suspender</button>
        )}
        <button onClick={() => onAction({ action: 'unpublish_all', title: 'Despublicar todo', description: 'Retira todas sus fichas publicadas y sus listas públicas. No suspende la cuenta.', destructive: true })} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition">Despublicar todo</button>
      </div>
    </div>
  );
}

function SessionsTab({ data, onAction }: { data: AccountDetail; onAction: (a: { action: string; title: string; description?: string; destructive?: boolean }) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">{data.account.productSessions} sesión(es) activa(s) en el producto · {data.opsSessions.length} en ops</p>
        <button onClick={() => onAction({ action: 'revoke_sessions', title: 'Revocar todas las sesiones', description: 'Cierra su acceso al producto y a ops de inmediato.', destructive: true })} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition">Revocar sesiones</button>
      </div>
      {data.opsSessions.length > 0 && (
        <div className="space-y-2">
          {data.opsSessions.map(s => (
            <div key={s.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-xs text-stone-500">
              <p>Último acceso: {fmtDate(s.lastSeenAt)} · IP: {s.ip ?? '—'}</p>
              <p className="truncate mt-0.5">{s.userAgent ?? '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SolutionsTab({ data }: { data: AccountDetail }) {
  if (!data.solutions.length) return <p className="text-sm text-stone-400 py-8 text-center">Sin soluciones.</p>;
  return (
    <div className="space-y-2">
      {data.solutions.map(s => (
        <Link key={s.id} href={`/panel/postulaciones?solution=${s.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 hover:bg-stone-100 transition">
          <div>
            <p className="text-sm font-medium text-stone-800">{s.name}</p>
            <p className="text-xs text-stone-400">{s.status} · v{s.version} · {s.mediaCount} capturas{s.openReports ? ` · ${s.openReports} reportes` : ''}</p>
          </div>
          <span className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(s.updatedAt)}</span>
        </Link>
      ))}
    </div>
  );
}

function LibraryTab({ data }: { data: AccountDetail }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">{data.account.savedCount} guardado(s)</p>
      {data.lists.length === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">Sin listas.</p>
      ) : (
        <div className="space-y-2">
          {data.lists.map(l => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
              <span className="font-medium text-stone-800">{l.name}</span>
              <span className="text-xs text-stone-400">{l.visibility === 'public' ? 'Pública' : 'Privada'} · {l.itemCount} proyectos</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactsTab({ data }: { data: AccountDetail }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">Enviados ({data.contactsSent.length})</p>
        {data.contactsSent.length === 0 ? <p className="text-sm text-stone-400">Ninguno.</p> : (
          <div className="space-y-2">
            {data.contactsSent.map(c => (
              <div key={c.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
                <p className="font-medium text-stone-800">{c.projectName}</p>
                <p className="text-xs text-stone-400">{c.status} · {fmtDate(c.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">Recibidos ({data.contactsReceived.length})</p>
        {data.contactsReceived.length === 0 ? <p className="text-sm text-stone-400">Ninguno.</p> : (
          <div className="space-y-2">
            {data.contactsReceived.map(c => (
              <div key={c.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
                <p className="font-medium text-stone-800">{c.projectName} · {c.buyerEmail}</p>
                <p className="text-xs text-stone-400">{c.status} · {fmtDate(c.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommunityTab({ data }: { data: AccountDetail }) {
  const c = data.community;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">Le gusta ({c.likes.length})</p>
        <p className="text-sm text-stone-600">{c.likes.map(l => l.name).join(', ') || 'Ninguno.'}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">Listas guardadas ({c.savedLists.length})</p>
        <p className="text-sm text-stone-600">{c.savedLists.map(l => l.name).join(', ') || 'Ninguna.'}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">Comentarios ({c.comments.length})</p>
        {c.comments.length === 0 ? <p className="text-sm text-stone-400">Ninguno.</p> : (
          <div className="space-y-2">
            {c.comments.map(cm => (
              <div key={cm.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
                <p className="text-stone-800">{cm.body}</p>
                <p className="mt-1 text-xs text-stone-400">en {cm.listName} · {fmtDate(cm.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationsTab({ data }: { data: AccountDetail }) {
  if (!data.notifications.length) return <p className="text-sm text-stone-400 py-8 text-center">Sin avisos.</p>;
  return (
    <div className="space-y-2">
      {data.notifications.map((n, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
          <div>
            <p className="text-stone-800">{n.title}</p>
            <p className="text-xs text-stone-400">{n.category} · {n.emailState}{n.readAt ? ' · leído' : ''}</p>
          </div>
          <span className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(n.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
