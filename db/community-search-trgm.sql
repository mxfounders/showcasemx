-- pg_trgm-backed index so the community search box (getPublicCollections,
-- src/lib/library/community.ts) doesn't degrade past a small catalog — the
-- gap flagged in §54/§55. Replaces the unindexed strpos() scan with an
-- ILIKE '%term%' pattern the GIN trigram index can actually serve.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS buyer_lists_public_search_trgm ON buyer_lists
  USING gin ((name||' '||public_description||' '||curator_name) gin_trgm_ops)
  WHERE visibility='public';
