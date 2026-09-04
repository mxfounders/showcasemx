// Mirrors the exact layout of CategoryPageLayout (title row, filter bar, card
// grid) so the skeleton never jumps when the real content replaces it. This is
// what actually fixes the "se traba" complaint: without a loading.tsx the App
// Router held the previous page frozen on screen until the server finished
// rendering; this file is what Next shows immediately instead.
export function CategoryPageSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-16" aria-busy="true" aria-label="Cargando soluciones">
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-start md:justify-between md:gap-12 lg:mb-16">
        <div className="h-10 w-72 max-w-full animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none sm:h-11" />
        <div className="h-14 w-full max-w-lg animate-pulse rounded-lg bg-stone-100 motion-reduce:animate-none" />
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map(item => <div key={item} className="h-10 w-32 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />)}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-[24px] border border-stone-200 bg-white p-5">
            <div className="h-36 animate-pulse rounded-[16px] bg-stone-100 motion-reduce:animate-none" />
            <div className="flex items-center gap-3 pt-5">
              <div className="size-8 shrink-0 animate-pulse rounded-[8px] bg-stone-100 motion-reduce:animate-none" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
            </div>
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
            <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
