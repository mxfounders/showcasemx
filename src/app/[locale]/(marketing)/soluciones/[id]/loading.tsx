// Mirrors SolutionPresentation's header + two-column layout so the skeleton
// doesn't jump when the real ficha replaces it.
export default function Loading() {
  return (
    <article className="mx-auto max-w-6xl px-6 py-12 sm:py-20" aria-busy="true" aria-label="Cargando ficha">
      <div className="mb-6 h-4 w-40 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
      <header className="border-b border-stone-200 pb-10">
        <div className="flex gap-2">
          <div className="h-7 w-24 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
          <div className="h-7 w-20 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
        </div>
        <div className="mt-5 h-12 w-2/3 animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none" />
        <div className="mt-5 h-5 w-full max-w-2xl animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
        <div className="mt-2 h-5 w-1/2 max-w-xl animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
      </header>
      <div className="mt-10 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-10">
          <div className="aspect-video w-full animate-pulse rounded-2xl bg-stone-100 motion-reduce:animate-none" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-stone-100 motion-reduce:animate-none" />
          <div className="h-12 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
        </div>
      </div>
    </article>
  );
}
