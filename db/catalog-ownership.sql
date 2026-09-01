-- Explicit catalog identity, never derived from user-provided domains or profile names.
ALTER TABLE founder_solutions ADD COLUMN IF NOT EXISTS catalog_key text
 CHECK (catalog_key IN ('cord','flouvia'));
CREATE UNIQUE INDEX IF NOT EXISTS founder_solutions_catalog_key
 ON founder_solutions(catalog_key) WHERE catalog_key IS NOT NULL;
-- No automatic owner assignment. Bind through an explicitly authorized administrative operation.
