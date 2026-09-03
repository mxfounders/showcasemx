"use client";
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, TriangleAlert } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';

const field = 'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-stone-400 hover:border-stone-400 focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
const CONFIRMATION = 'ELIMINAR';

export function ExportData() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <div className="space-y-4">
    <p className="text-sm leading-relaxed text-stone-500">Descarga un archivo JSON con tu perfil, tus publicaciones, tu biblioteca, tus listas y tus conversaciones de contacto. No incluye tu contraseña ni datos privados de otras personas.</p>
    {error && <p role="alert" className="text-sm text-[#A94E35]">{error}</p>}
    <button type="button" disabled={pending} onClick={async () => {
      setPending(true); setError('');
      try {
        // Fetched rather than linked so a failure surfaces as a message instead of
        // navigating the person to a raw error page.
        const response = await fetch('/api/account/export', { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error || 'No pudimos preparar tu copia.');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `shwcs-datos-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        URL.revokeObjectURL(url);
      } catch (failure) {
        setError(failure instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name) ? failure.message : 'No pudimos preparar tu copia. Intenta de nuevo.');
      } finally { setPending(false); }
    }} style={actionButtonStyle} className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"><Download aria-hidden="true" className="size-4" />{pending ? 'Preparando…' : 'Descargar mis datos'}</button>
  </div>;
}

/**
 * Deletion is irreversible and reaches other people: every publication, list and
 * contact conversation of this account goes with it, including the copy the other
 * participant keeps. The consequences are spelled out before the form appears.
 */
export function DeleteAccount({ publications, conversations }: { publications: number; conversations: number }) {
  const router = useRouter();
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const consequences = [
    publications > 0 && `Se retirarán del catálogo ${publications === 1 ? 'tu publicación' : `tus ${publications} publicaciones`}, incluida su ficha pública.`,
    conversations > 0 && `Se borrarán ${conversations === 1 ? 'la conversación de contacto' : `las ${conversations} conversaciones de contacto`} en las que participas, también para la otra persona.`,
    'Se borrarán tus guardados, listas y notas privadas.',
    'No hay periodo de recuperación: no podremos restaurar nada después.',
  ].filter(Boolean) as string[];

  if (!open) return <div className="space-y-4">
    <p className="text-sm leading-relaxed text-red-800/80">Elimina tu cuenta y todo lo asociado a ella de forma permanente.</p>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-50"><TriangleAlert aria-hidden="true" className="size-4" />Eliminar mi cuenta</button>
  </div>;

  return <form className="space-y-5" onSubmit={event => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setPending(true); setError('');
    (async () => {
      try {
        const response = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, confirm }), signal: AbortSignal.timeout(30000) });
        const result = await response.json();
        if (!response.ok || result.ok !== true) throw new Error(result.error || 'No pudimos eliminar la cuenta.');
        router.replace('/'); router.refresh();
      } catch (failure) {
        setError(failure instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name) ? failure.message : 'No pudimos eliminar la cuenta. Intenta de nuevo.');
      } finally { busy.current = false; setPending(false); }
    })();
  }}>
    <div>
      <p className="text-sm font-medium text-red-900">Esto es lo que va a pasar</p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-red-800/90">{consequences.map(item => <li key={item} className="flex gap-2"><span aria-hidden="true">·</span>{item}</li>)}</ul>
    </div>
    <label className="block text-sm font-medium text-stone-700">Contraseña actual
      <input type="password" autoComplete="current-password" required value={password} onChange={event => { setPassword(event.target.value); setError(''); }} className={`mt-2 ${field}`} />
    </label>
    <label className="block text-sm font-medium text-stone-700">Escribe {CONFIRMATION} para confirmar
      <input required value={confirm} onChange={event => { setConfirm(event.target.value); setError(''); }} placeholder={CONFIRMATION} className={`mt-2 ${field}`} />
    </label>
    {error && <p role="alert" className="text-sm text-[#A94E35]">{error}</p>}
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <button type="button" onClick={() => { setOpen(false); setPassword(''); setConfirm(''); setError(''); }} className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">Cancelar</button>
      <button type="submit" disabled={pending || confirm !== CONFIRMATION} className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50">{pending ? 'Eliminando…' : 'Eliminar mi cuenta para siempre'}</button>
    </div>
  </form>;
}
