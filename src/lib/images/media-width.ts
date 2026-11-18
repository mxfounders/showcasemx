/**
 * The `?w=` a screenshot URL may carry, as the media route reads it. 400 and 800 have
 * their own rendition (solution_media_files); 1600, the loader's widest step, is the full
 * image, as is no `?w` at all (null). Anything else is NaN, which the route answers with
 * a uniform 404.
 */
export function mediaWidth(raw: string | null): number | null {
  if (raw === null || raw === '1600') return null;
  return raw === '400' || raw === '800' ? Number(raw) : NaN;
}
