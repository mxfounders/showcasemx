"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

/**
 * Just the like toggle, split out of SolutionSocial so it can live in the
 * sidebar next to "Guardar proyecto" instead of only appearing down by the
 * comments. Same endpoint and same state shape either way — the comments
 * section below still owns its own comment count and list.
 */
export function LikeButton({ id, initialLikes, liked, own = false }: { id: string; initialLikes: number; liked: boolean; own?: boolean }) {
  const [like, setLike] = useState(liked);
  const [likes, setLikes] = useState(initialLikes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [login, setLogin] = useState(false);
  const lock = useRef(false);

  async function toggle() {
    if (lock.current || own) return;
    lock.current = true; setPending(true); setError(''); setLogin(false);
    try {
      const response = await fetch('/api/solutions/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'like', solutionId: id }) });
      const body = await response.json();
      if (response.status === 401) { setLogin(true); return; }
      if (!response.ok) throw new Error(body.error);
      setLike(body.active); setLikes(body.count);
    } catch (error) {
      setError(error instanceof Error && !['TypeError', 'TimeoutError', 'SyntaxError'].includes(error.name) ? error.message : 'No pudimos guardar el cambio.');
    } finally { lock.current = false; setPending(false); }
  }

  return <div>
    <button type="button" aria-pressed={like} disabled={pending || own} title={own ? 'Es tu ficha' : undefined} onClick={() => void toggle()} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 px-5 py-3 text-sm font-medium transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60" style={like ? { backgroundColor: '#F6E5DD', color: '#A94E35', borderColor: '#F6E5DD' } : undefined}>
      <Heart className="size-4" aria-hidden="true" fill={like ? 'currentColor' : 'none'} />{likes} me gusta
    </button>
    {login && <p className="mt-3 text-xs leading-relaxed text-stone-500"><Link href={`/sign-in?next=${encodeURIComponent('/soluciones/' + id)}`} className="font-medium text-[#365DC4] underline underline-offset-4">Inicia sesión o crea una cuenta</Link> para darle like.</p>}
    {error && <p role="alert" className="mt-3 text-xs text-[#A94E35]">{error}</p>}
  </div>;
}
