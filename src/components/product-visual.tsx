import { ArrowDownLeft, Calendar } from 'lucide-react';

export function ProductVisual({ variant, color }: { variant: number; color: string }) {
  return (
    <div aria-hidden="true" className="relative flex h-36 items-center justify-center overflow-hidden rounded-[16px] sm:h-40" style={{ backgroundColor: color }}>
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#78716c_0.6px,transparent_0.6px)] [background-size:12px_12px]" />
      <div className="relative w-[88%] max-w-64 rounded-xl border border-white/80 bg-white/85 p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.22)] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transform-none">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1"><i className="size-1 rounded-full bg-stone-300" /><i className="size-1 rounded-full bg-stone-300" /><i className="size-1 rounded-full bg-stone-300" /></div>
          <div className="h-1 w-8 rounded-full bg-stone-200" />
        </div>
        {variant === 0 ? (
          <div className="flex h-14 items-end gap-2">
            {[32, 52, 42, 72, 60, 88, 100].map((height, i) => <div key={i} className="flex-1 rounded-t-sm bg-stone-800" style={{ height: `${height}%`, opacity: 0.2 + i * 0.12 }} />)}
          </div>
        ) : variant === 1 ? (
          <div className="flex h-14 items-center justify-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full border border-stone-300"><ArrowDownLeft className="size-5 text-stone-700" /></div>
          </div>
        ) : variant === 2 ? (
          <div className="grid h-14 grid-cols-2 gap-2">
            <div className="rounded bg-stone-200" /><div className="rounded bg-stone-300" />
            <div className="rounded bg-stone-300" /><div className="rounded bg-stone-200" />
          </div>
        ) : (
          <div className="flex h-14 items-center gap-3">
            <Calendar className="size-8 text-stone-300" />
            <div className="flex-1 space-y-1.5"><div className="h-2 w-full rounded-full bg-stone-200" /><div className="h-2 w-3/4 rounded-full bg-stone-200" /><div className="h-2 w-1/2 rounded-full bg-stone-300" /></div>
          </div>
        )}
      </div>
    </div>
  );
}
