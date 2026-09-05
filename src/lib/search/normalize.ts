// Shared text normalizer for every search/filter surface (catalog search,
// community listings, saved library). Strips accents, lowercases, and
// collapses anything that isn't a letter or digit into a single space, so
// tokenizing a query and building a document's searchable text compare like
// with like. Replaces the two normalizers that used to disagree quietly:
// catalog-search.ts's normalizeQuery (this one) and library/filters.ts's
// normalizeLibrarySearch (which kept punctuation and used toLocaleLowerCase).
//
// \p{Diacritic} (Unicode property escape, needs the `u` flag) matches any
// combining mark NFD decomposition produces — the same effect as a literal
// ̀-ͯ range, without spelling out non-printable code points in the
// source.
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function tokenize(value: string): string[] {
  const text = normalizeText(value);
  return text ? text.split(' ') : [];
}
