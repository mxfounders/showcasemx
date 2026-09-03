"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImageDown, RefreshCw } from 'lucide-react';

/**
 * The cover a ficha gets for free from its own website's og:image.
 *
 * Looks it up by itself the first time, so a founder only has to type the site
 * URL. Afterwards it is a manual refresh: re-reading someone else's server on
 * every page view would be rude and slow. A failure is shown as the reason the
 * site gave rather than an empty box, because the fix is usually on their side.
 */
export function SiteImageCard({ solutionId, website, hasImage, failure }: { solutionId: string; website: string; hasImage: boolean; failure?: string | null }) {
  const router = useRouter();
  const busy = useRef(false);
  const attempted = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(failure ?? '');
  const [version, setVersion] = useState(0);

  async function look() {
    if (busy.current) return;
    busy.current = true; setPending(true); setMessage('');
    try {
      const response = await fetch(`/api/solutions/${solutionId}/site-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos leer la portada.');
      if (result.ok) { setVersion(value => value + 1); router.refresh(); }
      else setMessage(result.failure);
    } catch (error) {
      setMessage(error instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(error.name) ? error.message : 'No pudimos leer la portada del sitio. Intenta de nuevo.');
    } finally { busy.current = false; setPending(false); }
  }

  // One automatic attempt when there is a site but no cover and nothing failed yet.
  useEffect(() => {
    if (attempted.current || hasImage || failure || !website) return;
    attempted.current = true;
    look();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage, failure, website]);

  if (!website) return null;

  return <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-medium text-stone-900"><ImageDown aria-hidden="true" className="size-4 text-stone-400" />Portada desde tu sitio</h3>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">Tomamos la imagen <code className="rounded bg-stone-100 px-1 py-0.5">og:image</code> que ya publica tu sitio y guardamos una copia. Se usa mientras no subas capturas propias.</p>
      </div>
      <button type="button" onClick={look} disabled={pending} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60">
        <RefreshCw aria-hidden="true" className={`size-3.5 ${pending ? 'animate-spin motion-reduce:animate-none' : ''}`} />{pending ? 'Buscando…' : hasImage ? 'Actualizar' : 'Buscar portada'}
      </button>
    </div>
    {hasImage && <div className="relative mt-4 aspect-[1200/630] w-full max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
      <Image key={version} src={`/api/solutions/${solutionId}/site-image?v=${version}`} alt="Portada tomada de tu sitio" fill unoptimized sizes="384px" className="object-cover" />
    </div>}
    {message && <p role="status" className="mt-4 text-xs leading-relaxed text-[#A94E35]">{message}</p>}
    {pending && !hasImage && <p role="status" className="mt-4 text-xs text-stone-500">Leyendo {website}…</p>}
  </div>;
}
