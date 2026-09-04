// Community filters are plain <Link> navigation (real query-string, real SQL
// filtering) and the route has no cache, so without this boundary every click
// on a category/sort/page link froze the previous page until the server
// responded — the same "se traba" symptom as the catalog.
export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-[1500px] px-5 pb-24 pt-16 sm:px-10 sm:pt-24 lg:px-16" aria-busy="true" aria-label="Cargando listas">
      <div className="mb-10 border-b border-stone-200 pb-6">
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map(item => <div key={item} className="h-10 w-24 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />)}
        </div>
      </div>
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-square animate-pulse rounded-2xl bg-stone-100 motion-reduce:animate-none" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </section>
  );
}
