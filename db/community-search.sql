-- getPublicCollections' "Recientes" sort (src/lib/library/community.ts) orders
-- by l.created_at DESC for public lists, but the only partial index on public
-- lists (buyer_lists_public, db/public-collections.sql) covers updated_at —
-- so that ORDER BY never used an index. §23 fixes "Recientes" as creation
-- date, not last edit, so this adds the matching index instead of changing
-- the query's semantics.
CREATE INDEX IF NOT EXISTS buyer_lists_public_created ON buyer_lists(created_at DESC,id) WHERE visibility='public';
