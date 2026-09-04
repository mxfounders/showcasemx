// Generic fallback for marketing pages that don't have their own loading.tsx
// (blog, criterios, faq, …). Category/collection/ficha routes use a more
// specific skeleton that mirrors their exact layout instead.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20" aria-busy="true" aria-label="Cargando">
      <div className="h-10 w-2/3 max-w-md animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
