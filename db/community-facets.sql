-- Indexes for the community filters added to getPublicCollections
-- (src/lib/library/community.ts): multi-select categories, industry/size
-- facets of the projects a list contains, and a search that also matches
-- those projects' names. Additive; safe to run before community-search-trgm.sql.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Multi-select categories: l.categories && ARRAY[...]. buyer_lists had no
-- index on categories; the old mono-select (=ANY) could not use one either.
CREATE INDEX IF NOT EXISTS buyer_lists_public_categories
  ON buyer_lists USING gin (categories) WHERE visibility='public';

-- The list->project join compares a built string ('solution:'||id::text), so
-- no plain index on founder_solutions can serve it. These reproduce
-- project_key exactly as the query builds it. getPublicCollections and
-- resolveProjects have been scanning founder_solutions whole since §19.
CREATE INDEX IF NOT EXISTS founder_solutions_solution_project_key
  ON founder_solutions (('solution:'||id::text)) WHERE published_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS founder_solutions_catalog_project_key
  ON founder_solutions (('catalog:'||catalog_key))
  WHERE published_data IS NOT NULL AND catalog_key IS NOT NULL;

-- Search over the name of the projects inside a list — the fix for "a list
-- containing Cord doesn't show up for q=cord". The other search branch
-- (buyer_lists_public_search_trgm, community-search-trgm.sql) is untouched.
CREATE INDEX IF NOT EXISTS founder_solutions_published_name_trgm
  ON founder_solutions USING gin ((published_data->>'name') gin_trgm_ops)
  WHERE published_data IS NOT NULL;
