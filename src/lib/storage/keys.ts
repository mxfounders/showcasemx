// Deterministic blob key derivation. Rules that the GC in db/media-storage.sql
// depends on:
//   - a key belongs to at most one live row (the unique partial indexes on
//     storage_key / avatar_key enforce it);
//   - a key is never reused and never derived from content — two rows sharing a
//     blob would let one owner's delete break another's published ficha, and key
//     existence would become a cross-tenant oracle;
//   - the site cover and the avatar mint a fresh id per (re-)write, so when the
//     row's storage_key changes the AFTER UPDATE trigger orphans the previous key
//     unambiguously. A screenshot's assetId is already fresh per upload.
//
// Phase A stores one blob per image. The width segment is reserved for Phase B
// renditions (/media/{assetId}/{w}.webp) and is intentionally not here yet.

export function mediaKey(solutionId: string, assetId: string): string {
  return `solutions/${solutionId}/media/${assetId}.webp`;
}

// Fase B: responsive renditions of a screenshot. The full 1600 image stays at
// mediaKey(); only 400 and 800 get their own blob + solution_media_files row.
export const RENDITION_WIDTHS = [400, 800] as const;

export function renditionKey(solutionId: string, assetId: string, width: number): string {
  return `solutions/${solutionId}/media/${assetId}-${width}.webp`;
}

export function siteImageKey(solutionId: string, fetchId: string): string {
  return `solutions/${solutionId}/site/${fetchId}.webp`;
}

export function avatarKey(accountId: string, uploadId: string): string {
  return `accounts/${accountId}/avatar/${uploadId}.webp`;
}
