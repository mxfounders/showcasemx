// Best-effort cache invalidation on the product app after a publish/withdraw
// decided here. Never throws and never blocks the review response on the
// product being reachable: the transaction that changed published_data
// already committed in this same request. Worst case without this call is
// the product's existing revalidateTag('catalog') 300s TTL fallback (Fase 1,
// CLAUDE.md §52) — not a regression, just no improvement this one time.
export async function triggerCatalogRevalidate() {
  const secret = process.env.CATALOG_REVALIDATE_SECRET;
  const origin = process.env.PRODUCT_APP_ORIGIN;
  if (!secret || !origin) return;
  try {
    const response = await fetch(`${origin}/api/internal/catalog-revalidate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error('[ops] catalog revalidate rejected', response.status);
  } catch (err) {
    console.error('[ops] catalog revalidate unreachable; catalog stays on the 300s TTL fallback.', err);
  }
}
