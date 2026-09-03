'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface Result { type: 'account' | 'solution'; id: string; label: string; sublabel: string; href: string; }

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    function onOpenEvent() { setOpen(true); }
    document.addEventListener('keydown', onKey);
    window.addEventListener('ops:open-command-palette', onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('ops:open-command-palette', onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIndex(0);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  function go(result: Result) {
    setOpen(false);
    router.push(result.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[activeIndex]) { e.preventDefault(); go(results[activeIndex]); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Buscar" className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200">
          <Search className="size-4 text-stone-400 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar cuentas o postulaciones…"
            className="flex-1 text-sm outline-none placeholder:text-stone-400"
          />
          <kbd className="text-[10px] font-mono bg-stone-100 rounded px-1.5 py-0.5 text-stone-400">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-stone-400">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-400">
              {query.trim().length < 2 ? 'Escribe al menos 2 caracteres.' : 'Sin resultados.'}
            </p>
          ) : results.map((r, i) => (
            <button
              key={`${r.type}:${r.id}`}
              type="button"
              onClick={() => go(r)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition-colors ${i === activeIndex ? 'bg-[#e4ebfc]' : 'hover:bg-stone-50'}`}
            >
              <span className="text-sm font-medium text-stone-900">{r.label}</span>
              <span className="text-xs text-stone-400">{r.type === 'account' ? 'Cuenta' : 'Postulación'} · {r.sublabel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
